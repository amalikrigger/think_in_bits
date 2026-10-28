// Arcade-style initials entry: three letters, nothing more.
// Players are mostly kids, so we never ask for a name.
//
// Tap letters on the on-screen keypad, or type them on a keyboard.

import { LEADERBOARD } from '../config.js';
import { cleanInitials, initialsAllowed } from '../core/leaderboard.js';
import { showScreen } from './screens.js';

const $ = (id) => document.getElementById(id);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let typed = '';
let onFinish = null;

// Build the keypad once: A to Z, then a delete key.
const keypad = $('letter-keypad');
for (const letter of LETTERS) keypad.append(keyButton(letter, letter));
keypad.append(keyButton('⌫', 'back', 'Delete'));

keypad.addEventListener('click', (event) => {
  const key = event.target.closest('[data-key]')?.dataset.key;
  if (!key) return;
  if (key === 'back') removeLetter();
  else addLetter(key);
});

function keyButton(label, key, ariaLabel = label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'key';
  button.textContent = label;
  button.dataset.key = key;
  button.setAttribute('aria-label', ariaLabel);
  return button;
}

/** Open the initials screen. `finish(initials or null)` is called once. */
export function askForInitials(finish) {
  typed = '';
  onFinish = finish;
  render();
  showScreen('initials');
}

/** Keyboard typing while the initials screen is open. Returns true if used. */
export function handleInitialsKey(event) {
  if (/^[a-z]$/i.test(event.key)) addLetter(event.key.toUpperCase());
  else if (event.key === 'Backspace') removeLetter();
  else if (event.key === 'Enter') submitInitials();
  else return false;
  event.preventDefault();
  return true;
}

export function submitInitials() {
  if (!onFinish) return;
  if (!initialsAllowed(typed, LEADERBOARD.blockedInitials)) {
    $('initials-error').textContent = typed.length < 3 ? 'Pick 3 letters.' : 'Try different initials.';
    return;
  }
  finish(typed);
}

export function skipInitials() {
  if (onFinish) finish(null);
}

function finish(result) {
  const callback = onFinish;
  onFinish = null;
  callback(result);
}

function addLetter(letter) {
  typed = cleanInitials(typed + letter);
  render();
}

function removeLetter() {
  typed = typed.slice(0, -1);
  render();
}

function render() {
  $('initials-error').textContent = '';
  [...$('initials-slots').children].forEach((slot, i) => {
    slot.textContent = typed[i] ?? '';
    slot.classList.toggle('current', i === typed.length);
  });
}
