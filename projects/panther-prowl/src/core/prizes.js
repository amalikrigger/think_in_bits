// Prize tiers and verification codes for the Boo Bash Challenge.
//
// Why a code? At the booth a volunteer hands out prizes by looking at the
// prize screen. A kid could show a screenshot of someone else's win, so the
// prize screen shows things a screenshot can't fake:
//   - a clock that ticks (a screenshot shows an old time),
//   - the play number on this device (each play gets the next number),
//   - a short code made from a secret only this device knows, the play
//     number, the score and the tier. Staff can look a code up in the prize
//     log (staff mode) to check it really came from this device.
//
// The code is a "hash": a function that scrambles text into a number. The
// same input always gives the same code, but you can't work backwards from
// a code, and changing one digit of the score changes the whole code.

/** The best tier this score reaches, or null if it reaches none. */
export function tierFor(score, tiers) {
  let best = null;
  for (const tier of tiers) {
    if (score >= tier.minScore && (!best || tier.minScore > best.minScore)) best = tier;
  }
  return best;
}

// Letters and digits that are hard to mix up when read out loud or squinted
// at (no 0/O, 1/I/L, 2/Z, 5/S, 8/B).
const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

/**
 * A 4-character code for one prize.
 * @param secret  this station's private random secret (set up in staff mode)
 * @param prize   { day: 'YYYY-MM-DD', playNumber, score, tierId }
 */
export function verificationCode(secret, { day, playNumber, score, tierId }) {
  let hash = fnv1a(`${secret}|${day}|${playNumber}|${score}|${tierId}`);
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[hash % CODE_ALPHABET.length];
    hash = Math.floor(hash / CODE_ALPHABET.length);
  }
  return code;
}

// FNV-1a: a tiny, well-known hash function. Fine for codes like this one,
// NOT for passwords or real security.
function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** A random secret for a new prize station. */
export function newStationSecret(random = Math.random) {
  let secret = '';
  for (let i = 0; i < 16; i++) secret += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return secret;
}
