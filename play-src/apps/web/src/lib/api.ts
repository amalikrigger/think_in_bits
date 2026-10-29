import type { QuizProblem } from "@bitblitz/schema";

// HTTP calls to the game server. In dev, Vite proxies /api to wrangler on :8787, so the
// default base is same-origin. A deployed build sets VITE_API_BASE to the workers.dev URL.
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

export function wsUrl(code: string): string {
  const base = API_BASE || window.location.origin;
  return `${base.replace(/^http/, "ws")}/api/games/${code}/ws`;
}

export type GameInfo =
  | { exists: false }
  | { exists: true; title: string; phase: string; joinable: boolean; locked: boolean; generatedNicknames: boolean };

/**
 * `exists: false` means the server answered and has no such game. A network failure or a
 * server error throws instead, so callers can tell "wrong code" from "no Wi-Fi".
 */
export async function fetchGameInfo(code: string): Promise<GameInfo> {
  const response = await fetch(`${API_BASE}/api/games/${code}`);
  if (response.status === 404) return { exists: false };
  if (!response.ok) throw new Error(`game info unavailable (${response.status})`);
  return (await response.json()) as GameInfo;
}

export type LoginResult = { ok: true; token: string; expiresAt: number } | { ok: false; message: string };

export async function hostLogin(passphrase: string): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_BASE}/api/host/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });
    const body = (await response.json().catch(() => ({}))) as { token?: string; expiresAt?: number; error?: string };
    if (response.ok && body.token) return { ok: true, token: body.token, expiresAt: body.expiresAt ?? 0 };
    if (response.status === 429) {
      const minutes = Math.ceil(Number(response.headers.get("Retry-After") ?? 600) / 60);
      return { ok: false, message: `Too many tries. Wait about ${minutes} minute${minutes === 1 ? "" : "s"}.` };
    }
    return { ok: false, message: body.error ?? `Login failed (${response.status}).` };
  } catch {
    return { ok: false, message: "Can't reach the game server. Is it running?" };
  }
}

export type CreateResult =
  | { ok: true; code: string; hostKey: string }
  | { ok: false; message: string; problems?: QuizProblem[]; loggedOut?: boolean };

export async function createGame(token: string, quiz: unknown): Promise<CreateResult> {
  try {
    const response = await fetch(`${API_BASE}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quiz }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      hostKey?: string;
      error?: string;
      problems?: QuizProblem[];
    };
    if (response.status === 201 && body.code && body.hostKey) return { ok: true, code: body.code, hostKey: body.hostKey };
    return {
      ok: false,
      message: body.error ?? `Couldn't create the game (${response.status}).`,
      problems: body.problems,
      loggedOut: response.status === 401,
    };
  } catch {
    return { ok: false, message: "Can't reach the game server. Is it running?" };
  }
}

/** Never throws: a failed upload is reported, the game still runs with the image's alt text. */
export async function uploadMedia(code: string, hostKey: string, file: File): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/games/${code}/media/${encodeURIComponent(file.name)}`, {
      method: "PUT",
      headers: { "X-Host-Key": hostKey, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function mediaUrl(code: string, src: string): string {
  // Absolute URLs are used as-is; bare file names point at the game's uploaded media.
  if (/^https?:\/\//.test(src)) return src;
  return `${API_BASE}/api/games/${code}/media/${encodeURIComponent(src)}`;
}

export async function downloadResults(code: string, hostKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/games/${code}/results.csv`, { headers: { "X-Host-Key": hostKey } });
  if (!response.ok) throw new Error(`results unavailable (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: `bitblitz-${code}-results.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking synchronously cancels the download in Safari; give the browser a moment to start it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
