// The panther: the player's character.
//
// The player doesn't steer the panther directly. They say which way they WANT
// to go, and the panther turns that way at the next tile center where it can.
// That "wanted" turn is remembered for a moment (PANTHER.turnMemorySeconds),
// so a swipe that's a little early still works. This is called input
// buffering, and it's a big part of why maze games feel good to play.

import { OPPOSITE } from './directions.js';
import { travel, tileOf } from './movement.js';

export class Panther {
  constructor(maze, settings) {
    this.maze = maze;
    this.settings = settings; // the PANTHER section of config.js
    this.reset();
  }

  reset() {
    const start = this.maze.pantherStart;
    this.x = start.col;
    this.y = start.row;
    this.dir = null;     // the way we're moving right now (null = standing still)
    this.facing = 'left'; // the way we're looking, even when standing still
    this.wanted = null;  // the turn the player asked for
    this.wantedFor = 0;  // seconds left before we forget it
  }

  /** The player asked to go this way. */
  want(direction) {
    this.wanted = direction;
    this.wantedFor = this.settings.turnMemorySeconds;
  }

  update(dt, speed) {
    // Turning around is allowed anywhere, even between tiles. It always feels
    // right, and it's how you escape a ghost.
    if (this.wanted && this.dir && this.wanted === OPPOSITE[this.dir]) {
      this.dir = this.wanted;
      this.wanted = null;
    }

    travel(this, speed * dt, this.maze, () => this.chooseDirection());

    if (this.dir) this.facing = this.dir;
    this.wantedFor -= dt;
    if (this.wantedFor <= 0) this.wanted = null;
  }

  // Called at each tile center: take the wanted turn if there's room,
  // otherwise keep going straight, otherwise stop at the wall.
  chooseDirection() {
    if (this.wanted && this.canGo(this.wanted)) {
      const turn = this.wanted;
      this.wanted = null;
      return turn;
    }
    if (this.dir && this.canGo(this.dir)) return this.dir;
    return null;
  }

  canGo(direction) {
    const { col, row } = tileOf(this, this.maze);
    const next = this.maze.neighbor(col, row, direction);
    return this.maze.isOpen(next.col, next.row);
  }

  get tile() {
    return tileOf(this, this.maze);
  }
}
