import type { PlayerResult, PointsBreakdown, PointsLevel, QuestionType } from "@bitblitz/schema";

// All points math, as pure functions. PLAN.md "Points system" is the spec and
// scoring.test.ts walks it rule by rule.

export const BASE_POINTS: Record<PointsLevel, number> = { standard: 1000, double: 2000, none: 0 };
export const FASTEST_FINGER_BONUS = [100, 60, 30] as const;
export const STREAK_STEP = 50;
export const STREAK_CAP = 250;
export const LATENCY_CAP_MS = 1000;

/** What a question is worth in this game: a 0× multiplier makes every question a no-points round. */
export function effectivePoints(level: PointsLevel, multiplier: number): PointsLevel {
  return multiplier > 0 ? level : "none";
}

export function basePoints(level: PointsLevel, multiplier: number): number {
  return BASE_POINTS[level] * multiplier;
}

/** 1 for an instant answer, 0.5 at the last moment. */
export function speedFactor(responseMs: number, timeLimitMs: number): number {
  const t = Math.min(Math.max(responseMs, 0), timeLimitMs);
  return 1 - t / timeLimitMs / 2;
}

/** Half the median round trip, capped so a bad connection can't buy more than 1 s. */
export function oneWayLatencyMs(roundTripSamplesMs: readonly number[]): number {
  if (roundTripSamplesMs.length === 0) return 0;
  const sorted = [...roundTripSamplesMs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.min(median / 2, LATENCY_CAP_MS);
}

/** Server-measured time since the question opened, minus the player's estimated latency. */
export function responseTimeMs(args: { openedAt: number; receivedAt: number; oneWayLatencyMs: number }): number {
  return Math.max(0, args.receivedAt - args.openedAt - args.oneWayLatencyMs);
}

export type Judgement = {
  /** Share of base points earned before the speed factor, 0–1. */
  fraction: number;
  /** The selection matches the correct set exactly; only this grows streaks and wins fastest finger. */
  exact: boolean;
};

export function judge(args: {
  type: QuestionType;
  correct: readonly number[];
  choice: readonly number[];
  multiPenalty: boolean;
}): Judgement {
  const correct = new Set(args.correct);
  const picked = new Set(args.choice);
  const rightPicks = [...picked].filter((i) => correct.has(i)).length;
  const wrongPicks = picked.size - rightPicks;
  const exact = wrongPicks === 0 && rightPicks === correct.size;

  if (args.type !== "multi") return { fraction: exact ? 1 : 0, exact };

  // Kahoot-style partial credit. Without the penalty, ticking every box earns full
  // marks; the streak rule (exact only) is the mitigation Amali chose.
  const earned = args.multiPenalty ? rightPicks - wrongPicks : rightPicks;
  return { fraction: Math.max(0, earned) / correct.size, exact };
}

/** Bonus for the answer that brings the run of correct answers to `streak`. */
export function streakBonus(streak: number): number {
  return Math.min(STREAK_STEP * Math.max(0, streak - 1), STREAK_CAP);
}

export type ScoringAnswer = {
  playerId: string;
  choice: number[];
  /** Fair response time from responseTimeMs. */
  responseMs: number;
  receivedAt: number;
  joinSeq: number;
};

export type ScoringInput = {
  type: QuestionType;
  correct: number[];
  points: PointsLevel;
  multiplier: number;
  timeLimitMs: number;
  fastestFinger: boolean;
  streaks: boolean;
  multiPenalty: boolean;
  /** Run of exactly-right answers before this question, by player. */
  streaksBefore: Record<string, number>;
  /** Everyone who should get a result, including players who did not answer. */
  playerIds: string[];
  answers: ScoringAnswer[];
};

export type QuestionScore = Pick<PlayerResult, "outcome" | "points" | "fastestPlace" | "streak">;

export function scoreQuestion(input: ScoringInput): Record<string, QuestionScore> {
  const base = basePoints(input.points, input.multiplier);
  // No points means no bonuses either, and streaks are left as they were.
  const counts = effectivePoints(input.points, input.multiplier) !== "none";
  const answersByPlayer = new Map(input.answers.map((a) => [a.playerId, a]));

  const judged = new Map<string, Judgement>();
  for (const answer of input.answers) {
    const onTime = answer.responseMs <= input.timeLimitMs;
    judged.set(
      answer.playerId,
      onTime ? judge({ ...input, choice: answer.choice }) : { fraction: 0, exact: false },
    );
  }

  const fastestPlaces = new Map<string, 1 | 2 | 3>();
  if (counts) {
    // The race is decided by arrival at the server. The latency allowance in responseMs comes
    // from the phone's own pong timing, so a modified phone could claim it to jump the queue.
    const exactInOrder = input.answers
      .filter((a) => judged.get(a.playerId)?.exact)
      .sort((a, b) => a.receivedAt - b.receivedAt || a.joinSeq - b.joinSeq);
    exactInOrder.slice(0, FASTEST_FINGER_BONUS.length).forEach((a, i) => {
      fastestPlaces.set(a.playerId, (i + 1) as 1 | 2 | 3);
    });
  }

  const results: Record<string, QuestionScore> = {};
  for (const playerId of input.playerIds) {
    const answer = answersByPlayer.get(playerId);
    const judgement = judged.get(playerId);
    const streakBefore = input.streaksBefore[playerId] ?? 0;

    if (!answer || !judgement) {
      results[playerId] = {
        outcome: "no_answer",
        points: zeroPoints(),
        fastestPlace: null,
        streak: counts ? 0 : streakBefore,
      };
      continue;
    }

    const outcome = judgement.exact ? "correct" : judgement.fraction > 0 ? "partial" : "wrong";
    if (!counts) {
      results[playerId] = { outcome, points: zeroPoints(), fastestPlace: null, streak: streakBefore };
      continue;
    }

    const streak = judgement.exact ? streakBefore + 1 : 0;
    const fastestPlace = fastestPlaces.get(playerId) ?? null;
    const speed = Math.round(base * judgement.fraction * speedFactor(answer.responseMs, input.timeLimitMs));
    const first = input.fastestFinger && fastestPlace ? (FASTEST_FINGER_BONUS[fastestPlace - 1] ?? 0) : 0;
    const streakPoints = input.streaks && judgement.exact ? streakBonus(streak) : 0;
    results[playerId] = {
      outcome,
      points: { speed, first, streak: streakPoints, total: speed + first + streakPoints },
      fastestPlace: input.fastestFinger ? fastestPlace : null,
      streak,
    };
  }
  return results;
}

function zeroPoints(): PointsBreakdown {
  return { speed: 0, first: 0, streak: 0, total: 0 };
}
