// A ghost: where it is, what it's doing, and how it moves.
//
// Each ghost is always in exactly one of these states:
//
//   waiting   inside the ghost house, bobbing, until its leaveAfter time
//   leaving   walking out through the door
//   roaming   out in the halls, chasing (or scattering, or scared)
//   eyes      just got pounced! Only its eyes are left, racing home
//   entering  walking back into the house, where it turns back into a ghost
//
// Which TILE a roaming ghost heads for is decided by its brain
// (src/core/ghost-brains.js). This file handles everything else.

import { BRAINS } from './ghost-brains.js';
import { DIRECTIONS, OPPOSITE } from './directions.js';
import { travel, tileOf } from './movement.js';
import { pick } from './random.js';

export class Ghost {
  /**
   * @param spec   this ghost's entry in GHOSTS (src/config.js)
   * @param index  which ghost this is (0, 1, 2...), to choose its start tile
   */
  constructor(spec, index, maze) {
    this.spec = spec;
    this.id = spec.id;
    this.index = index;
    this.maze = maze;
    this.brain = BRAINS[spec.brain];
    if (!this.brain) throw new Error(`Ghost "${spec.id}" has an unknown brain "${spec.brain}". Use one of: ${Object.keys(BRAINS).join(', ')}.`);
    this.cornerTile = cornerTile(spec.corner, maze);
    this.reset();
  }

  reset() {
    const start = this.maze.ghostStarts[this.index % this.maze.ghostStarts.length];
    this.x = start.col;
    this.y = start.row;
    this.dir = null;
    this.state = 'waiting';
    this.waitLeft = this.spec.leaveAfter;
    this.scared = false;
  }

  /** Can this ghost catch the panther right now? */
  get isDangerous() {
    return this.state === 'roaming' && !this.scared;
  }

  /** Can the panther pounce on this ghost right now? */
  get isPounceable() {
    return this.state === 'roaming' && this.scared;
  }

  get tile() {
    return tileOf(this, this.maze);
  }

  /** Panther Power started: get scared and turn around. */
  frighten() {
    if (this.state === 'eyes' || this.state === 'entering') return;
    this.scared = true;
    this.reverse();
  }

  calmDown() {
    this.scared = false;
  }

  /** Turn around. Ghosts do this when their mood changes, as a warning. */
  reverse() {
    if (this.state === 'roaming' && this.dir) this.dir = OPPOSITE[this.dir];
  }

  pounced() {
    this.state = 'eyes';
    this.scared = false;
  }

  /**
   * @param world { panther, mood, random, speeds, settings }
   *   mood    'chase' or 'scatter'
   *   speeds  { normal, scared, eyes, inHouse } in tiles per second
   */
  update(dt, world) {
    switch (this.state) {
      case 'waiting':
        this.waitLeft -= dt;
        if (this.waitLeft <= 0) this.state = 'leaving';
        break;

      case 'leaving': {
        // Line up with the door, then walk up through it.
        const outside = this.maze.outsideDoor;
        const arrived = this.walkStraightTo(outside, world.speeds.inHouse * dt);
        if (arrived) {
          this.state = 'roaming';
          this.dir = pick(['left', 'right'], world.random);
        }
        break;
      }

      case 'roaming': {
        const speed = this.scared ? world.speeds.scared : world.speeds.normal;
        travel(this, speed * dt, this.maze, () => this.chooseDirection(world));
        break;
      }

      case 'eyes': {
        const home = this.maze.outsideDoor;
        travel(this, world.speeds.eyes * dt, this.maze, () => {
          const here = this.tile;
          if (here.col === home.col && here.row === home.row) {
            this.state = 'entering';
            return null; // stop here; 'entering' takes over next frame
          }
          return this.directionHome();
        });
        break;
      }

      case 'entering': {
        const arrived = this.walkStraightTo(this.maze.insideDoor, world.speeds.eyes * 0.5 * dt);
        if (arrived) this.state = 'leaving'; // back to normal, and straight back out
        break;
      }
    }
  }

  // Called at each tile center while roaming.
  chooseDirection(world) {
    if (this.scared) return this.randomDirection(world.random);
    const target = world.mood === 'scatter' ? this.cornerTile : this.brain(this, world);
    return target ? this.bestDirectionToward(target) : this.randomDirection(world.random);
  }

  /** The hallways open from here, not counting straight back. */
  openDirections() {
    const { col, row } = this.tile;
    const isOpen = (direction) => {
      const next = this.maze.neighbor(col, row, direction);
      return this.maze.isOpen(next.col, next.row);
    };
    const choices = DIRECTIONS.filter((direction) => direction !== OPPOSITE[this.dir] && isOpen(direction));
    // Dead end: the only way out is back.
    if (choices.length === 0 && this.dir && isOpen(OPPOSITE[this.dir])) return [OPPOSITE[this.dir]];
    return choices;
  }

  bestDirectionToward(target) {
    const { col, row } = this.tile;
    let best = null;
    let bestDistance = Infinity;
    for (const direction of this.openDirections()) {
      const next = this.maze.neighbor(col, row, direction);
      // Squared distance: same winner as real distance, without a square root.
      const distance = (next.col - target.col) ** 2 + (next.row - target.row) ** 2;
      if (distance < bestDistance) {
        best = direction;
        bestDistance = distance;
      }
    }
    return best;
  }

  /**
   * Eyes follow the maze's "steps home" map (see Maze.stepsHome): take the
   * neighbor that's the fewest steps from home. Turning back is allowed.
   */
  directionHome() {
    const { col, row } = this.tile;
    const steps = this.maze.stepsHome;
    let best = null;
    let fewest = Infinity;
    for (const direction of DIRECTIONS) {
      const next = this.maze.neighbor(col, row, direction);
      const count = steps.get(`${this.maze.wrapCol(next.col)},${this.maze.wrapRow(next.row)}`);
      if (count !== undefined && count < fewest) {
        best = direction;
        fewest = count;
      }
    }
    return best;
  }

  randomDirection(random) {
    const choices = this.openDirections();
    return choices.length ? pick(choices, random) : null;
  }

  // Inside the ghost house there are no hallways to follow, so ghosts just
  // walk sideways to the door's column, then straight up or down.
  walkStraightTo(target, distance) {
    let remaining = distance;
    const dx = target.col - this.x;
    if (Math.abs(dx) > 1e-6) {
      const hop = Math.min(Math.abs(dx), remaining);
      this.x += Math.sign(dx) * hop;
      this.dir = dx > 0 ? 'right' : 'left';
      remaining -= hop;
    }
    const dy = target.row - this.y;
    if (remaining > 0 && Math.abs(dy) > 1e-6) {
      const hop = Math.min(Math.abs(dy), remaining);
      this.y += Math.sign(dy) * hop;
      this.dir = dy > 0 ? 'down' : 'up';
    }
    const arrived = Math.abs(this.x - target.col) < 1e-6 && Math.abs(this.y - target.row) < 1e-6;
    if (arrived) {
      this.x = target.col;
      this.y = target.row;
    }
    return arrived;
  }
}

// A spot just outside each corner of the maze. Targeting a tile outside the
// maze makes the ghost circle the nearest corner block forever.
function cornerTile(corner, maze) {
  const left = -1;
  const right = maze.cols;
  const top = -2;
  const bottom = maze.rows + 1;
  switch (corner) {
    case 'top-left': return { col: left, row: top };
    case 'top-right': return { col: right, row: top };
    case 'bottom-left': return { col: left, row: bottom };
    case 'bottom-right': return { col: right, row: bottom };
    default: throw new Error(`Unknown ghost corner "${corner}". Use top-left, top-right, bottom-left or bottom-right.`);
  }
}
