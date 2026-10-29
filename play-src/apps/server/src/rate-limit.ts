// Login throttling as a pure sliding window, so the rule is testable without a runtime.
// The LoginLimiter Durable Object (one per client IP) only persists this state.

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
