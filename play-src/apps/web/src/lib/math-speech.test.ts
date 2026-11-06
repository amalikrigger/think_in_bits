import { describe, expect, it } from "vitest";
import { speakText } from "./math";

// Answer tiles are buttons, and a button's name is plain text: Chrome leaves KaTeX's MathML
// out of it. speakText turns a quiz string into words a screen reader can say.

describe("speakText", () => {
  it.each([
    ["$6$", "6"],
    ["$-6$", "minus 6"],
    ["$\\frac{1}{2}$", "1 over 2"],
    ["$\\dfrac{3\\pi}{4}$", "3 pi over 4"],
    ["$\\sqrt{105}$", "square root of 105"],
    ["$x^2 + y^2 = 25$", "x squared plus y squared equals 25"],
    ["$r^3$", "r cubed"],
    ["$2^{10}$", "2 to the power 10"],
    ["$x_1$", "x sub 1"],
    ["$72^\\circ$", "72 degrees"],
    ["$\\theta = 1.2$", "theta equals 1.2"],
    ["$9\\pi - 18$ cm²", "9 pi minus 18 cm²"],
    ["$a \\times b \\le c$", "a times b less than or equal to c"],
    ["$\\left(\\frac{1+7}{2}, 2\\right)$", "(1 plus 7 over 2, 2)"],
  ])("%s → %s", (source, spoken) => {
    expect(speakText(source)).toBe(spoken);
  });

  it("keeps plain words and money as they are", () => {
    expect(speakText("Centre $(3, -2)$, radius $5$")).toBe("Centre (3, minus 2), radius 5");
    expect(speakText("A pen costs $3 and a book costs $12.")).toBe("A pen costs $3 and a book costs $12.");
  });
});
