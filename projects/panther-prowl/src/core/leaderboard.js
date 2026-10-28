// The high-score table, as plain data and rules (saving it is done in
// src/storage/). No names, ever: just 3-letter initials, the score, the day,
// and the round settings, so we only ever compare fair games with each other.
//
// An entry looks like:
//   { initials: 'AMK', score: 2450, day: '2026-10-30', board: 'haunted-halls/90' }

const MAX_KEPT = 100; // plenty for one event night; older low scores fall off

/**
 * Which "board" a game belongs to. Games with a different maze or round
 * length aren't fair to compare, so they go on separate boards.
 */
export function boardKey({ mazeId, roundSeconds }) {
  return `${mazeId}/${roundSeconds}`;
}

/** The top `size` entries for one board, optionally for one day only. */
export function topScores(entries, { board, day = null, size = 10 }) {
  return entries
    .filter((entry) => entry.board === board && (day === null || entry.day === day))
    .sort((a, b) => b.score - a.score || a.order - b.order) // ties: whoever got it first
    .slice(0, size);
}

/** Would this score make it onto the all-time or today's top list? */
export function qualifies(entries, score, { board, day, size = 10 }) {
  if (score <= 0) return false;
  for (const list of [topScores(entries, { board, size }), topScores(entries, { board, day, size })]) {
    if (list.length < size || score > list[list.length - 1].score) return true;
  }
  return false;
}

/** Add an entry and return the new list (the old list isn't changed). */
export function addEntry(entries, entry) {
  const order = entries.reduce((max, e) => Math.max(max, e.order ?? 0), 0) + 1;
  const updated = [...entries, { ...entry, order }];
  if (updated.length <= MAX_KEPT) return updated;

  // Too many: keep everything that's in some board's all-time or daily top
  // 10, then the highest of the rest.
  const keep = new Set();
  const boards = new Set(updated.map((e) => e.board));
  const days = new Set(updated.map((e) => e.day));
  for (const board of boards) {
    for (const e of topScores(updated, { board })) keep.add(e);
    for (const day of days) for (const e of topScores(updated, { board, day })) keep.add(e);
  }
  const rest = updated.filter((e) => !keep.has(e)).sort((a, b) => b.score - a.score);
  return [...keep, ...rest].slice(0, MAX_KEPT);
}

/** Clean up typed initials: letters only, uppercase, at most 3. */
export function cleanInitials(text) {
  return String(text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

/** Are these initials allowed? Must be exactly 3 letters and not on the blocked list. */
export function initialsAllowed(initials, blocked) {
  return /^[A-Z]{3}$/.test(initials) && !blocked.includes(initials);
}

/** Today's date as 'YYYY-MM-DD' in the device's own time zone. */
export function dayOf(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
