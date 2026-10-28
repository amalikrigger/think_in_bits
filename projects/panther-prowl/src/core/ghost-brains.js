// GHOST BRAINS: how each ghost decides where to go.
//
// Every ghost moves the same simple way: at each crossing it looks at the
// hallways it could take (never straight back the way it came) and picks the
// one that gets it closest to its TARGET tile, measured in a straight line.
//
// That's it! The only difference between the ghosts is which tile they
// target. Change the target and you change the personality. These few lines
// are all the "intelligence" there is.
//
// A brain is a function that gets the ghost and the world, and returns the
// tile it wants to reach: { col, row }. Returning null means "I don't care",
// and the ghost picks a random hallway instead.
//
// To invent a new ghost: write a new brain below, add it to BRAINS at the
// bottom, then give a ghost in src/config.js that brain's name.

import { STEP } from './directions.js';

/**
 * HUNTER (Hex): aims straight at the panther.
 * Simple, relentless, and easy to predict once you know it.
 */
function hunter(ghost, { panther }) {
  return panther.tile;
}

/**
 * AMBUSHER (Jack): aims a few tiles AHEAD of the panther, to cut it off.
 * If you charge straight at Jack, he'll often turn away, because he's
 * aiming at where you're going, not where you are.
 */
function ambusher(ghost, { panther, settings }) {
  const ahead = settings.ambushTilesAhead;
  const step = STEP[panther.facing];
  return { col: panther.tile.col + step.x * ahead, row: panther.tile.row + step.y * ahead };
}

/**
 * SHY (Mist): chases when far away, but loses its nerve up close and runs
 * back to its own corner. So it circles you without ever quite committing.
 */
function shy(ghost, { panther, settings }) {
  const dx = ghost.x - panther.x;
  const dy = ghost.y - panther.y;
  const distance = Math.hypot(dx, dy);
  return distance > settings.shyDistance ? panther.tile : ghost.cornerTile;
}

/**
 * WANDERER (Bones): doesn't plan at all and picks a random hallway at every
 * crossing. Play a few rounds and compare: how much easier is Bones to avoid
 * than Hex? That difference is what the other brains add.
 */
function wanderer() {
  return null;
}

export const BRAINS = { hunter, ambusher, shy, wanderer };
