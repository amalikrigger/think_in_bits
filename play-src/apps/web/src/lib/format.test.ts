import { describe, expect, it } from "vitest";
import { formatPoints, ordinal, spacedCode } from "./format";
import { hasMath, splitMath } from "./math";
import { TILES, tile } from "./tiles";

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [22, "22nd"], [101, "101st"], [111, "111th"],
  ])("%s → %s", (n, expected) => expect(ordinal(n)).toBe(expected));
});

describe("formatting", () => {
  it("groups points with commas and splits the code for the projector", () => {
    expect(formatPoints(1085)).toBe("1,085");
    expect(spacedCode("482913")).toBe("482 913");
  });
});

describe("splitMath", () => {
  it("separates inline KaTeX from plain text", () => {
    expect(splitMath("Centre of $(x-2)^2$ is?")).toEqual([
      { math: false, text: "Centre of " },
      { math: true, text: "(x-2)^2" },
      { math: false, text: " is?" },
    ]);
  });

  it("leaves a lone dollar sign as text", () => {
    expect(splitMath("costs $5")).toEqual([{ math: false, text: "costs $5" }]);
  });

  it("handles several formulas and math-only text", () => {
    expect(splitMath("$a$ and $b$").filter((s) => s.math).map((s) => s.text)).toEqual(["a", "b"]);
  });

  it("knows when KaTeX is needed at all, so plain quizzes never download it", () => {
    expect(hasMath("Which is a prime?")).toBe(false);
    expect(hasMath("costs $5")).toBe(false);
    expect(hasMath("Solve $x^2=4$")).toBe(true);
  });
});

describe("tiles", () => {
  it("gives all six answer slots a distinct colour and a distinct shape", () => {
    expect(new Set(TILES.map((t) => t.shape)).size).toBe(6);
    expect(new Set(TILES.map((t) => t.color)).size).toBe(6);
    expect(tile(0).shapeName).toBe("triangle");
  });
});
