// Turns a maze drawn as text (see src/mazes/) into something the game can use,
// and checks that the maze actually works before anyone plays it.
//
// The maze never changes during a game. The candy that gets eaten is tracked
// by the game itself (src/core/game.js), so the same Maze can be reused for
// every round.

import { STEP } from './directions.js';

// What each character in a maze file means.
export const LEGEND = {
  '#': 'wall',
  '.': 'candy',
  o: 'power',   // a golden paw: Panther Power!
  _: 'floor',   // empty hallway, no candy
  ' ': 'floor', // a space works too (but editors sometimes delete spaces at the end of a line, so prefer _)
  '-': 'door',  // the ghost-house door: ghosts can pass, the panther can't
  P: 'panther', // where the panther starts
  G: 'ghost',   // where a ghost starts (inside the ghost house)
  '*': 'treat', // where bonus treats appear (optional, at most one)
};

export class Maze {
  /**
   * @param {{ id: string, name: string, grid: string }} source  a maze file's default export
   */
  constructor(source) {
    this.id = source.id;
    this.name = source.name;
    this.problems = []; // filled by parse() and validate(): { level: 'error' | 'warning', message }

    // Drop blank lines at the start and end, so the grid can sit on its own
    // lines inside the backtick string.
    const lines = source.grid.split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

    this.rows = lines.length;
    this.cols = Math.max(0, ...lines.map((line) => line.length));
    this.parse(lines);
    if (!this.hasErrors) this.validate();
  }

  get hasErrors() {
    return this.problems.some((problem) => problem.level === 'error');
  }

  // ---------------------------------------------------------------------------
  // Reading the text
  // ---------------------------------------------------------------------------

  parse(lines) {
    this.terrain = []; // terrain[row][col] is 'wall', 'floor' or 'door'
    this.candy = [];
    this.powers = [];
    this.ghostStarts = [];
    this.pantherStart = null;
    this.door = null;
    this.treatSpot = null;

    lines.forEach((line, row) => {
      if (line.length !== this.cols) {
        this.error(`Row ${row + 1} is ${line.length} characters long, but the longest row is ${this.cols}. Every row must be the same length.`);
      }
      const terrainRow = [];
      for (let col = 0; col < this.cols; col++) {
        const char = line[col] ?? '#';
        const meaning = LEGEND[char];
        if (!meaning) {
          this.error(`Unknown character "${char}" at row ${row + 1}, column ${col + 1}. See the legend in src/core/maze.js.`);
        }
        const spot = { col, row };
        if (meaning === 'candy') this.candy.push(spot);
        if (meaning === 'power') this.powers.push(spot);
        if (meaning === 'ghost') this.ghostStarts.push(spot);
        if (meaning === 'panther') {
          if (this.pantherStart) this.error(`There are two panthers (P). There must be exactly one.`);
          this.pantherStart = spot;
        }
        if (meaning === 'treat') {
          if (this.treatSpot) this.error('There are two bonus treat spots (*). There can be at most one.');
          this.treatSpot = spot;
        }
        if (meaning === 'door') {
          if (this.door) this.error(`There are two ghost-house doors (-). There must be exactly one.`);
          this.door = spot;
        }
        terrainRow.push(meaning === 'wall' || !meaning ? 'wall' : meaning === 'door' ? 'door' : 'floor');
      }
      this.terrain.push(terrainRow);
    });

    if (!this.pantherStart) this.error('There is no panther start (P).');
    if (!this.door) this.error('There is no ghost-house door (-).');
    if (this.ghostStarts.length === 0) this.error('There are no ghost starts (G).');
  }

  // ---------------------------------------------------------------------------
  // Asking about tiles
  // ---------------------------------------------------------------------------

  // The maze wraps around at the edges: walk off the left side and you come
  // back on the right. That's how tunnels work. So every lookup wraps the
  // column and row first.
  wrapCol(col) {
    return ((col % this.cols) + this.cols) % this.cols;
  }

  wrapRow(row) {
    return ((row % this.rows) + this.rows) % this.rows;
  }

  terrainAt(col, row) {
    return this.terrain[this.wrapRow(row)][this.wrapCol(col)];
  }

  /** Can something walk onto this tile? Only ghosts can use the door. */
  isOpen(col, row, { canUseDoor = false } = {}) {
    const terrain = this.terrainAt(col, row);
    return terrain === 'floor' || (canUseDoor && terrain === 'door');
  }

  isWall(col, row) {
    return this.terrainAt(col, row) === 'wall';
  }

  /** The tile you land on if you step from (col, row) in a direction. */
  neighbor(col, row, direction) {
    return { col: col + STEP[direction].x, row: row + STEP[direction].y };
  }

  /** Where ghosts stand just outside the door, and just inside it. */
  get outsideDoor() {
    return { col: this.door.col, row: this.door.row - 1 };
  }

  get insideDoor() {
    return { col: this.door.col, row: this.door.row + 1 };
  }

  // ---------------------------------------------------------------------------
  // Checking that the maze is playable
  // ---------------------------------------------------------------------------

  validate() {
    const key = (col, row) => `${this.wrapCol(col)},${this.wrapRow(row)}`;

    // 1. Tunnels must come in pairs: an opening on one edge needs an opening
    //    on the opposite edge in the same row (or column), or the panther
    //    would walk off the map.
    for (let row = 0; row < this.rows; row++) {
      const leftOpen = this.terrain[row][0] !== 'wall';
      const rightOpen = this.terrain[row][this.cols - 1] !== 'wall';
      if (leftOpen !== rightOpen) {
        this.error(`Row ${row + 1} has a tunnel on only one side. Open both ends of the row, or close both.`);
      }
    }
    for (let col = 0; col < this.cols; col++) {
      const topOpen = this.terrain[0][col] !== 'wall';
      const bottomOpen = this.terrain[this.rows - 1][col] !== 'wall';
      if (topOpen !== bottomOpen) {
        this.error(`Column ${col + 1} has a tunnel on only one side. Open both ends of the column, or close both.`);
      }
    }

    // 2. The ghost house: everything you can reach from just inside the door
    //    without going back through it.
    const { door } = this;
    if (!this.isOpen(this.outsideDoor.col, this.outsideDoor.row)) {
      this.error('The tile above the ghost-house door must be hallway, so ghosts can walk out. Put the door in the top wall of the ghost house.');
    }
    if (!this.isOpen(this.insideDoor.col, this.insideDoor.row)) {
      this.error('The tile below the ghost-house door must be inside the ghost house.');
    }
    const house = this.floodFill(this.insideDoor);
    const touchesEdge = [...house.values()].some(({ col, row }) => col === 0 || row === 0 || col === this.cols - 1 || row === this.rows - 1);
    if (touchesEdge) {
      this.error('The ghost house is not closed in: it reaches the edge of the maze. Surround it with walls (#) and one door (-).');
    }
    for (const ghost of this.ghostStarts) {
      if (!house.has(key(ghost.col, ghost.row))) {
        this.error(`The ghost at row ${ghost.row + 1}, column ${ghost.col + 1} is outside the ghost house. Ghosts (G) must start inside it.`);
      }
    }
    for (const spot of [...this.candy, ...this.powers]) {
      if (house.has(key(spot.col, spot.row))) {
        this.error(`There is candy inside the ghost house at row ${spot.row + 1}, column ${spot.col + 1}. The panther can't get in there.`);
      }
    }

    // 3. Everything the panther needs must be reachable from its start.
    if (this.pantherStart) {
      const reachable = this.floodFill(this.pantherStart);
      if (house.has(key(this.pantherStart.col, this.pantherStart.row)) || reachable.has(key(door.col, door.row + 1))) {
        this.error('The panther can walk into the ghost house. The house must be closed except for its door (-).');
      }
      for (const spot of [...this.candy, ...this.powers]) {
        if (!reachable.has(key(spot.col, spot.row))) {
          this.error(`The candy at row ${spot.row + 1}, column ${spot.col + 1} can't be reached by the panther.`);
        }
      }
      if (this.treatSpot && !reachable.has(key(this.treatSpot.col, this.treatSpot.row))) {
        this.error('The bonus treat spot (*) can\'t be reached by the panther.');
      }

      // 4. Dead ends aren't broken, but they're traps: a ghost behind you
      //    means you're caught. Warn so the designer knows.
      for (const { col, row } of reachable.values()) {
        const exits = ['up', 'down', 'left', 'right'].filter((direction) => {
          const next = this.neighbor(col, row, direction);
          return this.isOpen(next.col, next.row);
        });
        if (exits.length === 1) {
          this.warn(`Dead end at row ${row + 1}, column ${col + 1}. Ghosts can trap the panther there.`);
        }
      }
    }

    if (this.candy.length === 0) this.error('There is no candy (.) to eat.');
  }

  /**
   * How many steps from every hallway tile to the tile just outside the
   * ghost-house door. Pounced ghost eyes follow this map home.
   *
   * Why a map? Heading "roughly toward" home (like roaming ghosts do) can go
   * round and round a loop forever in some mazes. This map is made with a
   * breadth-first search: start at home (0 steps), then mark every neighbor
   * 1 step, their neighbors 2 steps, and so on, like ripples in a pond. From
   * any tile, stepping to the neighbor with a smaller number always gets
   * closer, so the eyes can never get lost.
   */
  get stepsHome() {
    if (!this.stepsHomeMap) {
      const steps = new Map();
      const home = this.outsideDoor;
      steps.set(`${home.col},${home.row}`, 0);
      const queue = [home];
      for (let i = 0; i < queue.length; i++) {
        const { col, row } = queue[i];
        const here = steps.get(`${col},${row}`);
        for (const direction of ['up', 'down', 'left', 'right']) {
          const next = this.neighbor(col, row, direction);
          const nextCol = this.wrapCol(next.col);
          const nextRow = this.wrapRow(next.row);
          const id = `${nextCol},${nextRow}`;
          if (steps.has(id) || !this.isOpen(nextCol, nextRow)) continue;
          steps.set(id, here + 1);
          queue.push({ col: nextCol, row: nextRow });
        }
      }
      this.stepsHomeMap = steps;
    }
    return this.stepsHomeMap;
  }

  /** Every open tile you can walk to from `start` (wrapping through tunnels, not through the door). */
  floodFill(start) {
    const found = new Map();
    const toVisit = [start];
    while (toVisit.length) {
      const spot = toVisit.pop();
      const col = this.wrapCol(spot.col);
      const row = this.wrapRow(spot.row);
      const id = `${col},${row}`;
      if (found.has(id) || !this.isOpen(col, row)) continue;
      found.set(id, { col, row });
      for (const direction of ['up', 'down', 'left', 'right']) toVisit.push(this.neighbor(col, row, direction));
    }
    return found;
  }

  error(message) {
    this.problems.push({ level: 'error', message: `${this.name ?? this.id}: ${message}` });
  }

  warn(message) {
    this.problems.push({ level: 'warning', message: `${this.name ?? this.id}: ${message}` });
  }
}
