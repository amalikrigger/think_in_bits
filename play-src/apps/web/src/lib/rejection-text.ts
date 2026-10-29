import type { AnswerRejection, CommandRejection, JoinRejection } from "@bitblitz/schema";

// The player screens import this copy instead of `REJECTION_TEXT` from @bitblitz/schema:
// that package's entry point pulls in zod (87 KB) for the host's quiz validation, and a
// student's phone has no use for it. The type annotation fails the build if a rejection
// code is added or removed, and rejection-text.test.ts fails if any wording drifts from
// the schema's table, which stays the single source of truth.

export const NICKNAME_MAX_CHARS = 20;

export const REJECTION_TEXT: Record<AnswerRejection | JoinRejection | CommandRejection, string> = {
  too_late: "Time was up before your answer arrived.",
  already_answered: "You already answered this question.",
  not_accepting: "Answers aren't open right now.",
  invalid_choice: "That choice isn't one of the answers.",
  room_locked: "The teacher has locked this game.",
  room_full: "This game is full.",
  game_started: "This game has already started and late joining is off.",
  game_over: "This game has finished.",
  nickname_invalid: "Pick a nickname between 1 and 20 characters.",
  nickname_taken: "Someone already has that nickname. Try another.",
  nickname_inappropriate: "Please pick a different nickname.",
  unknown_token: "We couldn't find your place in this game. Join again.",
  kicked: "You were removed from this game.",
  not_allowed_in_phase: "That can't be done right now.",
  no_players: "Wait for at least one player to join.",
  unknown_player: "That player isn't in the game.",
  invalid_settings: "Those settings aren't valid.",
};
