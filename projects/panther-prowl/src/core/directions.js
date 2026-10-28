// The four ways you can move in the maze.
//
// A direction is just a name: 'up', 'down', 'left' or 'right'. `null` means
// "not moving". STEP tells you how far one move changes the column (x) and
// row (y). Rows count DOWN the screen, so 'up' is y - 1.

export const STEP = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// When a ghost has two equally good choices it takes the first one in this
// list, so ghosts always behave the same way in the same situation.
export const DIRECTIONS = ['up', 'left', 'down', 'right'];
