import type { GameState } from "./state";
import { standings } from "./views";

// Final results for the teacher: nicknames only, never real names (pilot privacy rule).

export function resultsCsv(state: GameState): string {
  const questions = state.plan.map((_, i) => `Q${i + 1}`);
  const header = ["rank", "nickname", "team", "score", "correct", ...questions];
  const rows = standings(state).map((player, i) => {
    const perQuestion = state.plan.map((_, qi) => {
      const record = state.records.find((r) => r.index === qi);
      if (!record) return "";
      if (record.skipped) return "skipped";
      return String(record.results[player.id]?.points.total ?? "");
    });
    return [String(i + 1), player.nickname, player.team ?? "", String(player.score), String(player.correctCount), ...perQuestion];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string): string {
  // A nickname like "=HYPERLINK(...)" must not run as a formula when opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
