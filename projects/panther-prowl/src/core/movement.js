// How things move through the maze. The panther and the ghosts both use this.
//
// Positions are in tiles: x is the column, y is the row, and (3, 5) is the
// CENTER of the tile in column 3, row 5. Halfway between two tiles is 3.5.
//
// The big rule: you can only change direction at the center of a tile.
// (Turning back the way you came is the one exception; see panther.js.) So we
// move in small hops from one tile center to the next, and each time we reach
// a center we ask "which way now?".

import { STEP } from './directions.js';

const EPSILON = 1e-6; // "close enough" for comparing positions

export function isAtCenter(actor) {
  return Math.abs(actor.x - Math.round(actor.x)) < EPSILON && Math.abs(actor.y - Math.round(actor.y)) < EPSILON;
}

/** The tile the actor is mostly standing on. */
export function tileOf(actor, maze) {
  return { col: maze.wrapCol(Math.round(actor.x)), row: maze.wrapRow(Math.round(actor.y)) };
}

/**
 * Move an actor `distance` tiles along its direction.
 *
 * @param actor     { x, y, dir }; this function changes x, y and dir
 * @param distance  how far to go this frame (speed × seconds)
 * @param maze      the Maze
 * @param decide    called at each tile center: (actor) => the direction to go next, or null to stop
 * @param canUseDoor  ghosts can walk through the ghost-house door, the panther can't
 */
export function travel(actor, distance, maze, decide, { canUseDoor = false } = {}) {
  let remaining = distance;

  // A fast actor on a slow frame can cross a couple of tile centers in one
  // go, so keep hopping until we've used up the distance.
  while (remaining > EPSILON) {
    let hop;
    if (isAtCenter(actor)) {
      snapToCenter(actor, maze);
      actor.dir = decide(actor);
      if (!actor.dir) return; // standing still
      const next = maze.neighbor(Math.round(actor.x), Math.round(actor.y), actor.dir);
      if (!maze.isOpen(next.col, next.row, { canUseDoor })) {
        actor.dir = null; // decide() chose a wall; stop instead of walking into it
        return;
      }
      hop = Math.min(remaining, 1);
    } else {
      hop = Math.min(remaining, distanceToNextCenter(actor));
    }

    actor.x += STEP[actor.dir].x * hop;
    actor.y += STEP[actor.dir].y * hop;
    remaining -= hop;
    if (isAtCenter(actor)) snapToCenter(actor, maze);
    wrapAround(actor, maze);
  }
}

/** How far until the next tile center in the direction we're facing. */
export function distanceToNextCenter(actor) {
  const { x, y } = STEP[actor.dir];
  const along = x !== 0 ? actor.x : actor.y;
  const forward = (x || y) > 0;
  const distance = forward ? Math.ceil(along) - along : along - Math.floor(along);
  return distance < EPSILON ? 1 : distance;
}

// Rounding removes tiny math errors (like 2.9999999) that would otherwise
// pile up and make "are we at the center?" fail.
function snapToCenter(actor, maze) {
  actor.x = Math.round(actor.x);
  actor.y = Math.round(actor.y);
  wrapAround(actor, maze);
}

// Walking out of a tunnel on one side brings you back on the other side.
function wrapAround(actor, maze) {
  if (actor.x < -0.5) actor.x += maze.cols;
  if (actor.x >= maze.cols - 0.5) actor.x -= maze.cols;
  if (actor.y < -0.5) actor.y += maze.rows;
  if (actor.y >= maze.rows - 0.5) actor.y -= maze.rows;
}

/** Distance between two actors in tiles, taking the shortest way through tunnels. */
export function distanceBetween(a, b, maze) {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  dx = Math.min(dx, maze.cols - dx);
  dy = Math.min(dy, maze.rows - dy);
  return Math.hypot(dx, dy);
}
