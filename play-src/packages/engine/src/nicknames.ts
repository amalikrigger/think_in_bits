import { NICKNAME_MAX_CHARS, type JoinRejection } from "@bitblitz/schema";
import { seededRandom } from "./random";

// Nickname rules. Real names never reach the cloud by design, but students will still
// try rude ones, so the filter is on by default.

// Normalised (lower-case, leetspeak undone, letters only) roots that are blocked anywhere
// in a nickname. Kept short on purpose: false positives just mean "pick another name".
const BLOCKED_ROOTS = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "penis", "vagina", "boob",
  "slut", "whore", "fag", "nigg", "nigr", "retard", "rape", "porn", "sex", "nazi",
  "hitler", "wank", "twat", "bollock", "arse", "asshole", "bastard", "piss", "killyourself",
];

// Innocent words that contain a blocked root ("grape" contains "rape"); removed before matching.
const SAFE_WORDS = [
  "grape", "drape", "scrape", "trapeze", "parse", "sparse", "parsec", "peacock", "hancock",
  "essex", "sussex", "dickens", "cockatoo", "cockatiel", "scunthorpe",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i" };

export function normaliseForFilter(nickname: string): string {
  return [...nickname.toLowerCase()]
    .map((ch) => LEET[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[^a-z]/g, "");
}

export function isInappropriate(nickname: string): boolean {
  let normalised = normaliseForFilter(nickname);
  for (const word of SAFE_WORDS) normalised = normalised.replaceAll(word, "");
  return BLOCKED_ROOTS.some((root) => normalised.includes(root));
}

/** Trim and collapse inner whitespace; control characters are dropped. */
export function cleanNickname(raw: string): string {
  return raw.replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim();
}

export function sameNickname(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; reason: JoinRejection };

export function checkNickname(raw: string, taken: readonly string[], profanityFilter: boolean): NicknameCheck {
  const nickname = cleanNickname(raw);
  if (nickname.length < 1 || [...nickname].length > NICKNAME_MAX_CHARS) return { ok: false, reason: "nickname_invalid" };
  if (profanityFilter && isInappropriate(nickname)) return { ok: false, reason: "nickname_inappropriate" };
  if (taken.some((t) => sameNickname(t, nickname))) return { ok: false, reason: "nickname_taken" };
  return { ok: true, nickname };
}

const ADJECTIVES = [
  "Turbo", "Pixel", "Cosmic", "Quantum", "Neon", "Swift", "Binary", "Laser", "Sonic", "Hyper",
  "Rapid", "Electric", "Lucky", "Mighty", "Clever", "Brave", "Atomic", "Solar", "Lunar", "Crystal",
];
const NOUNS = [
  "Byte", "Comet", "Falcon", "Otter", "Panda", "Rocket", "Tiger", "Vector", "Photon", "Circuit",
  "Gecko", "Nova", "Koala", "Orbit", "Raptor", "Prism", "Lynx", "Matrix", "Phoenix", "Quasar",
];

/** A friendly unique name for "generated nicknames only" mode. */
export function generateNickname(seed: number, joinSeq: number, taken: readonly string[]): string {
  const random = seededRandom(seed ^ Math.imul(joinSeq + 1, 0x9e3779b1));
  for (let attempt = 0; attempt < 20; attempt++) {
    const name = `${ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(random() * NOUNS.length)]}`;
    if (!taken.some((t) => sameNickname(t, name))) return name;
  }
  // 400 combinations; past that, a number keeps it unique.
  return `Player ${joinSeq + 1}`;
}
