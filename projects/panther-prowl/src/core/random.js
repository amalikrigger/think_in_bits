// A "seeded" random number generator.
//
// Math.random() gives different numbers every time. This one gives the SAME
// list of numbers every time you start it with the same seed. That's what
// makes every Boo Bash Challenge play fair: same maze, same ghost decisions,
// so the only difference between two players is how they play.
//
// The algorithm is "mulberry32", a tiny, well-known generator. It is fine
// for games but NOT for anything secret (like passwords).

export function createRandom(seed = 1) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // a number from 0 up to (not including) 1
  };
}

/** Pick one item from a list using a random() function. */
export function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}
