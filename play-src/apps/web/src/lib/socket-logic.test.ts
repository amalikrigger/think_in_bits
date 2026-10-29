import { describe, expect, it } from "vitest";
import {
  CONNECT_TIMEOUT_MS,
  finalCloseReason,
  looksLikeSuspend,
  READY,
  reconnectDelay,
  shouldProbeGame,
  shouldReconnectOnWake,
  STALE_AFTER_HIDDEN_MS,
} from "./socket-logic";

describe("reconnectDelay", () => {
  it("doubles from 0.5 s and caps at 5 s", () => {
    // random = 0.5 gives the jitter midpoint, i.e. the base delay.
    expect([0, 1, 2, 3, 4, 5, 20].map((a) => reconnectDelay(a, 0.5))).toEqual([500, 1000, 2000, 4000, 5000, 5000, 5000]);
  });

  it("jitters by ±25% so a class doesn't reconnect in one burst", () => {
    expect(reconnectDelay(1, 0)).toBe(750);
    expect(reconnectDelay(1, 1)).toBe(1250);
    expect(reconnectDelay(10, 0)).toBe(3750);
  });

  it("never waits longer than a connect attempt is allowed to hang", () => {
    expect(reconnectDelay(10, 1)).toBeLessThan(CONNECT_TIMEOUT_MS);
  });

  it("treats a negative attempt as the first", () => {
    expect(reconnectDelay(-3, 0.5)).toBe(500);
  });
});

describe("finalCloseReason", () => {
  it("stops on expiry, bad host key and kick, and retries on everything else", () => {
    expect(finalCloseReason(4000)).toMatch(/expired/);
    expect(finalCloseReason(4001)).toMatch(/host key/);
    expect(finalCloseReason(4003)).toMatch(/removed/);
    for (const code of [1000, 1001, 1005, 1006, 1011, 1012, 4002, 4004]) expect(finalCloseReason(code)).toBeNull();
  });
});

describe("shouldProbeGame", () => {
  it("asks the HTTP endpoint every second failed connect, never on the first", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(shouldProbeGame)).toEqual([false, false, true, false, true, false, true]);
  });
});

describe("shouldReconnectOnWake", () => {
  it("reconnects when there is no socket or it is closing/closed", () => {
    expect(shouldReconnectOnWake(0, null)).toBe(true);
    expect(shouldReconnectOnWake(0, READY.CLOSING)).toBe(true);
    expect(shouldReconnectOnWake(0, READY.CLOSED)).toBe(true);
  });

  it("leaves a socket that is already connecting alone", () => {
    expect(shouldReconnectOnWake(60_000, READY.CONNECTING)).toBe(false);
  });

  it("trusts an open socket after a short tab switch but not after a long sleep", () => {
    expect(shouldReconnectOnWake(STALE_AFTER_HIDDEN_MS - 1, READY.OPEN)).toBe(false);
    expect(shouldReconnectOnWake(STALE_AFTER_HIDDEN_MS, READY.OPEN)).toBe(true);
  });
});

describe("looksLikeSuspend", () => {
  it("ignores normal timer slop and catches a sleeping laptop", () => {
    expect(looksLikeSuspend(5_000)).toBe(false);
    expect(looksLikeSuspend(9_000)).toBe(false);
    expect(looksLikeSuspend(15_000)).toBe(true);
    expect(looksLikeSuspend(600_000)).toBe(true);
  });
});
