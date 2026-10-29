import { describe, expect, it } from "vitest";
import { commitDraft, stepValue } from "./number-field";

describe("commitDraft", () => {
  it("accepts a value typed digit by digit, clamping only on commit", () => {
    expect(commitDraft("15", 6, 2, 60)).toBe(15);
  });

  it("clamps to the range", () => {
    expect(commitDraft("1", 6, 2, 60)).toBe(2);
    expect(commitDraft("999", 6, 2, 60)).toBe(60);
    expect(commitDraft("-4", 6, 0, 60)).toBe(0);
  });

  it("keeps the old value for blank or nonsense input", () => {
    expect(commitDraft("", 6, 2, 60)).toBe(6);
    expect(commitDraft("   ", 6, 2, 60)).toBe(6);
    expect(commitDraft("abc", 6, 2, 60)).toBe(6);
    expect(commitDraft("1e999", 6, 2, 60)).toBe(6); // Infinity is not a value anyone meant to type
  });

  it("snaps to the step and tolerates a decimal comma", () => {
    expect(commitDraft("1.3", 1, 0, 5, 0.5)).toBe(1.5);
    expect(commitDraft("1,2", 1, 0, 5, 0.5)).toBe(1);
    expect(commitDraft("7.6", 1, 1, 50)).toBe(8);
  });
});

describe("stepValue", () => {
  it("moves one step and stops at the ends", () => {
    expect(stepValue(6, 1, 2, 60)).toBe(7);
    expect(stepValue(60, 1, 2, 60)).toBe(60);
    expect(stepValue(2, -1, 2, 60)).toBe(2);
    expect(stepValue(0.5, 1, 0, 5, 0.5)).toBe(1);
    expect(stepValue(1.5, -1, 0, 5, 0.5)).toBe(1);
    expect(stepValue(0.1 + 0.2, 1, 0, 5, 0.5)).toBe(1); // 0.30000000000000004 + 0.5 snaps cleanly
  });
});
