import { describe, expect, it } from "vitest";
import { answerColumns, leaderboardRows, lobbyPillSize, promptScale } from "./stage";

describe("promptScale", () => {
  it("steps type down as prompts get longer, up to the 500-character limit", () => {
    expect(promptScale(40)).toBe(1);
    expect(promptScale(90)).toBe(1);
    expect(promptScale(91)).toBe(0.9);
    expect(promptScale(200)).toBe(0.78);
    expect(promptScale(500)).toBe(0.62);
  });
});

describe("leaderboardRows", () => {
  it("fits the common projector and laptop heights without scrolling", () => {
    expect(leaderboardRows(1080)).toBe(12); // projector: capped
    expect(leaderboardRows(768)).toBe(9); // 1366×768 laptop or Chromebook
    expect(leaderboardRows(720)).toBe(8); // short projector
    expect(leaderboardRows(400)).toBe(5); // never fewer than the top five
  });
});

describe("answerColumns", () => {
  it("stacks on phones, pairs up on wide screens, and always grids shapes-only", () => {
    expect(answerColumns(4, 320, false)).toBe(1);
    expect(answerColumns(6, 360, false)).toBe(1);
    expect(answerColumns(6, 430, false)).toBe(2);
    expect(answerColumns(4, 820, false)).toBe(2);
    expect(answerColumns(4, 320, true)).toBe(2);
  });
});

describe("lobbyPillSize", () => {
  it("shrinks nickname pills as the room fills", () => {
    expect(lobbyPillSize(4)).toBe("lg");
    expect(lobbyPillSize(30)).toBe("md");
    expect(lobbyPillSize(60)).toBe("sm");
  });
});
