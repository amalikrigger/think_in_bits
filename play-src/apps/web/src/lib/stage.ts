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
