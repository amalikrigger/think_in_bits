// Switching between the menu screens (title, pause, results...) and showing
// the big "Ready?" / "GO!" banner over the maze.

const $ = (id) => document.getElementById(id);

const SCREENS = ['loading', 'title', 'pause', 'results', 'prize', 'initials', 'leaderboard', 'staff-pin', 'staff', 'maze-error'];

/** Show one screen and hide the others. 'playing' hides them all. */
let shownAt = 0;

/** Milliseconds since the last screen change (main.js ignores taps that come too soon). */
export const sinceScreenChange = () => performance.now() - shownAt;

export function showScreen(name) {
  for (const screen of SCREENS) {
    $(`screen-${screen}`).classList.toggle('active', screen === name);
  }
  document.body.dataset.screen = name;
  shownAt = performance.now();
  // The button that started the game must not keep focus, or Space/Enter
  // during play could press it again while it fades out.
  if (name === 'playing') document.activeElement?.blur?.();
  $('hud').hidden = !(name === 'playing' || name === 'pause');

  // With a keyboard, move focus to the first button so Enter/Space works
  // right away. (On touch screens that would just draw a focus ring.)
  // (Not on the prize screen: a stray Enter would skip past it before a
  // volunteer has seen it.)
  const firstButton = document.querySelector(`#screen-${name} button`);
  const hasKeyboard = window.matchMedia?.('(pointer: fine)').matches;
  if (firstButton && hasKeyboard && name !== 'prize') setTimeout(() => firstButton.focus({ preventScroll: true }), 50);
}

let bannerTimer = null;

/** Big text over the maze. `seconds` = how long before it fades (0 = stays). */
export function showBanner(text, { seconds = 1.2, gold = false } = {}) {
  const banner = $('banner');
  banner.textContent = text;
  banner.classList.toggle('gold', gold);
  banner.classList.add('show');
  clearTimeout(bannerTimer);
  if (seconds > 0) bannerTimer = setTimeout(hideBanner, seconds * 1000);
}

export function hideBanner() {
  $('banner').classList.remove('show');
}

/** The results screen at the end of a game. */
export function showResults({ title, score, isNewBest, stats }) {
  $('results-title').textContent = title;
  $('results-score').textContent = score.toLocaleString();
  $('results-new-best').hidden = !isNewBest;
  $('results-stats').replaceChildren(
    ...stats.map(([label, value]) => {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      item.append(term, detail);
      return item;
    }),
  );
  showScreen('results');
}

/** Lists what's wrong with a maze file, so a student can fix it. */
export function showMazeProblems(problems) {
  $('problem-list').replaceChildren(
    ...problems.map((problem) => {
      const item = document.createElement('li');
      item.textContent = problem.message;
      return item;
    }),
  );
  showScreen('maze-error');
}
