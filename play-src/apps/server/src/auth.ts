// Teacher authentication. Pure WebCrypto, so it runs the same in the Worker and in Node tests.
//
// - The passphrase itself is never stored: HOST_PASSPHRASE_HASH holds a salted PBKDF2 hash.
// - A correct passphrase buys a short-lived session token signed with SESSION_SECRET.
// - Every failure path refuses (fail closed): a missing or malformed secret means no login.

const encoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 100_000; // the Workers runtime maximum for PBKDF2
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export async function hashPassphrase(
  passphrase: string,
  salt: Uint8Array = crypto.getRandomValues(new Uint8Array(16)),
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const derived = await pbkdf2(passphrase, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

export async function verifyPassphrase(passphrase: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > PBKDF2_ITERATIONS) return false;
  const salt = fromBase64Url(parts[2]!);
  const expected = fromBase64Url(parts[3]!);
  if (!salt || !expected || expected.length !== 32) return false;
  const actual = await pbkdf2(passphrase, salt, iterations);
  return constantTimeEqual(actual, expected);
}

export async function signSession(secret: string, expiresAt: number): Promise<string> {
  const payload = `host.${expiresAt}`;
  return `${payload}.${toBase64Url(await hmac(secret, payload))}`;
}

export async function verifySession(secret: string | undefined, token: string | null, now: number): Promise<boolean> {
  if (!secret || secret.length < 32 || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "host") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const signature = fromBase64Url(parts[2]!);
  if (!signature) return false;
  return constantTimeEqual(await hmac(secret, `host.${expiresAt}`), signature);
}

/** SHA-256 for comparing a presented host key against the stored hash. */
export async function sha256(text: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))));
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function constantTimeEqualText(a: string, b: string): boolean {
  return constantTimeEqual(encoder.encode(a), encoder.encode(b));
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function pbkdf2(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}
