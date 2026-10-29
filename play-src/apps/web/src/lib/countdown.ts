// The question clock, as pure arithmetic. The server is the authority on time; the client
// only turns "ms remaining" into a smooth local countdown.

export type TimerSnapshot = { msRemaining: number; totalMs: number };

/**
 * Every server view carries a fresh "ms remaining", and each message arrives after a
 * different network delay. Re-deriving the deadline from every message would make the ring
 * jitter and the seconds flip back (7 → 8 → 7). Keep the current deadline unless the server
 * disagrees by more than the tolerance, which is what happens on pause, resume, skip and a
 * reconnect, when the clock really did move.
 */
export const RESYNC_TOLERANCE_MS = 300;

export function resyncDeadline(current: number | null, now: number, msRemaining: number, tolerance: number = RESYNC_TOLERANCE_MS): number {
  const fresh = now + msRemaining;
  if (current === null || Math.abs(fresh - current) > tolerance) return fresh;
  return current;
}

/** Whole seconds shown on the ring: 0.2 s left still reads "1", never "0" while time remains. */
export const secondsLeft = (msRemaining: number): number => Math.max(0, Math.ceil(msRemaining / 1000));

/** Fraction of the ring still lit. Guarded so a zero-length timer can't divide by zero. */
export const remainingFraction = (msRemaining: number, totalMs: number): number =>
  totalMs > 0 ? Math.min(1, Math.max(0, msRemaining / totalMs)) : 0;

/** The last five seconds turn coral: a steady colour change, never a flash (accessibility rule). */
export const isUrgent = (msRemaining: number): boolean => secondsLeft(msRemaining) <= 5;
