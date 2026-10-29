import { describe, expect, it } from "vitest";
import { hashPassphrase, signSession, verifyPassphrase, verifySession } from "./auth";
import { decideLogin, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, recordFailure, type LoginAttempts } from "./rate-limit";

const SECRET = "s".repeat(43);

describe("passphrase", () => {
  it("verifies the right passphrase against its stored hash", async () => {
    const stored = await hashPassphrase("correct horse", undefined, 10_000);
    expect(stored).toMatch(/^pbkdf2-sha256\$10000\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassphrase("correct horse", stored)).toBe(true);
  });

  it("refuses a wrong passphrase", async () => {
    const stored = await hashPassphrase("correct horse", undefined, 10_000);
    expect(await verifyPassphrase("Correct horse", stored)).toBe(false);
  });

  it.each([
    ["no secret configured", undefined],
    ["an empty secret", ""],
    ["the plaintext passphrase stored by mistake", "correct horse"],
    ["an unknown algorithm", "md5$1$abc$def"],
    ["too few iterations", "pbkdf2-sha256$10$AAAA$AAAA"],
    ["garbage base64", "pbkdf2-sha256$10000$!!$!!"],
  ])("fails closed with %s", async (_label, stored) => {
    expect(await verifyPassphrase("correct horse", stored)).toBe(false);
  });
});

describe("host session token", () => {
  const now = 1_000_000;

  it("accepts its own unexpired token", async () => {
    expect(await verifySession(SECRET, await signSession(SECRET, now + 1000), now)).toBe(true);
  });

  it("refuses an expired token", async () => {
    expect(await verifySession(SECRET, await signSession(SECRET, now - 1), now)).toBe(false);
  });

  it("refuses a token with a forged expiry", async () => {
    const token = await signSession(SECRET, now + 1000);
    const [, , signature] = token.split(".");
    expect(await verifySession(SECRET, `host.${now + 10_000_000}.${signature}`, now)).toBe(false);
  });

  it("refuses a token signed with another secret", async () => {
    expect(await verifySession(SECRET, await signSession("x".repeat(43), now + 1000), now)).toBe(false);
  });

  it.each([
    ["a missing secret", undefined, "host.1.x"],
    ["a short secret", "short", "host.1.x"],
    ["a missing token", SECRET, null],
    ["a malformed token", SECRET, "not-a-token"],
  ])("fails closed with %s", async (_label, secret, token) => {
    expect(await verifySession(secret, token, now)).toBe(false);
  });
});

describe("login rate limit", () => {
  const failuresAt = (...times: number[]): LoginAttempts => ({ failures: times });

  it(`allows up to ${LOGIN_MAX_FAILURES - 1} recent failures`, () => {
    expect(decideLogin(failuresAt(1, 2, 3, 4), 10)).toEqual({ allowed: true });
  });

  it(`blocks after ${LOGIN_MAX_FAILURES} failures inside the window, saying when to retry`, () => {
    const attempts = [0, 1, 2, 3, 4].reduce<LoginAttempts>((a, t) => recordFailure(a, t * 1000), { failures: [] });
    expect(decideLogin(attempts, 5000)).toEqual({ allowed: false, retryAfterSec: (LOGIN_WINDOW_MS - 5000) / 1000 });
  });

  it("forgets failures older than the window", () => {
    expect(decideLogin(failuresAt(0, 1, 2, 3, 4), LOGIN_WINDOW_MS + 10)).toEqual({ allowed: true });
    expect(recordFailure(failuresAt(0, 1), LOGIN_WINDOW_MS + 5).failures).toEqual([LOGIN_WINDOW_MS + 5]);
  });
});
