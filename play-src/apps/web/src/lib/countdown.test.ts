import { describe, expect, it } from "vitest";
import { isUrgent, remainingFraction, resyncDeadline, RESYNC_TOLERANCE_MS, secondsLeft } from "./countdown";

describe("resyncDeadline", () => {
  it("sets the deadline from the first server view", () => {
    expect(resyncDeadline(null, 1000, 20_000)).toBe(21_000);
  });

  it("ignores the latency jitter between views so seconds never flip back", () => {
    const deadline = resyncDeadline(null, 1000, 20_000);
    // Later views arrive after different network delays: all within tolerance, keep the deadline.
    expect(resyncDeadline(deadline, 3000, 18_000 + 120)).toBe(deadline);
    expect(resyncDeadline(deadline, 5000, 16_000 - 250)).toBe(deadline);
  });

  it("moves the deadline when the server clock really changed (pause, resume, reconnect)", () => {
    const deadline = resyncDeadline(null, 1000, 20_000);
    expect(resyncDeadline(deadline, 11_000, 20_000)).toBe(31_000); // resumed after a 10 s pause
    expect(resyncDeadline(deadline, 2000, 2000)).toBe(4000); // skipped ahead
  });

  it("uses the tolerance as an inclusive boundary", () => {
    const deadline = 21_000;
    expect(resyncDeadline(deadline, 1000, 20_000 + RESYNC_TOLERANCE_MS)).toBe(deadline);
    expect(resyncDeadline(deadline, 1000, 20_000 + RESYNC_TOLERANCE_MS + 1)).toBe(21_301);
  });
});

describe("secondsLeft", () => {
  it("rounds up so the ring never shows 0 while time remains, and clamps at 0", () => {
    expect(secondsLeft(20_000)).toBe(20);
    expect(secondsLeft(200)).toBe(1);
    expect(secondsLeft(0)).toBe(0);
    expect(secondsLeft(-500)).toBe(0);
  });
});

describe("remainingFraction", () => {
  it("is clamped to [0, 1] and safe for a zero-length timer", () => {
    expect(remainingFraction(5000, 20_000)).toBe(0.25);
    expect(remainingFraction(25_000, 20_000)).toBe(1);
    expect(remainingFraction(-1, 20_000)).toBe(0);
    expect(remainingFraction(5, 0)).toBe(0);
  });
});

describe("isUrgent", () => {
  it("turns coral for the last five seconds only", () => {
    expect(isUrgent(5001)).toBe(false);
    expect(isUrgent(5000)).toBe(true);
    expect(isUrgent(100)).toBe(true);
  });
});
