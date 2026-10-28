// The parts of the picture that never move: the night sky, the moon, the
// hallway floor and the lockers (walls).
//
// Drawing hundreds of wall pieces every frame would be slow on old tablets,
// so we draw them ONCE onto a hidden canvas, and each frame just copies that
// picture onto the screen. We only redraw it when the screen size changes.

import { THEME } from '../config.js';
import { createRandom } from '../core/random.js';

/** Returns a canvas the size of the screen with the background and maze drawn on it. */
export function buildScene(layout, maze) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.width * layout.pixelRatio);
  canvas.height = Math.round(layout.height * layout.pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.scale(layout.pixelRatio, layout.pixelRatio);

  drawSky(ctx, layout);

  // From here on, draw in tile units with (0, 0) at the top-left corner of
  // the maze's top-left tile.
  ctx.save();
  ctx.translate(layout.maze.x, layout.maze.y);
  ctx.scale(layout.tile, layout.tile);
  drawFloor(ctx, maze);
  drawWalls(ctx, maze);
  drawDoor(ctx, maze);
  drawCobwebs(ctx, maze);
  ctx.restore();

  return canvas;
}

function drawSky(ctx, { width, height }) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, THEME.skyTop);
  sky.addColorStop(1, THEME.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Stars: the same "random" pattern every time, thanks to the seed.
  const random = createRandom(31);
  ctx.fillStyle = 'rgba(255, 248, 231, 0.7)';
  const stars = Math.round((width * height) / 9000);
  for (let i = 0; i < stars; i++) {
    const size = random() * 1.4 + 0.4;
    ctx.globalAlpha = 0.3 + random() * 0.6;
    ctx.fillRect(random() * width, random() * height, size, size);
  }
  ctx.globalAlpha = 1;

  // A huge harvest moon peeking out from the top-right corner.
  const { x: moonX, y: moonY, radius } = moonCircle({ width, height });
  const halo = ctx.createRadialGradient(moonX, moonY, radius * 0.8, moonX, moonY, radius * 1.8);
  halo.addColorStop(0, 'rgba(255, 215, 94, 0.25)');
  halo.addColorStop(1, 'rgba(255, 215, 94, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  const moon = ctx.createRadialGradient(moonX - radius * 0.3, moonY + radius * 0.2, radius * 0.1, moonX, moonY, radius);
  moon.addColorStop(0, '#fff1b8');
  moon.addColorStop(1, THEME.moon);
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Where the moon is, in CSS pixels. Staff mode starts by tapping it. */
export function moonCircle({ width, height }) {
  const radius = Math.max(width, height) * 0.22;
  return { x: width - radius * 0.35, y: radius * 0.3, radius };
}

function drawFloor(ctx, maze) {
  // A soft shadow under the whole maze, then a checkerboard hallway floor.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = THEME.floor;
  roundedRect(ctx, -0.15, -0.15, maze.cols + 0.3, maze.rows + 0.3, 0.6);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = THEME.floorTile;
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      if ((row + col) % 2 === 0 && maze.terrain[row][col] !== 'wall') ctx.fillRect(col, row, 1, 1);
    }
  }
}

// Walls are drawn tile by tile, but each wall tile stretches to touch its wall
// neighbors, so neighboring tiles melt into one smooth block of lockers.
// First pass: a slightly bigger gold shape (the trim). Second pass: the maroon
// lockers on top, leaving a thin gold edge showing all around.
const WALL_INSET = 0.14;   // gap between a wall block and the hallway
const TRIM_WIDTH = 0.09;
const CORNER = 0.22;       // roundness of outside corners

function drawWalls(ctx, maze) {
  ctx.save();
  ctx.shadowColor = 'rgba(246, 188, 27, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = THEME.wallTrim;
  ctx.beginPath();
  forEachWall(maze, (col, row, open) => wallShape(ctx, col, row, open, WALL_INSET - TRIM_WIDTH));
  ctx.fill();
  ctx.restore();

  const lockers = ctx.createLinearGradient(0, 0, 0, maze.rows);
  lockers.addColorStop(0, THEME.wall);
  lockers.addColorStop(1, THEME.wallShade);
  ctx.fillStyle = lockers;
  ctx.beginPath();
  forEachWall(maze, (col, row, open) => wallShape(ctx, col, row, open, WALL_INSET));
  ctx.fill();

  drawLockerDetails(ctx, maze);
  drawClassroomWindows(ctx, maze);
}

// Inside the big solid blocks of wall (classrooms!), a few windows glow
// where someone left the lights on. Seeded, so the same windows light up
// every time.
function drawClassroomWindows(ctx, maze) {
  const random = createRandom(maze.cols * 100 + maze.rows);
  const isWall = (c, r) => c < 0 || r < 0 || c >= maze.cols || r >= maze.rows || maze.terrain[r][c] === 'wall';
  for (let row = 1; row < maze.rows - 1; row++) {
    for (let col = 1; col < maze.cols - 1; col++) {
      // Only tiles completely surrounded by wall (so it's a real block).
      let solid = true;
      for (let dy = -1; dy <= 1 && solid; dy++) for (let dx = -1; dx <= 1; dx++) if (!isWall(col + dx, row + dy)) solid = false;
      if (!solid || random() > 0.45) continue;

      const lit = random() < 0.6;
      const glow = ctx.createRadialGradient(col + 0.5, row + 0.5, 0.05, col + 0.5, row + 0.5, 0.6);
      glow.addColorStop(0, lit ? 'rgba(255, 215, 94, 0.45)' : 'rgba(123, 63, 196, 0.25)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(col - 0.2, row - 0.2, 1.4, 1.4);
      ctx.fillStyle = lit ? '#ffd75e' : '#3a1d5c';
      ctx.fillRect(col + 0.25, row + 0.25, 0.5, 0.5);
      ctx.strokeStyle = THEME.wallShade;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(col + 0.5, row + 0.25);
      ctx.lineTo(col + 0.5, row + 0.75);
      ctx.moveTo(col + 0.25, row + 0.5);
      ctx.lineTo(col + 0.75, row + 0.5);
      ctx.stroke();
      ctx.strokeRect(col + 0.25, row + 0.25, 0.5, 0.5);
    }
  }
}

/** Calls draw(col, row, open) for each wall tile; `open` says which sides face hallway. */
function forEachWall(maze, draw) {
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      if (maze.terrain[row][col] !== 'wall') continue;
      // Outside the maze counts as wall, so the border doesn't leave a gap.
      const isWall = (c, r) => c < 0 || r < 0 || c >= maze.cols || r >= maze.rows || maze.terrain[r][c] === 'wall';
      draw(col, row, {
        up: !isWall(col, row - 1),
        down: !isWall(col, row + 1),
        left: !isWall(col - 1, row),
        right: !isWall(col + 1, row),
      });
    }
  }
}

function wallShape(ctx, col, row, open, inset) {
  const left = col + (open.left ? inset : 0);
  const right = col + 1 - (open.right ? inset : 0);
  const top = row + (open.up ? inset : 0);
  const bottom = row + 1 - (open.down ? inset : 0);
  // Round only the corners where both sides face hallway.
  const radius = {
    topLeft: open.up && open.left ? CORNER : 0,
    topRight: open.up && open.right ? CORNER : 0,
    bottomRight: open.down && open.right ? CORNER : 0,
    bottomLeft: open.down && open.left ? CORNER : 0,
  };
  ctx.moveTo(left + radius.topLeft, top);
  ctx.lineTo(right - radius.topRight, top);
  ctx.arcTo(right, top, right, top + radius.topRight, radius.topRight);
  ctx.lineTo(right, bottom - radius.bottomRight);
  ctx.arcTo(right, bottom, right - radius.bottomRight, bottom, radius.bottomRight);
  ctx.lineTo(left + radius.bottomLeft, bottom);
  ctx.arcTo(left, bottom, left, bottom - radius.bottomLeft, radius.bottomLeft);
  ctx.lineTo(left, top + radius.topLeft);
  ctx.arcTo(left, top, left + radius.topLeft, top, radius.topLeft);
  ctx.closePath();
}

// Locker doors: a seam between lockers and three little air vents.
function drawLockerDetails(ctx, maze) {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let row = 0; row < maze.rows; row++) {
    for (let col = 0; col < maze.cols; col++) {
      if (maze.terrain[row][col] !== 'wall') continue;
      const openAbove = row > 0 && maze.terrain[row - 1][col] !== 'wall';
      const openBelow = row < maze.rows - 1 && maze.terrain[row + 1][col] !== 'wall';
      // Only on walls you can see from a hallway, so the big solid blocks stay calm.
      if (!openAbove && !openBelow) continue;
      ctx.moveTo(col + 0.5, row + 0.2);
      ctx.lineTo(col + 0.5, row + 0.8);
      for (const y of [0.32, 0.42, 0.52]) {
        ctx.moveTo(col + 0.6, row + y);
        ctx.lineTo(col + 0.85, row + y);
        ctx.moveTo(col + 0.15, row + y);
        ctx.lineTo(col + 0.4, row + y);
      }
    }
  }
  ctx.stroke();
}

function drawDoor(ctx, maze) {
  const { col, row } = maze.door;
  ctx.save();
  ctx.shadowColor = THEME.door;
  ctx.shadowBlur = 8;
  ctx.fillStyle = THEME.door;
  ctx.fillRect(col - 0.1, row + 0.38, 1.2, 0.24);
  ctx.restore();
}

// Cobwebs in the four corners of the maze.
function drawCobwebs(ctx, maze) {
  ctx.strokeStyle = 'rgba(230, 225, 255, 0.28)';
  ctx.lineWidth = 0.035;
  const corners = [
    { x: 0, y: 0, sx: 1, sy: 1 },
    { x: maze.cols, y: 0, sx: -1, sy: 1 },
    { x: 0, y: maze.rows, sx: 1, sy: -1 },
    { x: maze.cols, y: maze.rows, sx: -1, sy: -1 },
  ];
  const size = 2.2;
  for (const { x, y, sx, sy } of corners) {
    ctx.beginPath();
    // Spokes.
    for (let i = 0; i <= 4; i++) {
      const angle = (i / 4) * (Math.PI / 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x + sx * Math.cos(angle) * size, y + sy * Math.sin(angle) * size);
    }
    // Rings that sag between the spokes.
    for (const ring of [0.6, 1.2, 1.8]) {
      for (let i = 0; i < 4; i++) {
        const a1 = (i / 4) * (Math.PI / 2);
        const a2 = ((i + 1) / 4) * (Math.PI / 2);
        const mid = (a1 + a2) / 2;
        ctx.moveTo(x + sx * Math.cos(a1) * ring, y + sy * Math.sin(a1) * ring);
        ctx.quadraticCurveTo(
          x + sx * Math.cos(mid) * ring * 0.8,
          y + sy * Math.sin(mid) * ring * 0.8,
          x + sx * Math.cos(a2) * ring,
          y + sy * Math.sin(a2) * ring,
        );
      }
    }
    ctx.stroke();
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
