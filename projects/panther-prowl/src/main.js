// Panther Prowl: where everything gets connected.
//
// This file doesn't contain game rules (those are in src/core/) or drawing
// code (src/render/). It sets things up, runs the loop, switches screens, and
// turns game events ("candy", "pounce", "caught"...) into sounds and effects.

import { MAZES, MODES, CONTROLS, THEME, GHOSTS, STAFF, PANTHER, BONUS_TREATS } from './config.js';
import { Maze } from './core/maze.js';
import { Game } from './core/game.js';
import { autopilotDirection } from './core/autopilot.js';
import { tierFor, verificationCode } from './core/prizes.js';
import { boardKey, qualifies, topScores, dayOf } from './core/leaderboard.js';
import { MAZE_SOURCES } from './mazes/index.js';
import { computeLayout } from './render/layout.js';
import { Renderer } from './render/renderer.js';
import { Effects } from './render/effects.js';
import { Controls } from './input/controls.js';
import { startLoop } from './engine/loop.js';
import { unlock, setMuted, isMuted, sounds } from './audio/sound.js';
import { load, save } from './storage/store.js';
import { loadSettings, saveSettings, loadLeaderboard, addToLeaderboard, resetLeaderboard, nextPlayNumber, loadPrizeLog, logPrize } from './storage/booth.js';
import { showScreen, showBanner, hideBanner, showResults, showMazeProblems, sinceScreenChange } from './ui/screens.js';
import { Hud } from './ui/hud.js';
import { setupFullscreen } from './ui/fullscreen.js';
import { showPrize, stopPrizeClock } from './ui/prize.js';
import { askForInitials, handleInitialsKey, submitInitials, skipInitials } from './ui/initials.js';
import { showLeaderboard } from './ui/leaderboard.js';
import { askForPin, handlePinKey, submitPin, openStaffPanel, confirmTwice, showStaffMessage } from './ui/staff.js';
import { moonCircle } from './render/scene.js';
import { loadSprite } from './render/sprites.js';

const $ = (id) => document.getElementById(id);

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let isTouch = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;

// -----------------------------------------------------------------------------
// Mazes: load and check them. A broken maze shows its problems on screen.
// -----------------------------------------------------------------------------

const mazes = Object.fromEntries(MAZE_SOURCES.map((source) => [source.id, new Maze(source)]));
const classicMazes = MAZES.classic.map((id) => mazes[id]).filter(Boolean);
const classicMaze = classicMazes[0];

// -----------------------------------------------------------------------------
// The pieces
// -----------------------------------------------------------------------------

const canvas = $('game');
const renderer = new Renderer(canvas, { reducedMotion });
const effects = new Effects({ reducedMotion });
const hud = new Hud();

let screen = 'loading';
let game = null;        // the game being played
let attract = null;     // the demo game behind the title screen
let gameOverAt = null;  // when the current game ended (results appear shortly after)
let layout = null;
let settings = loadSettings(); // staff settings for this device (src/storage/booth.js)
let lastInputAt = performance.now(); // for kiosk mode: when someone last touched anything
let challengeResult = null; // the finished Challenge, between the prize screen and the leaderboard

const controls = new Controls({
  swipeSurface: canvas,
  dpad: $('dpad'),
  handlers: {
    direction: (direction) => game?.steer(direction),
    pause: () => (screen === 'playing' ? pause() : screen === 'pause' ? resume() : null),
    mute: toggleMute,
    anyInput: unlock, // phones only allow sound after the first touch
    // While someone types initials or a PIN, letter keys aren't shortcuts.
    isTyping: () => ['initials', 'staff-pin', 'staff'].includes(screen),
  },
});

// -----------------------------------------------------------------------------
// Screen size
// -----------------------------------------------------------------------------

function relayout() {
  // Mid-rotation, some browsers briefly report a 0×0 window. Wait for a real size.
  if (window.innerWidth < 1 || window.innerHeight < 1) return;
  const style = getComputedStyle(document.documentElement);
  const safe = (name) => parseFloat(style.getPropertyValue(name)) || 0;
  const screenSize = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // more than 2× costs a lot and looks the same
    safeTop: safe('--safe-top'),
    safeBottom: safe('--safe-bottom'),
  };
  const maze = (game ?? attract)?.maze ?? classicMaze;
  layout = computeLayout(screenSize, maze, { dpadSetting: CONTROLS.dpad, isTouch });
  renderer.resize(layout, maze);

  const root = document.documentElement.style;
  root.setProperty('--maze-x', `${layout.maze.x}px`);
  root.setProperty('--maze-y', `${layout.maze.y}px`);
  root.setProperty('--maze-w', `${layout.maze.width}px`);
  root.setProperty('--maze-h', `${layout.maze.height}px`);
  document.body.dataset.layout = layout.mode;

  const pad = $('dpad');
  pad.hidden = !layout.dpad;
  if (layout.dpad) {
    Object.assign(pad.style, {
      left: `${layout.dpad.x}px`,
      top: `${layout.dpad.y}px`,
      width: `${layout.dpad.size}px`,
      height: `${layout.dpad.size}px`,
    });
  }
}

window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', relayout);
window.visualViewport?.addEventListener('resize', relayout);
// A laptop with a touch screen: show the arrow pad once someone touches it.
window.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' && !isTouch) {
    isTouch = true;
    relayout();
  }
});

// -----------------------------------------------------------------------------
// Starting, pausing and ending games
// -----------------------------------------------------------------------------

function startGame(mode) {
  unlock();
  stopPrizeClock();
  if (mode === 'challenge') {
    // Same maze, same seed, same length for every paid play.
    game = new Game({ maze: challengeMaze(), mode, seed: MODES.challenge.seed, roundSeconds: settings.roundSeconds });
  } else {
    game = new Game({ maze: classicMaze, levelMazes: classicMazes.filter((maze) => !maze.hasErrors), mode, seed: Date.now() % 100000 });
  }
  gameOverAt = null;
  effects.clear();
  hud.reset();
  controls.enabled = true;
  relayout();
  screen = 'playing';
  showScreen('playing');
  handleEvents(game.takeEvents());
}

function pause() {
  if (screen !== 'playing' || !game || game.phase === 'over') return;
  screen = 'pause';
  showScreen('pause');
}

function resume() {
  if (screen !== 'pause') return;
  screen = 'playing';
  showScreen('playing');
}

function goToTitle() {
  game = null;
  challengeResult = null;
  controls.enabled = false;
  stopPrizeClock();
  hideBanner();
  effects.clear();
  startAttract();
  relayout();
  updateTitle();
  screen = 'title';
  showScreen('title');
}

function finishGame() {
  if (game.mode === 'challenge') {
    finishChallenge();
    return;
  }
  const key = `best.${game.mode}`;
  const best = load(key, 0);
  const isNewBest = game.score > best;
  if (isNewBest) save(key, game.score);
  controls.enabled = false;
  screen = 'results';
  showResults({
    title: game.mode === 'challenge' ? "Time's up!" : 'Caught!',
    score: game.score,
    isNewBest,
    stats: [
      ['Candy', game.stats.candy],
      ['Pounces', game.stats.pounces],
      ['Level', game.level],
    ],
  });
}

function updateTitle() {
  $('challenge-sub').textContent = `${settings.roundSeconds} seconds · ${settings.prizeStation ? 'win prizes!' : 'beat the high scores'}`;

  const lines = [];
  const [tonight] = topScores(loadLeaderboard(), { board: currentBoard(), day: dayOf(), size: 1 });
  if (tonight) lines.push(`Tonight's best: <span class="gold">${tonight.initials} ${tonight.score.toLocaleString()}</span>`);
  const best = load('best.classic', 0);
  if (best > 0) lines.push(`Classic best: <span class="gold">${best.toLocaleString()}</span>`);
  $('best-line').innerHTML = lines.join(' · ');
}

// -----------------------------------------------------------------------------
// The Boo Bash Challenge: prize screen → initials → leaderboard
// -----------------------------------------------------------------------------

function challengeMaze() {
  const maze = mazes[settings.challengeMaze];
  return maze && !maze.hasErrors ? maze : classicMaze;
}

/** The leaderboard for the current Challenge settings. */
function currentBoard() {
  return boardKey({ mazeId: challengeMaze().id, roundSeconds: settings.roundSeconds });
}

function finishChallenge() {
  controls.enabled = false;
  const { score } = game;
  const tiers = [...settings.tiers].sort((a, b) => a.minScore - b.minScore);
  const tier = tierFor(score, tiers);
  const nextTier = tiers.find((t) => t.minScore > score) ?? null;
  const day = dayOf();
  const board = currentBoard();

  // Prize stations number every play and log it, prize or not, so staff can
  // check any claim later in staff mode.
  let station = null;
  if (settings.prizeStation) {
    const playNumber = nextPlayNumber();
    const code = tier ? verificationCode(settings.stationSecret, { day, playNumber, score, tierId: tier.id }) : null;
    station = { name: settings.stationName, playNumber, code };
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    logPrize({ playNumber, day, time, score, tierId: tier?.id ?? null, tierName: tier?.name ?? null, code });
  }

  challengeResult = { score, day, board, qualifies: qualifies(loadLeaderboard(), score, { board, day }) };
  hideBanner();
  screen = 'prize';
  showPrize({ score, tier, nextTier, station });
  if (tier) sounds.cleared();
}

function continueAfterPrize() {
  stopPrizeClock();
  if (challengeResult?.qualifies) {
    screen = 'initials';
    askForInitials((initials) => {
      let added = null;
      if (initials) {
        const entries = addToLeaderboard({ initials, score: challengeResult.score, day: challengeResult.day, board: challengeResult.board });
        added = entries.reduce((latest, e) => (e.order > (latest?.order ?? 0) ? e : latest), null);
      }
      openLeaderboard({ highlight: added });
    });
  } else {
    openLeaderboard();
  }
}

function openLeaderboard({ highlight = null, attract: isAttract = false } = {}) {
  screen = isAttract ? 'leaderboard-attract' : 'leaderboard';
  showLeaderboard({
    entries: loadLeaderboard(),
    board: currentBoard(),
    day: dayOf(),
    subtitle: `${challengeMaze().name} · ${settings.roundSeconds}-second Challenge`,
    highlight,
    attract: isAttract,
  });
}

// -----------------------------------------------------------------------------
// Staff mode: tap the moon 5 times on the title screen, then the PIN.
// -----------------------------------------------------------------------------

let moonTaps = [];

canvas.addEventListener('pointerdown', (event) => {
  if (screen !== 'title' || !layout) return;
  const moon = moonCircle(layout);
  if (Math.hypot(event.clientX - moon.x, event.clientY - moon.y) > moon.radius) return;
  const now = performance.now();
  moonTaps = [...moonTaps.filter((t) => now - t < 3000), now];
  if (moonTaps.length >= STAFF.secretTaps) {
    moonTaps = [];
    openStaff();
  }
});

function openStaff() {
  screen = 'staff-pin';
  askForPin((pin) => {
    if (pin !== settings.pin) return false;
    screen = 'staff';
    openStaffPanel({
      settings,
      mazes,
      prizeLog: loadPrizeLog(),
      save: (updated) => {
        settings = updated;
        saveSettings(settings);
        goToTitle();
      },
    });
    return true;
  });
}

// -----------------------------------------------------------------------------
// Kiosk mode: nobody touching anything? Go back to the title. And while the
// title sits idle, take turns showing the high scores to draw people in.
// -----------------------------------------------------------------------------

const KIOSK_TITLE_SECONDS = 20;     // title, then...
const KIOSK_BOARD_SECONDS = 10;     // ...high scores, then title again
// (Includes 'pause': a game someone paused and walked away from, and
// the staff screens, so a panel left open can't be used by players.)
const kioskScreens = ['results', 'prize', 'initials', 'leaderboard', 'pause', 'staff-pin', 'staff'];

function updateKiosk() {
  if (!settings.kiosk) return;
  const idle = (performance.now() - lastInputAt) / 1000;
  if (kioskScreens.includes(screen) && idle > settings.kioskIdleSeconds) {
    lastInputAt = performance.now();
    goToTitle();
  } else if (screen === 'title' && idle > KIOSK_TITLE_SECONDS) {
    lastInputAt = performance.now();
    openLeaderboard({ attract: true });
  } else if (screen === 'leaderboard-attract' && idle > KIOSK_BOARD_SECONDS) {
    lastInputAt = performance.now();
    goToTitle();
  }
}

const noteInput = () => {
  lastInputAt = performance.now();
  // Any touch on the attract-mode high scores goes back to the title.
  if (screen === 'leaderboard-attract') goToTitle();
};
window.addEventListener('pointerdown', noteInput, true);
window.addEventListener('keydown', noteInput, true);

// Typing on the initials and PIN screens.
window.addEventListener('keydown', (event) => {
  if (screen === 'initials') handleInitialsKey(event);
  else if (screen === 'staff-pin') handlePinKey(event);
});

function toggleMute() {
  setMuted(!isMuted());
  save('muted', isMuted());
  $('mute-button').setAttribute('aria-pressed', String(isMuted()));
}

// -----------------------------------------------------------------------------
// The title screen's demo game, played by the computer.
// -----------------------------------------------------------------------------

function startAttract() {
  attract = new Game({ maze: classicMaze, mode: 'challenge', seed: 1031, roundSeconds: Infinity });
  attract.takeEvents();
}

function updateAttract(dt) {
  if (attract.phase === 'playing') attract.steer(autopilotDirection(attract));
  attract.update(dt);
  attract.takeEvents(); // the demo is silent
}

// -----------------------------------------------------------------------------
// Game events → sounds, sparks and banners
// -----------------------------------------------------------------------------

const ghostColor = Object.fromEntries(GHOSTS.map((ghost) => [ghost.id, ghost.color]));

function handleEvents(events) {
  for (const event of events) {
    const { panther } = game;
    switch (event.type) {
      case 'candy':
        sounds.candy();
        if (!reducedMotion) effects.burst(event.col, event.row, { colors: THEME.candy, count: 3, speed: 2, life: 0.25, size: 0.1 });
        break;
      case 'power':
        sounds.power();
        effects.flash(THEME.gold, 0.3);
        effects.burst(event.col, event.row, { colors: [THEME.gold, '#fff6d6'], count: 18, speed: 5 });
        effects.popup(panther.x, panther.y - 0.8, 'PANTHER POWER!', { color: THEME.gold, size: 0.8, life: 1.2 });
        break;
      case 'powerEnd':
        sounds.powerEnd();
        break;
      case 'pounce':
        sounds.pounce(event.chain);
        effects.burst(event.x, event.y, { colors: [ghostColor[event.ghost], '#ffffff', THEME.gold], count: 22, speed: 6 });
        effects.popup(event.x, event.y, event.points.toLocaleString(), { color: THEME.gold, size: 1 });
        if (event.chain >= 2) effects.popup(event.x, event.y + 0.9, `COMBO ×${event.chain}`, { color: THEME.pumpkin, size: 0.7 });
        effects.shake(0.15, 0.2);
        break;
      case 'caught':
        sounds.caught();
        effects.shake(0.35, 0.4);
        effects.flash(THEME.maroon, 0.4);
        navigator.vibrate?.(200);
        break;
      case 'ready':
        showBanner('Ready?', { seconds: 0 });
        sounds.ready();
        break;
      case 'go':
        showBanner('GO!', { seconds: 0.6, gold: true });
        sounds.go();
        break;
      case 'cleared':
        showBanner('Hall cleared!', { seconds: 1.8, gold: true });
        sounds.cleared();
        effects.flash('#ffffff', 0.3);
        break;
      case 'level':
        effects.popup(panther.x, panther.y - 1, `Level ${event.level}`, { color: '#fff6d6', size: 0.9, life: 1.4 });
        break;
      case 'treatAppears':
        sounds.treatAppears();
        effects.burst(event.col, event.row, { colors: ['#fff6d6', THEME.gold], count: 10, speed: 3, life: 0.5 });
        break;
      case 'treat':
        sounds.treat();
        effects.burst(event.col, event.row, { colors: ['#ff3355', THEME.gold, '#fff6d6'], count: 20, speed: 5 });
        effects.popup(event.col, event.row, event.points.toLocaleString(), { color: '#fff6d6', size: 0.9 });
        effects.popup(event.col, event.row + 0.9, event.name, { color: THEME.gold, size: 0.55 });
        break;
      case 'extraLife':
        sounds.extraLife();
        effects.popup(panther.x, panther.y - 1, '+1 LIFE', { color: '#7CFF6B', size: 0.9 });
        break;
      case 'over':
        if (event.reason === 'time') showBanner("Time's up!", { seconds: 0, gold: true });
        else hideBanner();
        sounds.gameOver();
        gameOverAt = performance.now();
        break;
    }
  }
}

// The Challenge clock ticks out loud for the last 10 seconds.
let lastTickSecond = null;
function tickLastSeconds() {
  if (game.mode !== 'challenge' || !game.clockRunning) return;
  const second = Math.ceil(game.timeLeft);
  if (second !== lastTickSecond && second <= 10 && second > 0) sounds.tick(second <= 3);
  lastTickSecond = second;
}

// -----------------------------------------------------------------------------
// The loop
// -----------------------------------------------------------------------------

function frame(dt, time) {
  if (screen === 'playing' && game) {
    const held = controls.heldDirection;
    if (held) game.steer(held);
    game.update(dt);
    handleEvents(game.takeEvents());
    tickLastSeconds();
    if (game && renderer.maze !== game.maze) relayout(); // a new level can mean a new maze
    // Give the caught animation a moment before the results slide in.
    if (gameOverAt && performance.now() - gameOverAt > 900) finishGame();
  } else if ((screen === 'title' || screen === 'leaderboard-attract') && attract) {
    updateAttract(dt);
  }
  updateKiosk();

  if (screen !== 'pause') effects.update(dt);
  const shown = game ?? attract;
  if (shown) {
    renderer.draw(shown, effects, time, screen === 'pause' ? 0 : dt);
    if (game) hud.update(game);
  }
}

// -----------------------------------------------------------------------------
// Buttons
// -----------------------------------------------------------------------------

// A double-tap can land on the NEXT screen's button while the old screen
// fades. Ignore taps right after a screen change, and give the prize screen
// a moment so a volunteer always gets to see it.
const TAP_GUARD_MS = 350;
const PRIZE_GUARD_MS = 1500;

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const guard = screen === 'prize' ? PRIZE_GUARD_MS : TAP_GUARD_MS;
  if (sinceScreenChange() < guard) return;
  unlock();
  sounds.tap();
  switch (button.dataset.action) {
    case 'play-challenge': startGame('challenge'); break;
    case 'play-classic': startGame('classic'); break;
    case 'play-again': startGame(game?.mode ?? 'classic'); break;
    case 'resume': resume(); break;
    case 'quit':
    case 'menu': goToTitle(); break;
    case 'show-leaderboard': openLeaderboard(); break;
    case 'prize-continue': continueAfterPrize(); break;
    case 'initials-done': submitInitials(); break;
    case 'initials-skip': skipInitials(); break;
    case 'pin-enter': submitPin(); break;
    case 'staff-reset-tonight':
      if (confirmTwice(button)) {
        resetLeaderboard({ day: dayOf() });
        showStaffMessage("Tonight's scores erased.");
      }
      break;
    case 'staff-reset-all':
      if (confirmTwice(button)) {
        resetLeaderboard();
        showStaffMessage('All scores erased.');
      }
      break;
  }
});

$('pause-button').addEventListener('click', () => pause());
$('mute-button').addEventListener('click', toggleMute);

// -----------------------------------------------------------------------------
// Go!
// -----------------------------------------------------------------------------

async function boot() {
  // Students' own character pictures, if any are set in config.js.
  for (const art of [PANTHER.art, ...GHOSTS.map((g) => g.art), ...BONUS_TREATS.treats.map((t) => t.art)]) loadSprite(art);

  setMuted(load('muted', false));
  $('mute-button').setAttribute('aria-pressed', String(isMuted()));
  setupFullscreen({ button: $('fullscreen-button'), iosHint: $('ios-hint') });
  $('how-to').innerHTML = isTouch
    ? 'Swipe or use the arrow pad. Eat all the <span class="gold">candy corn</span>. Grab a <span class="gold">golden paw</span> to pounce on the ghosts!'
    : 'Arrow keys or WASD to move. Eat all the <span class="gold">candy corn</span>. Grab a <span class="gold">golden paw</span> to pounce on the ghosts!';

  // Show maze mistakes to whoever is editing them.
  for (const maze of Object.values(mazes)) {
    for (const problem of maze.problems) console[problem.level === 'error' ? 'error' : 'warn'](problem.message);
  }
  const missing = MAZES.classic.filter((id) => !mazes[id]);
  const broken = Object.values(mazes).filter((maze) => maze.hasErrors);
  if (missing.length || broken.length) {
    showMazeProblems([
      ...missing.map((id) => ({ message: `There's no maze called "${id}" in src/mazes/index.js (it's in MAZES in config.js).` })),
      ...broken.flatMap((maze) => maze.problems.filter((problem) => problem.level === 'error')),
    ]);
    screen = 'maze-error';
    return;
  }

  // Wait (briefly) for the fonts so the title doesn't flash in a fallback font.
  await Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);

  startAttract();
  relayout();
  startLoop(frame, { onHide: pause });
  goToTitle();

  // Save the game's files on this device so it works with no internet
  // (see sw.js). Service workers only run on https:// or localhost.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Offline mode unavailable:', error));
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.pantherProwl = { get game() { return game; }, get attract() { return attract; }, mazes, get layout() { return layout; } };
  }
}

boot();
