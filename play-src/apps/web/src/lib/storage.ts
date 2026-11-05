// Small per-device memory. Every access is guarded: private windows and locked-down
// school Chromebooks can throw on storage, and the game must still work without it.

function read<T>(store: () => Storage, key: string): T | null {
  try {
    const raw = store().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(store: () => Storage, key: string, value: unknown): void {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, JSON.stringify(value));
  } catch {
    // Without storage, a refresh just means joining again.
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/** A player's seat in a game, so a refresh or a sleeping laptop resumes instead of rejoining. */
export type PlayerSeat = { token: string; nickname: string };
// The page's own copy is what a reconnect uses, so a Wi-Fi blip resumes the seat even on a
// device that blocks storage; storage only carries the seat across a refresh.
const seatsThisPage = new Map<string, PlayerSeat>();
export const playerSeat = {
  get: (code: string): PlayerSeat | null => seatsThisPage.get(code) ?? read<PlayerSeat>(local, `bitblitz:seat:${code}`),
  set: (code: string, seat: PlayerSeat | null) => {
    if (seat) seatsThisPage.set(code, seat);
    else seatsThisPage.delete(code);
    write(local, `bitblitz:seat:${code}`, seat);
  },
};

export const lastNickname = {
  get: () => read<string>(local, "bitblitz:nickname"),
  set: (nickname: string) => write(local, "bitblitz:nickname", nickname),
};

/** The host's login and current game live only as long as the tab. */
export type HostGame = { code: string; hostKey: string };
export const hostSession = {
  token: () => read<{ token: string; expiresAt: number }>(session, "bitblitz:host-token"),
  setToken: (value: { token: string; expiresAt: number } | null) => write(session, "bitblitz:host-token", value),
  game: () => read<HostGame>(session, "bitblitz:host-game"),
  setGame: (value: HostGame | null) => write(session, "bitblitz:host-game", value),
};
