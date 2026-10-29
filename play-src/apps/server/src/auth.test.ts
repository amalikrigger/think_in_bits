import { describe, expect, it } from "vitest";
import { hashPassphrase, signSession, verifyPassphrase, verifySession } from "./auth";
import {
  decideLogin,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  recordFailure,
  reserveLoginAttempt,
  SOCKET_BURST,
  SOCKET_REFILL_PER_SEC,
  spendMessage,
  type LoginAttempts,
  type MessageBudget,
} from "./rate-limit";

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

  it("counts an attempt the moment it is admitted, so a parallel burst cannot slip past the limit", () => {
    // Simulates N requests arriving before any passphrase check has finished.
    let attempts: LoginAttempts = { failures: [] };
    const outcomes: boolean[] = [];
    for (let i = 0; i < LOGIN_MAX_FAILURES + 3; i++) {
      const reserved = reserveLoginAttempt(attempts, 1000);
      attempts = reserved.attempts;
      outcomes.push(reserved.decision.allowed);
    }
    expect(outcomes.filter(Boolean)).toHaveLength(LOGIN_MAX_FAILURES);
    expect(outcomes.slice(LOGIN_MAX_FAILURES).every((allowed) => !allowed)).toBe(true);
  });
});

describe("per-connection message budget", () => {
  const drain = (count: number, now: number, start?: MessageBudget) => {
    let budget = start;
    const allowed: boolean[] = [];
    for (let i = 0; i < count; i++) {
      const spent = spendMessage(budget, now);
      budget = spent.budget;
      allowed.push(spent.allowed);
    }
    return { allowed, budget: budget! };
  };

  it(`allows a burst of ${SOCKET_BURST} and refuses the next one`, () => {
    const { allowed } = drain(SOCKET_BURST + 1, 0);
    expect(allowed.filter(Boolean)).toHaveLength(SOCKET_BURST);
    expect(allowed.at(-1)).toBe(false);
  });

  it(`refills at ${SOCKET_REFILL_PER_SEC} per second, never above the burst`, () => {
    const empty = drain(SOCKET_BURST, 0).budget;
    expect(spendMessage(empty, 50).allowed).toBe(false);
    const afterSecond = drain(SOCKET_REFILL_PER_SEC + 1, 1000, empty).allowed;
    expect(afterSecond.filter(Boolean)).toHaveLength(SOCKET_REFILL_PER_SEC);
    expect(drain(SOCKET_BURST + 1, 60_000, empty).allowed.filter(Boolean)).toHaveLength(SOCKET_BURST);
  });

  it("does not go backwards if the clock does", () => {
    const empty = drain(SOCKET_BURST, 1000).budget;
    expect(spendMessage(empty, 500).budget.tokens).toBeGreaterThanOrEqual(0);
  });
});
