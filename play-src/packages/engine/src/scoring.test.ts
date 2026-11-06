import { describe, expect, it } from "vitest";
import {
  basePoints,
  judge,
  oneWayLatencyMs,
  responseTimeMs,
  scoreQuestion,
  speedFactor,
  streakBonus,
  type ScoringInput,
} from "./scoring";

// One test per rule in PLAN.md "Points system", in the plan's order.
// T = 20 s throughout unless a row says otherwise.
const T = 20_000;

describe("rule 1: base points per question", () => {
  it.each([
    ["standard", 1, 1000],
    ["double", 1, 2000],
    ["none", 1, 0],
    ["standard", 0.5, 500],
    ["double", 2, 4000],
  ] as const)("%s × multiplier %s = %s", (level, multiplier, expected) => {
    expect(basePoints(level, multiplier)).toBe(expected);
  });
});

describe("rule 2: speed factor = 1 − (t/T)/2", () => {
  it.each([
    ["instant answer (t = 0)", 0, 1],
    ["halfway (t = T/2)", T / 2, 0.75],
    ["last moment (t = T)", T, 0.5],
    ["negative t after latency correction clamps to instant", -300, 1],
  ])("%s → %s", (_label, t, expected) => {
    expect(speedFactor(t, T)).toBeCloseTo(expected, 10);
  });
});

describe("rule 3: fair timing", () => {
  it("one-way latency is half the median round trip", () => {
    expect(oneWayLatencyMs([100, 300, 200])).toBe(100);
    expect(oneWayLatencyMs([100, 200, 300, 400])).toBe(125); // median of an even count averages the middle two
  });

  it("is capped at 1 s, however slow the Wi-Fi", () => {
    expect(oneWayLatencyMs([3000, 2800, 4000])).toBe(1000);
  });

  it("is 0 before any ping has been measured", () => {
    expect(oneWayLatencyMs([])).toBe(0);
  });

  it("subtracts the player's latency from the server-measured time", () => {
    expect(responseTimeMs({ openedAt: 10_000, receivedAt: 15_000, oneWayLatencyMs: 400 })).toBe(4600);
  });

  it("never goes below zero", () => {
    expect(responseTimeMs({ openedAt: 10_000, receivedAt: 10_100, oneWayLatencyMs: 400 })).toBe(0);
  });
});

describe("judging a choice", () => {
  it.each([
    ["single, right", "single", [1], [1], false, { fraction: 1, exact: true }],
    ["single, wrong", "single", [1], [0], false, { fraction: 0, exact: false }],
    ["true/false, right", "true_false", [0], [0], false, { fraction: 1, exact: true }],
    ["multi, both correct boxes", "multi", [0, 2], [2, 0], false, { fraction: 1, exact: true }],
    ["multi, one of two correct", "multi", [0, 2], [0], false, { fraction: 0.5, exact: false }],
    ["multi, every box ticked (the known exploit)", "multi", [0, 2], [0, 1, 2, 3], false, { fraction: 1, exact: false }],
    ["multi, only wrong boxes", "multi", [0, 2], [1, 3], false, { fraction: 0, exact: false }],
    ["multi + penalty, every box ticked", "multi", [0, 2], [0, 1, 2, 3], true, { fraction: 0, exact: false }],
    ["multi + penalty, 2 right 1 wrong", "multi", [0, 2, 3], [0, 2, 1], true, { fraction: 1 / 3, exact: false }],
  ] as const)("%s", (_label, type, correct, choice, multiPenalty, expected) => {
    const result = judge({ type, correct: [...correct], choice: [...choice], multiPenalty });
    expect(result.exact).toBe(expected.exact);
    expect(result.fraction).toBeCloseTo(expected.fraction, 10);
  });

  it("counts a repeated index once", () => {
    expect(judge({ type: "multi", correct: [0, 2], choice: [0, 0, 0], multiPenalty: false }).fraction).toBe(0.5);
  });
});

describe("rule 7: streak bonus table", () => {
  it.each([
    [1, 0],
    [2, 50],
    [3, 100],
    [5, 200],
    [6, 250],
    [7, 250],
    [20, 250],
  ])("streak of %s → +%s", (streak, bonus) => {
    expect(streakBonus(streak)).toBe(bonus);
  });
});

// ---------- whole-question scoring (rules 4–8) ----------

/** `t` is the fair (latency-corrected) time; `arrivedMs` is when the answer reached the server, if different. */
type AnswerRow = { id: string; choice: number[]; t: number; joinSeq?: number; arrivedMs?: number };

function score(overrides: Partial<ScoringInput> & { rows: AnswerRow[]; players?: string[] }) {
  const { rows, players, ...rest } = overrides;
  const input: ScoringInput = {
    type: "single",
    correct: [0],
    points: "standard",
    multiplier: 1,
    timeLimitMs: T,
    fastestFinger: true,
    streaks: true,
    multiPenalty: false,
    streaksBefore: {},
    playerIds: players ?? rows.map((r) => r.id),
    answers: rows.map((r, i) => ({
      playerId: r.id,
      choice: r.choice,
      responseMs: r.t,
      receivedAt: 1_000_000 + (r.arrivedMs ?? r.t),
      joinSeq: r.joinSeq ?? i,
    })),
    ...rest,
  };
  return scoreQuestion(input);
}

describe("rule 4: single and true/false", () => {
  it.each([
    ["correct at t = 0", [0], 0, 1000],
    ["correct at t = T/2", [0], T / 2, 750],
    ["correct at t = T", [0], T, 500],
    ["correct at t = 7 s rounds to the nearest point", [0], 7000, 825],
    ["wrong, however fast", [1], 0, 0],
    ["1 ms late scores nothing", [0], T + 1, 0],
  ])("%s → %s speed points", (_label, choice, t, expected) => {
    const result = score({ rows: [{ id: "a", choice, t }], fastestFinger: false });
    expect(result.a!.points.speed).toBe(expected);
  });

  it("true/false scores the same way", () => {
    const result = score({ type: "true_false", correct: [1], rows: [{ id: "a", choice: [1], t: 0 }], fastestFinger: false });
    expect(result.a).toMatchObject({ outcome: "correct", points: { speed: 1000, total: 1000 } });
  });
});

describe("rule 5: multi-select", () => {
  const multi = { type: "multi" as const, correct: [0, 1], fastestFinger: false };

  it("exactly right scores full base × speed and counts as correct", () => {
    expect(score({ ...multi, rows: [{ id: "a", choice: [0, 1], t: 0 }] }).a).toMatchObject({
      outcome: "correct",
      points: { speed: 1000 },
    });
  });

  it("half the correct boxes scores half, as partial", () => {
    expect(score({ ...multi, rows: [{ id: "a", choice: [0], t: 0 }] }).a).toMatchObject({
      outcome: "partial",
      points: { speed: 500 },
    });
  });

  it("every box ticked scores full marks but is not exactly right", () => {
    expect(score({ ...multi, rows: [{ id: "a", choice: [0, 1, 2, 3], t: 0 }] }).a).toMatchObject({
      outcome: "partial",
      points: { speed: 1000 },
    });
  });

  it("every box ticked does not grow the streak; it resets it", () => {
    const result = score({ ...multi, streaksBefore: { a: 3 }, rows: [{ id: "a", choice: [0, 1, 2, 3], t: 0 }] });
    expect(result.a).toMatchObject({ streak: 0, points: { streak: 0 } });
  });

  it("with multiPenalty on, every box ticked scores nothing", () => {
    expect(score({ ...multi, multiPenalty: true, rows: [{ id: "a", choice: [0, 1, 2, 3], t: 0 }] }).a!.points.speed).toBe(0);
  });
});

describe("rule 6: fastest finger", () => {
  it("gives +100, +60, +30 to the first three correct answers by fair time", () => {
    const result = score({
      rows: [
        { id: "slow", choice: [0], t: 9000 },
        { id: "wrongFast", choice: [1], t: 100 },
        { id: "first", choice: [0], t: 1000 },
        { id: "third", choice: [0], t: 3000 },
        { id: "second", choice: [0], t: 2000 },
      ],
    });
    expect(result.first!.points.first).toBe(100);
    expect(result.second!.points.first).toBe(60);
    expect(result.third!.points.first).toBe(30);
    expect(result.slow!.points.first).toBe(0);
    expect(result.wrongFast!.points.first).toBe(0);
    expect(result.first!.fastestPlace).toBe(1);
  });

  it("breaks a tie on time by who joined first", () => {
    const result = score({
      rows: [
        { id: "late", choice: [0], t: 1000, joinSeq: 5 },
        { id: "early", choice: [0], t: 1000, joinSeq: 2 },
      ],
    });
    expect(result.early!.points.first).toBe(100);
    expect(result.late!.points.first).toBe(60);
  });

  it("only rewards an exactly-right multi-select", () => {
    const result = score({
      type: "multi",
      correct: [0, 1],
      rows: [
        { id: "tickAll", choice: [0, 1, 2], t: 100 },
        { id: "exact", choice: [0, 1], t: 900 },
      ],
    });
    expect(result.exact!.points.first).toBe(100);
    expect(result.tickAll!.points.first).toBe(0);
  });

  it("can be switched off", () => {
    expect(score({ fastestFinger: false, rows: [{ id: "a", choice: [0], t: 0 }] }).a!.points.first).toBe(0);
  });

  // Decided 6 Nov 2026: the latency allowance is reported by the phone itself, so a modified
  // phone could claim a full second. It still protects slow Wi-Fi in the speed score, but the
  // race for First is decided by when answers actually reached the server.
  it("orders the race by arrival at the server, not by latency-corrected time", () => {
    const result = score({
      rows: [
        { id: "honest", choice: [0], t: 1950, arrivedMs: 2000 },
        // Arrived 30 ms after honest, but claims 1 s of latency, so its corrected time is earlier.
        { id: "claimsLag", choice: [0], t: 1030, arrivedMs: 2030 },
      ],
    });
    expect(result.honest!.fastestPlace).toBe(1);
    expect(result.claimsLag!.fastestPlace).toBe(2);
    // The allowance still counts towards the speed score.
    expect(result.claimsLag!.points.speed).toBeGreaterThan(result.honest!.points.speed);
  });
});

describe("rule 7: streaks across a question", () => {
  it("adds +50 × (streak − 1) from the second correct answer in a row", () => {
    const result = score({ fastestFinger: false, streaksBefore: { a: 2 }, rows: [{ id: "a", choice: [0], t: 0 }] });
    expect(result.a).toMatchObject({ streak: 3, points: { speed: 1000, streak: 100, total: 1100 } });
  });

  it("resets on a wrong answer", () => {
    const result = score({ streaksBefore: { a: 4 }, rows: [{ id: "a", choice: [1], t: 0 }] });
    expect(result.a).toMatchObject({ outcome: "wrong", streak: 0, points: { total: 0 } });
  });

  it("resets on a missing answer", () => {
    const result = score({ streaksBefore: { quiet: 4 }, players: ["quiet"], rows: [] });
    expect(result.quiet).toMatchObject({ outcome: "no_answer", streak: 0, points: { total: 0 } });
  });

  it("can be switched off, while still counting the run for display", () => {
    const result = score({ streaks: false, fastestFinger: false, streaksBefore: { a: 4 }, rows: [{ id: "a", choice: [0], t: 0 }] });
    expect(result.a).toMatchObject({ streak: 5, points: { streak: 0, total: 1000 } });
  });
});

describe("rule 8: per-question maximum", () => {
  it("is 1350 on a standard question", () => {
    const result = score({ streaksBefore: { a: 10 }, rows: [{ id: "a", choice: [0], t: 0 }] });
    expect(result.a!.points).toEqual({ speed: 1000, first: 100, streak: 250, total: 1350 });
  });

  it("is 2350 on a double question (bonuses are not doubled)", () => {
    const result = score({ points: "double", streaksBefore: { a: 10 }, rows: [{ id: "a", choice: [0], t: 0 }] });
    expect(result.a!.points).toEqual({ speed: 2000, first: 100, streak: 250, total: 2350 });
  });
});

describe("a 0× points multiplier (decided 6 Nov 2026)", () => {
  it("is a no-points round: no bonuses, and streaks are left as they were", () => {
    const result = score({ multiplier: 0, streaksBefore: { a: 3, b: 3 }, rows: [{ id: "a", choice: [0], t: 0 }, { id: "b", choice: [1], t: 0 }] });
    expect(result.a).toMatchObject({ outcome: "correct", streak: 3, fastestPlace: null, points: { speed: 0, first: 0, streak: 0, total: 0 } });
    expect(result.b).toMatchObject({ outcome: "wrong", streak: 3, points: { total: 0 } });
  });
});

describe("points: none", () => {
  it("awards nothing and leaves the streak untouched", () => {
    const result = score({ points: "none", streaksBefore: { a: 3, b: 3 }, rows: [{ id: "a", choice: [0], t: 0 }, { id: "b", choice: [1], t: 0 }] });
    expect(result.a).toMatchObject({ outcome: "correct", streak: 3, points: { total: 0, first: 0 } });
    expect(result.b).toMatchObject({ outcome: "wrong", streak: 3, points: { total: 0 } });
  });
});
