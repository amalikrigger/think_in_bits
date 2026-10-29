// The decisions the game socket makes, kept pure so they are unit tested without a browser.
// `useGameSocket` is the thin layer that wires these to a real WebSocket.

/** Close codes after which retrying is pointless (see apps/server/src/game-room.ts). */
export const FINAL_CLOSE_CODES: Record<number, string> = {
  4000: "This game has expired.",
  4001: "The game didn't accept this host key.",
  4003: "You were removed from this game.",
};

/** What the student or teacher sees when the game is gone from the server. */
export const GAME_GONE_REASON = "This game has ended or expired.";

export const finalCloseReason = (code: number): string | null => FINAL_CLOSE_CODES[code] ?? null;

// WebSocket.readyState values, spelled out so this module needs no DOM.
export const READY = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 } as const;

/**
 * Back off gently: 0.5 s, 1 s, 2 s, 4 s, then 5 s, with ±25% jitter so a whole class
 * reconnecting after a Wi-Fi blip doesn't arrive at the server in one burst.
 */
export function reconnectDelay(attempt: number, random: number = Math.random()): number {
  const base = Math.min(5000, 500 * 2 ** Math.max(0, Math.min(attempt, 10)));
  return Math.round(base * (0.75 + random * 0.5));
}

/** A connection that stays CONNECTING this long is hung (captive portal, dead Wi-Fi): drop it and retry. */
export const CONNECT_TIMEOUT_MS = 8000;

/**
 * A socket that keeps failing before it ever opens is probably pointing at a game that no
 * longer exists (expired, or the dev server restarted). Every second failure, ask the HTTP
 * endpoint whether the game is still there instead of reconnecting forever.
 */
export const shouldProbeGame = (failuresWithoutOpen: number): boolean => failuresWithoutOpen >= 2 && failuresWithoutOpen % 2 === 0;

/**
 * A laptop that slept or a phone that was locked keeps a dead TCP connection that still
 * reports OPEN. After this long away, reconnect rather than trust it; the server resumes
 * the same seat, so the only cost is one round trip.
 */
export const STALE_AFTER_HIDDEN_MS = 20_000;

export function shouldReconnectOnWake(awayMs: number, readyState: number | null): boolean {
  if (readyState === null || readyState > READY.OPEN) return true;
  if (readyState === READY.CONNECTING) return false; // already on its way
  return awayMs >= STALE_AFTER_HIDDEN_MS;
}

/**
 * Some laptops sleep without firing visibilitychange. A heartbeat interval that fires far
 * later than scheduled is the tell: the machine was suspended in between.
 */
export const HEARTBEAT_MS = 5000;
export const SUSPEND_GAP_MS = 15_000;
export const looksLikeSuspend = (sinceLastTickMs: number): boolean => sinceLastTickMs >= SUSPEND_GAP_MS;
