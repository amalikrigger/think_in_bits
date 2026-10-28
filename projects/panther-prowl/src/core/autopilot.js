// A computer player. It drives the panther on the title screen (the "attract
// mode" arcade machines use to get people's attention), and it helps us test
// how many points a decent player scores, to set fair prize thresholds.
//
// How it thinks: a "breadth-first search". Starting from the panther, it
// looks at every tile 1 step away, then every tile 2 steps away, and so on,
// like ripples in a pond, until it finds the nearest candy. Then it takes the
// first step along that path. Tiles right next to a dangerous ghost count as
// walls, so it (mostly) steers around them.

import { DIRECTIONS } from './directions.js';
import { PELLET } from './game.js';

export function autopilotDirection(game, { caution = 2 } = {}) {
  const { maze, panther } = game;
  const start = panther.tile;

  const danger = new Set();
  const prey = new Set();
  for (const ghost of game.ghosts) {
    const { col, row } = ghost.tile;
    if (ghost.isPounceable) prey.add(`${col},${row}`);
    if (!ghost.isDangerous) continue;
    for (let dy = -caution; dy <= caution; dy++) {
      for (let dx = -caution; dx <= caution; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= caution) danger.add(`${maze.wrapCol(col + dx)},${maze.wrapRow(row + dy)}`);
      }
    }
  }

  const isGoal = (col, row) => game.pelletAt(col, row) !== PELLET.NOTHING || prey.has(`${col},${row}`);

  // Each queue entry remembers which first step led there.
  const seen = new Set([`${start.col},${start.row}`]);
  const queue = [];
  for (const direction of DIRECTIONS) {
    const next = maze.neighbor(start.col, start.row, direction);
    const col = maze.wrapCol(next.col);
    const row = maze.wrapRow(next.row);
    if (!maze.isOpen(col, row) || danger.has(`${col},${row}`)) continue;
    seen.add(`${col},${row}`);
    queue.push({ col, row, first: direction });
  }

  for (let i = 0; i < queue.length; i++) {
    const { col, row, first } = queue[i];
    if (isGoal(col, row)) return first;
    for (const direction of DIRECTIONS) {
      const next = maze.neighbor(col, row, direction);
      const nextCol = maze.wrapCol(next.col);
      const nextRow = maze.wrapRow(next.row);
      const id = `${nextCol},${nextRow}`;
      if (seen.has(id) || !maze.isOpen(nextCol, nextRow) || danger.has(id)) continue;
      seen.add(id);
      queue.push({ col: nextCol, row: nextRow, first });
    }
  }

  // Boxed in by ghosts: any safe-looking first step, or keep going.
  return queue[0]?.first ?? panther.dir ?? 'left';
}
