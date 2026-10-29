import type { PlayerView } from "@bitblitz/schema";
import { describe, expect, it } from "vitest";
import { liveText } from "./live-text";

const base: PlayerView = {
  role: "player",
  phase: "lobby",
  playerId: "p1",
  nickname: "Ada",
  team: null,
  score: 0,
  paused: false,
  timer: null,
  question: null,
  answer: null,
  result: null,
  rank: null,
  playerCount: 1,
  showAnswersOnDevice: true,
};

const question: PlayerView["question"] = {
  index: 2,
  total: 9,
  type: "single",
  prompt: "Which?",
  media: null,
  answers: [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }],
  timeLimitMs: 20_000,
  points: "standard",
};

describe("liveText", () => {
  it("says nothing before the first view and announces a lost connection", () => {
    expect(liveText(null, "connecting")).toBe("");
    expect(liveText(base, "reconnecting")).toBe("Connection lost. Reconnecting.");
  });

  it("reads the lobby head count with the right plural", () => {
    expect(liveText(base, "open")).toBe("You're in as Ada. 1 player waiting.");
    expect(liveText({ ...base, playerCount: 12 }, "open")).toBe("You're in as Ada. 12 players waiting.");
  });

  it("announces the open question and the locked-in state", () => {
    expect(liveText({ ...base, phase: "question", question }, "open")).toBe("Question 3 is open with 4 answers.");
    expect(liveText({ ...base, phase: "question", question, answer: [1] }, "open")).toBe("Answer locked in. Waiting for the others.");
  });

  it("reads the result with points, rank and score", () => {
    const result: PlayerView["result"] = {
      outcome: "correct",
      points: { speed: 912, first: 100, streak: 73, total: 1085 },
      fastestPlace: 1,
      streak: 3,
      score: 2345,
      rank: 2,
      behind: { nickname: "Bo", points: 10 },
    };
    expect(liveText({ ...base, phase: "reveal", result }, "open")).toBe("Correct. Plus 1,085 points. You're in 2nd with 2,345 points.");
    expect(liveText({ ...base, phase: "leaderboard", result: { ...result, outcome: "no_answer", points: { speed: 0, first: 0, streak: 0, total: 0 } } }, "open")).toBe(
      "Time's up. You're in 2nd with 2,345 points.",
    );
  });

  it("reads the final rank", () => {
    expect(liveText({ ...base, phase: "podium", rank: 3, score: 4000 }, "stopped")).toBe("Game over. You finished 3rd with 4,000 points.");
    expect(liveText({ ...base, phase: "ended" }, "stopped")).toBe("Game over.");
  });
});
