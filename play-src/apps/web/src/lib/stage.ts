// Sizing rules for the projector and the phone, as pure functions so they are testable.

/**
 * Prompt type on the projector scales with viewport size via CSS clamp(); on top of that,
 * long prompts step down so a question stays on one screen instead of pushing the tiles
 * under the fold. Quiz prompts may be up to 500 characters.
 */
export function promptScale(chars: number): number {
  if (chars > 280) return 0.62;
  if (chars > 160) return 0.78;
  if (chars > 90) return 0.9;
  return 1;
}

/**
 * How many leaderboard rows fit without scrolling: title and chrome take about 260 px,
 * each row about 56 px. Always at least the top five, never more than twelve: the class
 * only needs to see who moved near the top.
 */
export function leaderboardRows(viewportHeight: number): number {
  const fit = Math.floor((viewportHeight - 260) / 56);
  return Math.max(5, Math.min(12, fit));
}

/** Phones stack answers in one column; wide screens use two. Shapes-only mode is always a grid. */
export function answerColumns(answerCount: number, viewportWidth: number, shapesOnly: boolean): 1 | 2 {
  if (shapesOnly) return 2;
  if (viewportWidth >= 640) return 2;
  return answerCount >= 5 && viewportWidth >= 400 ? 2 : 1;
}

/** Lobby nickname pills shrink once the room is busy, so sixty names still fit above the fold. */
export function lobbyPillSize(playerCount: number): "lg" | "md" | "sm" {
  if (playerCount > 40) return "sm";
  if (playerCount > 16) return "md";
  return "lg";
}

/**
 * Identifies a leaderboard's standings. The climb animation replays only when this changes:
 * the host view is re-sent whenever a phone drops off or rejoins, as a new array with the
 * same standings, and replaying then would show the class the old order again.
 */
export function boardSignature(entries: { playerId: string; score: number; rank: number; previousRank: number | null }[]): string {
  return entries.map((e) => `${e.playerId}:${e.score}:${e.rank}:${e.previousRank ?? ""}`).join("|");
}

/** "And N more players": the server sends only the top rows, so count from the whole class. */
export function hiddenPlayerCount(classSize: number, shownRows: number): number {
  return Math.max(0, classSize - shownRows);
}

/**
 * How long the projector's podium takes to build 3rd → 2nd → 1st (first place lands at
 * 2.2 s and springs into place). Phones wait this long before showing the student's own
 * place, so nobody's phone spoils the reveal the class is watching.
 */
export const PODIUM_BUILD_MS = 3200;
