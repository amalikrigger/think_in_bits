// Staff mode: the PIN pad and the settings panel.
//
// How staff get in: on the title screen, tap the moon 5 times quickly
// (see main.js), then type the PIN. The PIN isn't real security (the default
// is in this public repo!), it just keeps curious kids out. That's why staff
// mode shows a warning until the PIN is changed.

import { STAFF } from '../config.js';
import { showScreen } from './screens.js';

const $ = (id) => document.getElementById(id);

// -----------------------------------------------------------------------------
// PIN pad
// -----------------------------------------------------------------------------

let pin = '';
let pinCheck = null;

const pinPad = $('pin-keypad');
for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0']) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'key';
  button.dataset.key = key;
  button.textContent = key === 'back' ? '⌫' : key;
  if (key === 'back') button.setAttribute('aria-label', 'Delete');
  pinPad.append(button);
}
pinPad.addEventListener('click', (event) => {
  const key = event.target.closest('[data-key]')?.dataset.key;
  if (key) pressPinKey(key);
});

/** Show the PIN pad. `check(pin)` returns true if the PIN is right. */
export function askForPin(check) {
  pin = '';
  pinCheck = check;
  renderPin('');
  showScreen('staff-pin');
}

export function handlePinKey(event) {
  if (/^[0-9]$/.test(event.key)) pressPinKey(event.key);
  else if (event.key === 'Backspace') pressPinKey('back');
  else if (event.key === 'Enter') submitPin();
  else return false;
  event.preventDefault();
  return true;
}

export function submitPin() {
  if (!pinCheck) return;
  if (pinCheck(pin)) {
    pinCheck = null;
  } else {
    pin = '';
    renderPin('Wrong PIN');
  }
}

function pressPinKey(key) {
  pin = key === 'back' ? pin.slice(0, -1) : (pin + key).slice(0, 6);
  renderPin('');
}

function renderPin(error) {
  $('pin-dots').textContent = '●'.repeat(pin.length) || ' ';
  $('pin-error').textContent = error;
}

// -----------------------------------------------------------------------------
// Settings panel
// -----------------------------------------------------------------------------

const form = $('staff-form');
let onSave = null;

/**
 * @param settings  the current staff settings (src/storage/booth.js)
 * @param mazes     { id: Maze } (only mazes without errors can be picked)
 * @param prizeLog  the saved prize log, newest first
 * @param save      called with the updated settings when staff press Save
 */
export function openStaffPanel({ settings, mazes, prizeLog, save }) {
  onSave = save;
  $('staff-pin-warning').hidden = settings.pin !== STAFF.defaultPin;
  $('staff-error').textContent = '';

  form.prizeStation.checked = settings.prizeStation;
  form.stationName.value = settings.stationName;
  // If the saved length isn't one of the choices (someone edited config.js),
  // add it, so saving doesn't silently pick nothing.
  if (![...form.roundSeconds.options].some((option) => option.value === String(settings.roundSeconds))) {
    form.roundSeconds.add(new Option(`${settings.roundSeconds} seconds`, String(settings.roundSeconds)));
  }
  form.roundSeconds.value = String(settings.roundSeconds);
  form.kiosk.checked = settings.kiosk;
  form.kioskIdleSeconds.value = settings.kioskIdleSeconds;
  form.newPin.value = '';

  $('staff-maze').replaceChildren(
    ...Object.values(mazes)
      .filter((maze) => !maze.hasErrors)
      .map((maze) => new Option(maze.name, maze.id, false, maze.id === settings.challengeMaze)),
  );

  $('staff-tiers').replaceChildren(
    ...settings.tiers.map((tier) => {
      const label = document.createElement('label');
      label.innerHTML = `<span class="tier-swatch"></span><span class="tier-name"></span> from <input type="number" min="0" step="50" inputmode="numeric" data-tier="${tier.id}">`;
      label.querySelector('.tier-swatch').style.background = tier.color;
      label.querySelector('.tier-name').textContent = tier.name;
      label.querySelector('input').value = tier.minScore;
      return label;
    }),
  );

  renderPrizeLog(prizeLog);
  $('staff-check-play').value = '';
  $('staff-check-result').textContent = '';
  $('staff-check-play').oninput = () => checkPrize(prizeLog);

  form.dataset.settings = JSON.stringify(settings);
  showScreen('staff');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const settings = JSON.parse(form.dataset.settings);
  const error = (message) => ($('staff-error').textContent = message);

  const newPin = form.newPin.value.trim();
  if (newPin && !/^[0-9]{4,6}$/.test(newPin)) return error('The PIN must be 4 to 6 digits.');

  const tiers = settings.tiers.map((tier) => ({ ...tier, minScore: Number(form.querySelector(`[data-tier="${tier.id}"]`).value) }));
  if (tiers.some((tier) => !Number.isFinite(tier.minScore) || tier.minScore <= 0)) return error('Every prize needs a score above 0.');
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minScore <= tiers[i - 1].minScore) return error(`${tiers[i].name} must need more points than ${tiers[i - 1].name}.`);
  }

  const roundSeconds = Number(form.roundSeconds.value);
  if (!Number.isFinite(roundSeconds) || roundSeconds < 10) return error('Pick a round length.');

  const idle = Number(form.kioskIdleSeconds.value);
  onSave?.({
    ...settings,
    prizeStation: form.prizeStation.checked,
    stationName: form.stationName.value.trim().slice(0, 16) || 'Booth',
    roundSeconds,
    challengeMaze: form.challengeMaze.value,
    tiers,
    kiosk: form.kiosk.checked,
    kioskIdleSeconds: Number.isFinite(idle) ? Math.min(300, Math.max(10, idle)) : STAFF.kioskIdleSeconds,
    pin: newPin || settings.pin,
  });
});

// Dangerous buttons need two taps, so a slip of the finger can't erase the
// scoreboard. (No pop-up confirm boxes: they freeze kiosk browsers.)
export function confirmTwice(button) {
  if (button.dataset.armed === 'yes') {
    button.dataset.armed = '';
    button.textContent = button.dataset.label;
    return true;
  }
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.dataset.armed = 'yes';
  button.textContent = button.dataset.confirm;
  setTimeout(() => {
    if (button.dataset.armed === 'yes') {
      button.dataset.armed = '';
      button.textContent = button.dataset.label;
    }
  }, 4000);
  return false;
}

export function showStaffMessage(message) {
  $('staff-check-result').textContent = message;
}

function renderPrizeLog(prizeLog) {
  const list = $('staff-prize-log');
  if (prizeLog.length === 0) {
    list.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'No Challenge plays on this station yet.' }));
    return;
  }
  list.replaceChildren(...prizeLog.slice(0, 50).map((prize) => Object.assign(document.createElement('li'), { textContent: describePrize(prize) })));
}

function checkPrize(prizeLog) {
  const playNumber = Number($('staff-check-play').value);
  const prize = prizeLog.find((p) => p.playNumber === playNumber);
  $('staff-check-result').textContent = playNumber ? (prize ? describePrize(prize) : `No play #${playNumber} on this station.`) : '';
}

function describePrize(prize) {
  const tier = prize.tierName ?? 'no prize';
  const code = prize.code ? `, code ${prize.code}` : '';
  return `#${prize.playNumber} · ${prize.day} ${prize.time} · ${prize.score.toLocaleString()} · ${tier}${code}`;
}
