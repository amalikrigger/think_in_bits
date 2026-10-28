// The prize screen at the end of a Boo Bash Challenge.
//
// It's built for a busy volunteer to check at a glance: a big medal in the
// tier's color, the tier name, the score, and (on prize stations) the
// station, play number, a ticking clock and the prize code.

import { showScreen } from './screens.js';

const $ = (id) => document.getElementById(id);
let clockTimer = null;

/**
 * @param result {
 *   score, tier (or null), nextTier (or null),
 *   station: { name, playNumber, code } or null when this isn't a prize station
 * }
 */
export function showPrize({ score, tier, nextTier, station }) {
  const panel = $('prize-panel');
  panel.style.setProperty('--tier-color', tier?.color ?? '#58595B');
  panel.classList.toggle('no-tier', !tier);

  $('prize-tier').textContent = tier ? tier.name : 'No prize this time';
  $('prize-score').textContent = score.toLocaleString();
  $('prize-badge').hidden = !tier;

  let note;
  if (tier && station) note = 'Show this screen to a Boo Bash volunteer!';
  else if (tier) note = `You'd win the ${tier.name}! Prizes are won at the Boo Bash booth.`;
  else note = '';
  if (nextTier) note += `${note ? ' ' : ''}${(nextTier.minScore - score).toLocaleString()} more points for ${nextTier.name}.`;
  $('prize-note').textContent = note;

  // Station details: only on prize stations.
  $('prize-station').textContent = station ? station.name : '';
  $('prize-play').textContent = station ? `Play #${station.playNumber}` : '';
  $('prize-code-row').hidden = !(station && tier);
  $('prize-code').textContent = station?.code ?? '';
  document.querySelector('#screen-prize .live-clock').hidden = !station;

  tickClock();
  clearInterval(clockTimer);
  clockTimer = setInterval(tickClock, 250);
  showScreen('prize');
}

export function stopPrizeClock() {
  clearInterval(clockTimer);
}

function tickClock() {
  $('prize-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}
