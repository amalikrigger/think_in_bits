import { describe, expect, it } from "vitest";
import { addressForStep } from "./code-in-url";

const BASE = "http://192.168.1.20:5173/play/";

describe("addressForStep", () => {
  it("adds the code for a student who typed it, so a refresh resumes the seat", () => {
    expect(addressForStep(BASE, "123456", false)).toBe(`${BASE}?c=123456`);
  });

  it("leaves a QR link alone when it already carries the code", () => {
    expect(addressForStep(`${BASE}?c=123456`, "123456", false)).toBeNull();
  });

  it("replaces an old code with the game now open", () => {
    expect(addressForStep(`${BASE}?c=111111`, "222222", false)).toBe(`${BASE}?c=222222`);
  });

  it("removes the code when the student leaves a game", () => {
    expect(addressForStep(`${BASE}?c=123456`, null, true)).toBe(BASE);
  });

  it("keeps a QR code on the first screen, before any game has opened", () => {
    expect(addressForStep(`${BASE}?c=123456`, null, false)).toBeNull();
  });

  it("keeps other query parameters", () => {
    expect(addressForStep(`${BASE}?lang=en`, "123456", false)).toBe(`${BASE}?lang=en&c=123456`);
    expect(addressForStep(`${BASE}?lang=en&c=123456`, null, true)).toBe(`${BASE}?lang=en`);
  });
});
