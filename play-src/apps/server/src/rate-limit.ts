// Throttling rules as pure functions, so they are testable without a runtime.
// The LoginLimiter Durable Object (one per client IP) persists the login state; the
// GameRoom keeps a per-connection message budget in memory.

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export type LoginAttempts = { failures: number[] };

export type LoginDecision = { allowed: true } | { allowed: false; retryAfterSec: number };

export function decideLogin(attempts: LoginAttempts, now: number): LoginDecision {
  const recent = attempts.failures.filter((t) => now - t < LOGIN_WINDOW_MS);
  if (recent.length < LOGIN_MAX_FAILURES) return { allowed: true };
  const oldest = Math.min(...recent);
  return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000)) };
}

export function recordFailure(attempts: LoginAttempts, now: number): LoginAttempts {
  return { failures: [...attempts.failures.filter((t) => now - t < LOGIN_WINDOW_MS), now] };
}

/**
 * Decides, and if allowed counts the attempt as a failure straight away. Checking first and
 * recording the failure only after the slow passphrase check would let a burst of parallel
 * requests all pass the check with zero failures on record. A success clears the record.
 */
export function reserveLoginAttempt(attempts: LoginAttempts, now: number): { decision: LoginDecision; attempts: LoginAttempts } {
  const decision = decideLogin(attempts, now);
  return { decision, attempts: decision.allowed ? recordFailure(attempts, now) : attempts };
}

// Per-WebSocket message budget: a token bucket. A real client sends a handful of messages
// per question (an answer, a few pongs); anything far beyond that is a bug or a flood, and
// every message costs the room a full engine step and a storage write.
export const SOCKET_BURST = 30;
export const SOCKET_REFILL_PER_SEC = 10;

export type MessageBudget = { tokens: number; at: number };

export function spendMessage(budget: MessageBudget | undefined, now: number): { allowed: boolean; budget: MessageBudget } {
  const previous = budget ?? { tokens: SOCKET_BURST, at: now };
  const refilled = Math.min(SOCKET_BURST, previous.tokens + (Math.max(0, now - previous.at) / 1000) * SOCKET_REFILL_PER_SEC);
  if (refilled < 1) return { allowed: false, budget: { tokens: refilled, at: now } };
  return { allowed: true, budget: { tokens: refilled - 1, at: now } };
}
