// The characters, drawn with code (no image files).
//
// Every function here draws in TILE units around (0, 0): the renderer has
// already moved and scaled the canvas so that 1 unit = 1 maze tile and (0, 0)
// is the character's center. So a ghost that is 0.9 wide is 90% of a tile,
// on every screen size.
//
// Want to redesign a character? Change the numbers, reload, and look. Small
// changes (0.05) make a visible difference.

import { THEME } from '../config.js';
import { STEP } from '../core/directions.js';

const TAU = Math.PI * 2;

// -----------------------------------------------------------------------------
// The panther
// -----------------------------------------------------------------------------

/**
 * @param state { facing, moving, time, powered, caughtProgress }
 *   caughtProgress: 0 = normal, 1 = fully spun away (the caught animation)
 */
export function drawPanther(ctx, { facing, moving, time, powered, caughtProgress = 0 }) {
  const look = STEP[facing] ?? STEP.left;
  // Chomp: the jaw opens and closes while moving.
  const chomp = moving ? (Math.sin(time * 20) + 1) / 2 : 0.15;
  const bob = moving ? Math.sin(time * 20) * 0.03 : 0;
  const tilt = look.x * 0.14;

  ctx.save();
  if (caughtProgress > 0) {
    ctx.rotate(caughtProgress * TAU * 2);
    const shrink = 1 - caughtProgress * 0.9;
    ctx.scale(shrink, shrink);
    ctx.globalAlpha = 1 - caughtProgress * 0.6;
  }
  ctx.rotate(tilt);
  ctx.translate(0, bob);
  const size = powered ? 1.12 : 1;
  ctx.scale(size, size);

  // Panther Power aura.
  if (powered) {
    const pulse = 0.75 + Math.sin(time * 10) * 0.1;
    const aura = ctx.createRadialGradient(0, 0, 0.2, 0, 0, pulse);
    aura.addColorStop(0, 'rgba(255, 215, 94, 0.55)');
    aura.addColorStop(1, 'rgba(246, 188, 27, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, TAU);
    ctx.fill();
  }

  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = THEME.pantherRim;

  // Ears (behind the head).
  for (const side of [-1, 1]) {
    ctx.fillStyle = THEME.pantherFur;
    ctx.beginPath();
    ctx.moveTo(side * 0.42, -0.14);
    ctx.lineTo(side * 0.36, -0.6);
    ctx.lineTo(side * 0.06, -0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = THEME.maroon;
    ctx.beginPath();
    ctx.moveTo(side * 0.34, -0.22);
    ctx.lineTo(side * 0.32, -0.48);
    ctx.lineTo(side * 0.14, -0.37);
    ctx.closePath();
    ctx.fill();
  }

  // Head.
  const fur = ctx.createRadialGradient(-0.1, -0.2, 0.05, 0, 0, 0.5);
  fur.addColorStop(0, '#3a3242');
  fur.addColorStop(1, THEME.pantherFur);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, 0.02, 0.46, 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Eyes: golden, with slit pupils that look where we're going.
  for (const side of [-1, 1]) {
    ctx.fillStyle = powered ? '#fff3b0' : THEME.pantherEyes;
    ctx.beginPath();
    ctx.ellipse(side * 0.18, -0.06, 0.12, 0.085, side * -0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#120a00';
    ctx.beginPath();
    ctx.ellipse(side * 0.18 + look.x * 0.045, -0.06 + look.y * 0.03, 0.025, 0.07, 0, 0, TAU);
    ctx.fill();
  }

  // Muzzle and nose.
  ctx.fillStyle = '#2b2531';
  ctx.beginPath();
  ctx.ellipse(0, 0.2, 0.2, 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c4566f';
  ctx.beginPath();
  ctx.moveTo(-0.06, 0.1);
  ctx.lineTo(0.06, 0.1);
  ctx.lineTo(0, 0.16);
  ctx.closePath();
  ctx.fill();

  // Mouth: open (with fangs) or a small closed smile.
  if (chomp > 0.2) {
    const open = 0.03 + chomp * 0.09;
    ctx.fillStyle = '#5a0a12';
    ctx.beginPath();
    ctx.ellipse(0, 0.25, 0.12, open, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff8e7';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.08, 0.25 - open * 0.8);
      ctx.lineTo(side * 0.03, 0.25 - open * 0.8);
      ctx.lineTo(side * 0.055, 0.25 + open * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = '#8a7f90';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.07, 0.22);
    ctx.quadraticCurveTo(-0.035, 0.27, 0, 0.21);
    ctx.quadraticCurveTo(0.035, 0.27, 0.07, 0.22);
    ctx.stroke();
  }

  // Whiskers.
  ctx.strokeStyle = 'rgba(255, 248, 231, 0.55)';
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (const lift of [-0.04, 0.02, 0.08]) {
      ctx.moveTo(side * 0.16, 0.18 + lift * 0.5);
      ctx.lineTo(side * 0.5, 0.14 + lift);
    }
  }
  ctx.stroke();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// Ghosts
// -----------------------------------------------------------------------------

/**
 * @param spec   the ghost's entry in GHOSTS (config.js): color and look
 * @param state  { dir, time, scared, flashing, eyesOnly }
 */
export function drawGhost(ctx, spec, { dir, time, scared, flashing, eyesOnly }) {
  const look = STEP[dir] ?? STEP.down;
  ctx.save();

  if (eyesOnly) {
    drawGhostEyes(ctx, look, false);
    ctx.restore();
    return;
  }

  // Scared ghosts tremble.
  if (scared) ctx.translate(Math.sin(time * 40) * 0.025, 0);
  const bob = Math.sin(time * 5 + spec.id.length) * 0.03;
  ctx.translate(0, bob);

  const body = scared ? (flashing && Math.floor(time * 6) % 2 === 0 ? THEME.scaredFlash : THEME.scaredGhost) : spec.color;

  // Body: a dome on top, a wavy hem at the bottom that ripples as it moves.
  ctx.fillStyle = body;
  ctx.strokeStyle = 'rgba(10, 4, 16, 0.55)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.42, 0.38);
  ctx.lineTo(-0.42, -0.08);
  ctx.arc(0, -0.08, 0.42, Math.PI, 0);
  ctx.lineTo(0.42, 0.38);
  const waves = 4;
  const ripple = time * 9;
  for (let i = 0; i < waves; i++) {
    const x1 = 0.42 - (i + 0.5) * (0.84 / waves);
    const x2 = 0.42 - (i + 1) * (0.84 / waves);
    const dip = 0.38 + (i % 2 === 0 ? 0.1 : -0.04) + Math.sin(ripple + i) * 0.03;
    ctx.quadraticCurveTo(x1, dip + 0.06, x2, 0.38);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Each look is a different SHAPE, so ghosts are easy to tell apart even
  // for players who can't tell the colors apart.
  switch (spec.look) {
    case 'pumpkin': drawPumpkinDetails(ctx, scared); break;
    case 'scarf': drawScarf(ctx, look, time); break;
    case 'skull': break; // the skull look changes the face, below
    case 'witch-hat': break; // the hat goes on last, on top
  }

  if (scared) {
    drawScaredFace(ctx, flashing);
  } else if (spec.look === 'skull') {
    drawSkullFace(ctx, look);
  } else {
    drawGhostEyes(ctx, look, spec.look === 'pumpkin');
    if (spec.look === 'pumpkin') drawCarvedMouth(ctx);
  }

  if (spec.look === 'witch-hat') drawWitchHat(ctx, time);
  ctx.restore();
}

function drawGhostEyes(ctx, look, glowing) {
  for (const side of [-1, 1]) {
    ctx.fillStyle = glowing ? '#ffe680' : '#ffffff';
    ctx.beginPath();
    ctx.ellipse(side * 0.15 + look.x * 0.04, -0.1 + look.y * 0.03, 0.11, 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = glowing ? '#7a2a00' : '#1b1464';
    ctx.beginPath();
    ctx.arc(side * 0.15 + look.x * 0.09, -0.1 + look.y * 0.08, 0.06, 0, TAU);
    ctx.fill();
  }
}

function drawScaredFace(ctx, flashing) {
  const ink = flashing ? '#d0103a' : '#fff6e0';
  ctx.fillStyle = ink;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 0.14, -0.1, 0.055, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(-0.24, 0.16);
  for (let i = 1; i <= 6; i++) ctx.lineTo(-0.24 + i * 0.08, i % 2 ? 0.1 : 0.16);
  ctx.stroke();
}

function drawPumpkinDetails(ctx, scared) {
  // Pumpkin ribs.
  ctx.strokeStyle = scared ? 'rgba(40, 30, 120, 0.35)' : 'rgba(140, 50, 0, 0.55)';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (const x of [-0.18, 0.18]) {
    ctx.moveTo(x * 0.6, -0.46);
    ctx.quadraticCurveTo(x * 1.6, -0.05, x, 0.4);
  }
  ctx.stroke();
  // Stem and leaf.
  ctx.fillStyle = '#3c7a2a';
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.47);
  ctx.quadraticCurveTo(-0.04, -0.66, 0.08, -0.7);
  ctx.lineTo(0.08, -0.6);
  ctx.quadraticCurveTo(0.04, -0.56, 0.05, -0.47);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5cb83f';
  ctx.beginPath();
  ctx.ellipse(0.2, -0.56, 0.12, 0.05, -0.5, 0, TAU);
  ctx.fill();
}

function drawCarvedMouth(ctx) {
  ctx.fillStyle = '#3a1200';
  ctx.beginPath();
  ctx.moveTo(-0.22, 0.1);
  ctx.lineTo(-0.12, 0.2);
  ctx.lineTo(-0.06, 0.13);
  ctx.lineTo(0, 0.22);
  ctx.lineTo(0.06, 0.13);
  ctx.lineTo(0.12, 0.2);
  ctx.lineTo(0.22, 0.1);
  ctx.quadraticCurveTo(0, 0.17, -0.22, 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawScarf(ctx, look, time) {
  // A striped scarf; the loose end flaps behind the ghost.
  const trail = look.x !== 0 ? -look.x : 1;
  const flap = Math.sin(time * 12) * 0.06;
  ctx.fillStyle = '#7b3fc4';
  ctx.beginPath();
  ctx.moveTo(-0.44, 0.04);
  ctx.quadraticCurveTo(0, 0.14, 0.44, 0.04);
  ctx.lineTo(0.44, 0.15);
  ctx.quadraticCurveTo(0, 0.25, -0.44, 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(trail * 0.3, 0.12);
  ctx.lineTo(trail * 0.62, 0.22 + flap);
  ctx.lineTo(trail * 0.6, 0.36 + flap);
  ctx.lineTo(trail * 0.24, 0.2);
  ctx.closePath();
  ctx.fill();
  // Gold stripes.
  ctx.strokeStyle = THEME.gold;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  for (const x of [-0.25, 0, 0.25]) {
    ctx.moveTo(x, 0.07 + Math.abs(x) * -0.1);
    ctx.lineTo(x, 0.2 + Math.abs(x) * -0.1);
  }
  ctx.moveTo(trail * 0.45, 0.17 + flap * 0.5);
  ctx.lineTo(trail * 0.43, 0.29 + flap * 0.5);
  ctx.stroke();
}

function drawSkullFace(ctx, look) {
  // Dark eye sockets with tiny glowing pupils.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1a1020';
    ctx.beginPath();
    ctx.ellipse(side * 0.15, -0.1, 0.12, 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(side * 0.15 + look.x * 0.05, -0.1 + look.y * 0.05, 0.04, 0, TAU);
    ctx.fill();
  }
  // Nose.
  ctx.fillStyle = '#1a1020';
  ctx.beginPath();
  ctx.moveTo(-0.04, 0.08);
  ctx.lineTo(0.04, 0.08);
  ctx.lineTo(0, 0.02);
  ctx.closePath();
  ctx.fill();
  // Teeth.
  ctx.strokeStyle = '#1a1020';
  ctx.lineWidth = 0.03;
  ctx.strokeRect(-0.16, 0.14, 0.32, 0.09);
  ctx.beginPath();
  for (const x of [-0.08, 0, 0.08]) {
    ctx.moveTo(x, 0.14);
    ctx.lineTo(x, 0.23);
  }
  ctx.stroke();
}

function drawWitchHat(ctx, time) {
  const sway = Math.sin(time * 4) * 0.04;
  ctx.fillStyle = '#2b0f45';
  ctx.strokeStyle = 'rgba(10, 4, 16, 0.6)';
  ctx.lineWidth = 0.04;
  // Cone with a floppy tip.
  ctx.beginPath();
  ctx.moveTo(-0.24, -0.42);
  ctx.quadraticCurveTo(-0.05, -0.75, 0.12 + sway, -0.98);
  ctx.quadraticCurveTo(0.14, -0.7, 0.28, -0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Brim.
  ctx.beginPath();
  ctx.ellipse(0.02, -0.42, 0.42, 0.08, -0.08, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Orange band.
  ctx.fillStyle = THEME.pumpkin;
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.48);
  ctx.lineTo(0.25, -0.48);
  ctx.lineTo(0.22, -0.56);
  ctx.lineTo(-0.15, -0.56);
  ctx.closePath();
  ctx.fill();
}

// -----------------------------------------------------------------------------
// Candy and golden paws
// -----------------------------------------------------------------------------

// Candy corn is drawn for every candy in three passes (one per color) because
// drawing all the same-colored shapes together is much faster than switching
// colors 200 times a frame.
const CANDY_TIP = -0.2;
const CANDY_BASE = 0.16;
const CANDY_HALF_WIDTH = 0.15;
const BAND_HEIGHTS = [1, 0.66, 0.33]; // fraction of the full corn each color covers, from the tip

/** @param spots  [{ col, row }] tile positions with candy */
export function drawCandyCorn(ctx, spots) {
  BAND_HEIGHTS.forEach((fraction, band) => {
    ctx.fillStyle = THEME.candy[band];
    ctx.beginPath();
    const height = (CANDY_BASE - CANDY_TIP) * fraction;
    const halfWidth = CANDY_HALF_WIDTH * fraction;
    for (const { col, row } of spots) {
      ctx.moveTo(col, row + CANDY_TIP);
      ctx.lineTo(col + halfWidth, row + CANDY_TIP + height);
      ctx.lineTo(col - halfWidth, row + CANDY_TIP + height);
      ctx.closePath();
    }
    ctx.fill();
  });
}

/** A golden paw print (Panther Power). Drawn at (0, 0). */
export function drawPowerPaw(ctx, time) {
  const pulse = 1 + Math.sin(time * 6) * 0.12;
  const glow = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.6 * pulse);
  glow.addColorStop(0, 'rgba(255, 215, 94, 0.6)');
  glow.addColorStop(1, 'rgba(246, 188, 27, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 0.6 * pulse, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = THEME.gold;
  ctx.strokeStyle = THEME.maroon;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.ellipse(0, 0.09, 0.17, 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (const [x, y] of [[-0.19, -0.07], [-0.07, -0.2], [0.07, -0.2], [0.19, -0.07]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 0.065, 0.08, x * 1.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// Bonus treats
// -----------------------------------------------------------------------------

/** A bonus treat, drawn at (0, 0). `id` matches BONUS_TREATS in config.js. */
export function drawTreat(ctx, id, time) {
  const bob = Math.sin(time * 4) * 0.05;
  ctx.save();
  ctx.translate(0, bob);

  // A soft glow so it stands out from the candy.
  const glow = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.75);
  glow.addColorStop(0, 'rgba(255, 246, 214, 0.45)');
  glow.addColorStop(1, 'rgba(255, 246, 214, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 0.75, 0, TAU);
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = 'rgba(10, 4, 16, 0.6)';

  if (id === 'candy-apple') {
    // Stick, shiny red apple, caramel drips.
    ctx.fillStyle = '#e9d3a6';
    ctx.fillRect(-0.03, -0.62, 0.06, 0.34);
    ctx.fillStyle = '#d0142c';
    ctx.beginPath();
    ctx.ellipse(0, 0.05, 0.36, 0.33, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c9781e';
    ctx.beginPath();
    ctx.moveTo(-0.34, -0.06);
    ctx.quadraticCurveTo(0, -0.38, 0.34, -0.06);
    for (const [x, drip] of [[0.22, 0.12], [0.08, 0.2], [-0.08, 0.1], [-0.22, 0.16]]) ctx.quadraticCurveTo(x + 0.06, -0.06 + drip, x, -0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-0.14, 0.06, 0.05, 0.1, 0.4, 0, TAU);
    ctx.fill();
  } else if (id === 'full-size-bar') {
    // A big candy bar in a Panthers wrapper (no real brand!).
    ctx.rotate(-0.25);
    ctx.fillStyle = THEME.maroon;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-0.5, -0.22, 1, 0.44, 0.06);
    else ctx.rect(-0.5, -0.22, 1, 0.44); // older browsers
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = THEME.gold;
    ctx.fillRect(-0.5, -0.06, 1, 0.12);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#cfcfd6'; // crimped foil ends
      ctx.beginPath();
      ctx.moveTo(side * 0.5, -0.22);
      ctx.lineTo(side * 0.62, -0.26);
      ctx.lineTo(side * 0.58, 0);
      ctx.lineTo(side * 0.62, 0.26);
      ctx.lineTo(side * 0.5, 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = THEME.maroon;
    for (const x of [-0.18, 0, 0.18]) {
      ctx.beginPath();
      ctx.arc(x, 0, 0.035, 0, TAU);
      ctx.fill();
    }
  } else {
    // Golden pumpkin with a sparkle.
    ctx.fillStyle = THEME.gold;
    for (const [x, w] of [[-0.18, 0.2], [0.18, 0.2], [0, 0.24]]) {
      ctx.beginPath();
      ctx.ellipse(x, 0.06, w, 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#3c7a2a';
    ctx.fillRect(-0.04, -0.4, 0.08, 0.16);
    const sparkle = (Math.sin(time * 6) + 1) / 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + sparkle * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(0.22, -0.3);
    ctx.lineTo(0.26, -0.18);
    ctx.lineTo(0.38, -0.14);
    ctx.lineTo(0.26, -0.1);
    ctx.lineTo(0.22, 0.02);
    ctx.lineTo(0.18, -0.1);
    ctx.lineTo(0.06, -0.14);
    ctx.lineTo(0.18, -0.18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
