// Everything the booth needs to remember on this device: staff settings,
// the leaderboard, the play counter and the prize log.
//
// Staff settings start from the defaults in config.js. Once staff change a
// setting in staff mode, the saved value wins on this device.

import { MODES, MAZES, PRIZE_TIERS, STAFF } from '../config.js';
import { load, save, remove } from './store.js';
import { addEntry } from '../core/leaderboard.js';
import { newStationSecret } from '../core/prizes.js';

// ---------------------------------------------------------------------------
// Staff settings
// ---------------------------------------------------------------------------

function defaults() {
  return {
    pin: STAFF.defaultPin,
    roundSeconds: MODES.challenge.roundSeconds,
    challengeMaze: MAZES.challenge,
    tiers: PRIZE_TIERS.map((tier) => ({ ...tier })),
    prizeStation: false,   // only prize stations show prize screens
    stationName: 'Booth A',
    stationSecret: null,   // made the first time this becomes a prize station
    kiosk: false,
    kioskIdleSeconds: STAFF.kioskIdleSeconds,
  };
}

export function loadSettings() {
  const saved = load('settings', {});
  const settings = { ...defaults(), ...saved };
  // A broken saved value must never break the game: fall back to the default.
  if (!Number.isFinite(settings.roundSeconds) || settings.roundSeconds < 10) settings.roundSeconds = defaults().roundSeconds;
  if (!Number.isFinite(settings.kioskIdleSeconds) || settings.kioskIdleSeconds < 10) settings.kioskIdleSeconds = defaults().kioskIdleSeconds;
  // Keep tier names and colors from config.js; only the thresholds are staff's.
  settings.tiers = PRIZE_TIERS.map((tier) => {
    const savedTier = (saved.tiers ?? []).find((t) => t.id === tier.id);
    return { ...tier, minScore: Number.isFinite(savedTier?.minScore) ? savedTier.minScore : tier.minScore };
  });
  return settings;
}

export function saveSettings(settings) {
  if (settings.prizeStation && !settings.stationSecret) settings.stationSecret = newStationSecret();
  save('settings', settings);
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export const loadLeaderboard = () => load('leaderboard', []);

export function addToLeaderboard(entry) {
  const updated = addEntry(loadLeaderboard(), entry);
  save('leaderboard', updated);
  return updated;
}

/** Remove scores. `day` given: only that day's. Otherwise: everything. */
export function resetLeaderboard({ day = null } = {}) {
  if (day === null) {
    remove('leaderboard');
  } else {
    save('leaderboard', loadLeaderboard().filter((entry) => entry.day !== day));
  }
}

// ---------------------------------------------------------------------------
// Play counter and prize log (prize stations only)
// ---------------------------------------------------------------------------

/** The next Challenge play number on this device: 1, 2, 3... */
export function nextPlayNumber() {
  const number = load('playCount', 0) + 1;
  save('playCount', number);
  return number;
}

const PRIZE_LOG_SIZE = 300; // a whole event night at a busy booth

export const loadPrizeLog = () => load('prizeLog', []);

export function logPrize(prize) {
  const log = [prize, ...loadPrizeLog()].slice(0, PRIZE_LOG_SIZE);
  save('prizeLog', log);
}
