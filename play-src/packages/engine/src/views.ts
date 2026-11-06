import type {
  HostView,
  LeaderboardEntry,
  PlayerResult,
  PlayerView,
  PublicQuestion,
  QuestionReview,
  TeamEntry,
  Timer,
} from "@bitblitz/schema";
import { effectivePoints } from "./scoring";
import type { GameState, PlannedQuestion, PlayerState } from "./state";

// What each role is allowed to see. This file is the answer-leak boundary: a player view
// is built only from public question data until the question has been scored.

const LEADERBOARD_SIZE = 10;

/** Ranking order: score, then lower total response time, then earlier join (rule 9). */
export function standings(state: GameState): PlayerState[] {
  return Object.values(state.players).sort(
    (a, b) => b.score - a.score || a.totalResponseMs - b.totalResponseMs || a.joinSeq - b.joinSeq,
  );
}

export function hostView(state: GameState, now: number): HostView {
  const { phase } = state;
  const question = state.plan[state.questionIndex];
  const showQuestion = phase === "countdown" || phase === "question" || phase === "reveal";
  const scoredPhase = phase === "leaderboard" || phase === "podium" || phase === "ended";
  const ranked = standings(state);

  return {
    role: "host",
    code: state.code,
    phase,
    questionIndex: state.questionIndex,
    title: state.quiz.title,
    questionCount: state.quiz.questions.length,
    settings: state.settings,
    music: state.quiz.music ?? {},
    paused: state.paused !== null,
    players: Object.values(state.players)
      .sort((a, b) => a.joinSeq - b.joinSeq)
      .map((p) => ({ id: p.id, nickname: p.nickname, connected: p.connected, score: p.score, team: p.team })),
    timer: timerView(state, now),
    question: showQuestion && question ? publicQuestion(state, question, true) : null,
    answered: phase === "question" ? answerProgress(state) : null,
    reveal: phase === "reveal" && question ? revealView(state, question) : null,
    leaderboard: scoredPhase ? ranked.slice(0, phase === "leaderboard" ? LEADERBOARD_SIZE : undefined).map(entry) : null,
    teams: state.settings.teams.enabled && (scoredPhase || phase === "reveal") ? teamStandings(state) : null,
    // Both slices start at the top, so the array index is the live rank.
    podium: phase === "podium" || phase === "ended" ? ranked.slice(0, 3).map(entry) : null,
    review: phase === "podium" || phase === "ended" ? questionReview(state) : null,
    hasMoreQuestions: state.questionIndex + 1 < state.plan.length,
  };
}

export function playerView(state: GameState, playerId: string, now: number): PlayerView {
  const player = state.players[playerId]!;
  const { phase } = state;
  const question = state.plan[state.questionIndex];
  const showQuestion = phase === "countdown" || phase === "question" || phase === "reveal";
  const ownAnswer = state.open?.answers[playerId];

  return {
    role: "player",
    phase,
    playerId,
    nickname: player.nickname,
    team: player.team,
    score: player.score,
    paused: state.paused !== null,
    timer: timerView(state, now),
    // During the countdown a phone shows only the prompt, so it gets no answer texts either:
    // a modified client must not get a head start on reading them.
    question:
      showQuestion && question ? publicQuestion(state, question, phase !== "countdown" && state.settings.showAnswersOnDevice) : null,
    // The open question stays on state through the reveal, so the player sees what they picked.
    answer: phase === "question" || phase === "reveal" ? (ownAnswer?.choice ?? null) : null,
    result: phase === "reveal" || phase === "leaderboard" ? playerResult(state, player) : null,
    // Live position, so a kick above this player moves them up; null until they have been scored once.
    rank: player.rank === null ? null : standings(state).findIndex((p) => p.id === playerId) + 1,
    playerCount: Object.keys(state.players).length,
    showAnswersOnDevice: state.settings.showAnswersOnDevice,
  };
}

function publicQuestion(state: GameState, question: PlannedQuestion, withText: boolean): PublicQuestion {
  return {
    index: state.questionIndex,
    total: state.plan.length,
    type: question.type,
    prompt: question.prompt,
    media: question.media,
    // True/false labels are not a secret, so they always show.
    answers: question.answers.map((text) => ({ text: withText || question.type === "true_false" ? text : null })),
    timeLimitMs: question.timeLimitMs,
    points: effectivePoints(question.points, state.settings.pointsMultiplier),
  };
}

function timerView(state: GameState, now: number): Timer | null {
  if (!state.timer) return null;
  // During a question the visible countdown ends at the time limit, not at the grace close.
  const question = state.plan[state.questionIndex];
  const visibleEnd = state.phase === "question" && state.open && question ? state.open.openedAt + question.timeLimitMs : null;
  if (state.paused) {
    const frozenAt = state.paused.at;
    const remaining = visibleEnd !== null ? visibleEnd - frozenAt : (state.paused.remainingMs ?? 0);
    return { msRemaining: Math.max(0, remaining), totalMs: state.timer.totalMs };
  }
  return { msRemaining: Math.max(0, (visibleEnd ?? state.timer.at) - now), totalMs: state.timer.totalMs };
}

function answerProgress(state: GameState): { count: number; total: number } {
  const answers = state.open?.answers ?? {};
  const expected = Object.values(state.players).filter((p) => p.connected || answers[p.id]);
  return { count: expected.filter((p) => answers[p.id]).length, total: expected.length };
}

function revealView(state: GameState, question: PlannedQuestion): HostView["reveal"] {
  const record = state.records.at(-1);
  return {
    correct: question.correct,
    counts: record && !record.skipped ? record.counts : question.answers.map(() => 0),
    explanation: state.settings.explanationSlide ? question.explanation : null,
  };
}

function playerResult(state: GameState, player: PlayerState): PlayerResult | null {
  const record = state.records.at(-1);
  if (!record || record.index !== state.questionIndex) return null;
  if (record.skipped) return null;
  const score = record.results[player.id];
  if (!score) return null;
  const ranked = standings(state);
  const position = ranked.findIndex((p) => p.id === player.id);
  // "Points behind the next player" means the nearest one with a higher score: telling a
  // student they are 0 behind someone they are tied with reads as a bug.
  const above = ranked.slice(0, position).reverse().find((p) => p.score > player.score);
  return {
    ...score,
    score: player.score,
    rank: position + 1,
    behind: above ? { nickname: above.nickname, points: above.score - player.score } : null,
  };
}

/** `position` is the index in the current standings: the stored rank goes stale after a kick or a late join. */
function entry(player: PlayerState, position: number): LeaderboardEntry {
  return {
    playerId: player.id,
    nickname: player.nickname,
    score: player.score,
    rank: position + 1,
    previousRank: player.previousRank,
    team: player.team,
  };
}

/** Rule 10: team score is the members' average (default) or sum. */
export function teamStandings(state: GameState): TeamEntry[] {
  const teams = new Map<string, number[]>();
  for (const p of Object.values(state.players)) {
    if (!p.team) continue;
    teams.set(p.team, [...(teams.get(p.team) ?? []), p.score]);
  }
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return [...teams.entries()]
    .map(([team, scores]) => ({
      team,
      members: scores.length,
      score: state.settings.teams.scoring === "sum" ? sum(scores) : Math.round(sum(scores) / scores.length),
    }))
    .sort((a, b) => b.score - a.score || a.team.localeCompare(b.team))
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

/** The teacher's answer review: which questions were missed most. */
export function questionReview(state: GameState): QuestionReview[] {
  return state.records.map((record) => {
    const question = state.plan[record.index]!;
    const results = Object.values(record.results);
    const answered = results.filter((r) => r.outcome !== "no_answer").length;
    const correct = results.filter((r) => r.outcome === "correct").length;
    return {
      index: record.index,
      prompt: question.prompt,
      type: question.type,
      correctRate: results.length ? correct / results.length : 0,
      answeredRate: results.length ? answered / results.length : 0,
      skipped: record.skipped,
    };
  });
}
