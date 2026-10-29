import type { PlayerView } from "@bitblitz/schema";
import { formatPoints, ordinal } from "./format";

// One sentence per game state for the screen-reader live region on a student's phone.
// A single persistent region announces changes reliably; `aria-live` on content that
// mounts already filled is often skipped by screen readers.

const OUTCOME_TEXT = {
  correct: "Correct",
  partial: "Partly right",
  wrong: "Not this time",
  no_answer: "Time's up",
  skipped: "Skipped",
} as const;

export function liveText(view: PlayerView | null, status: string): string {
  if (status === "reconnecting") return "Connection lost. Reconnecting.";
  if (!view) return "";
  switch (view.phase) {
    case "lobby":
      return `You're in as ${view.nickname}. ${view.playerCount} ${view.playerCount === 1 ? "player" : "players"} waiting.`;
    case "countdown":
      return view.question ? `Get ready. Question ${view.question.index + 1} of ${view.question.total}.` : "Get ready.";
    case "question":
      if (view.answer) return "Answer locked in. Waiting for the others.";
      return view.question ? `Question ${view.question.index + 1} is open with ${view.question.answers.length} answers.` : "";
    case "reveal":
    case "leaderboard": {
      const result = view.result;
      if (!result) return "Watch the screen.";
      const points = result.points.total > 0 ? ` Plus ${formatPoints(result.points.total)} points.` : "";
      return `${OUTCOME_TEXT[result.outcome]}.${points} You're in ${ordinal(result.rank)} with ${formatPoints(result.score)} points.`;
    }
    case "podium":
    case "ended":
      return view.rank ? `Game over. You finished ${ordinal(view.rank)} with ${formatPoints(view.score)} points.` : "Game over.";
  }
}
