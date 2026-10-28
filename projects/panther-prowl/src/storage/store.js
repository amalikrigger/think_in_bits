// Saves things on this device (best scores, settings) with localStorage.
//
// localStorage can fail: private browsing, storage turned off, or a full
// disk. If it does, the game keeps working with an in-memory copy for the
// current visit, and nothing crashes.
//
// Privacy rule: never save names, emails or anything personal here. Most
// players are kids. Three-letter initials and scores only.

const PREFIX = 'pantherProwl.v1.';
const memory = new Map();

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    // Unreadable or blocked storage: fall through to memory.
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

export function save(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: the in-memory copy still works for this visit.
  }
}

export function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to do.
  }
}
