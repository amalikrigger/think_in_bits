// The high-score screen: "Tonight" and "All time" tabs, top 10 each.

import { LEADERBOARD } from '../config.js';
import { topScores } from '../core/leaderboard.js';
import { showScreen } from './screens.js';

const $ = (id) => document.getElementById(id);

let current = null; // what's being shown, so the tabs can switch

/**
 * @param entries    all saved leaderboard entries
 * @param board      which board (maze + round length) to show
 * @param day        today's date, for the "Tonight" tab
 * @param subtitle   e.g. "Haunted Halls · 90-second Challenge"
 * @param highlight  the entry just added, to make it stand out (optional)
 * @param attract    true when kiosk mode shows the board on its own (no buttons)
 */
export function showLeaderboard({ entries, board, day, subtitle, highlight = null, attract = false }) {
  current = { entries, board, day, highlight, tab: 'tonight' };
  $('board-sub').textContent = subtitle;
  $('board-menu').hidden = attract;
  render();
  showScreen('leaderboard');
}

document.querySelectorAll('[data-board-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    if (!current) return;
    current.tab = tab.dataset.boardTab;
    render();
  });
});

function render() {
  const { entries, board, day, highlight, tab } = current;
  document.querySelectorAll('[data-board-tab]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.boardTab === tab));
  });

  const scores = topScores(entries, { board, day: tab === 'tonight' ? day : null, size: LEADERBOARD.size });
  const list = $('board-list');
  if (scores.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'board-empty';
    empty.textContent = 'No scores yet. Be the first!';
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...scores.map((entry, index) => {
      const row = document.createElement('li');
      row.classList.toggle('mine', highlight !== null && entry.order === highlight.order);
      row.innerHTML = `<span class="rank">${index + 1}</span><span class="initials"></span><span class="score"></span>`;
      row.querySelector('.initials').textContent = entry.initials;
      row.querySelector('.score').textContent = entry.score.toLocaleString();
      return row;
    }),
  );
}
