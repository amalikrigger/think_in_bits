import { z } from "zod";
import { Media, PointsLevel, QuizSettings, type QuizSettings as QuizSettingsType } from "./quiz";

// WebSocket contract shared by the Durable Object and the web app.
// Client messages are validated at runtime on the server; server messages are typed here
// and the web app trusts them because the server is the authority.

export const NICKNAME_MAX_CHARS = 20;

export const Nickname = z
  .string()
  .trim()
  .min(1, "pick a nickname")
  .max(NICKNAME_MAX_CHARS, `nicknames are at most ${NICKNAME_MAX_CHARS} characters`);

// ---------- client → server ----------

const settingsPatchShape = Object.fromEntries(
  Object.entries(QuizSettings.shape).map(([key, schema]) => [key, schema.unwrap().optional()]),
);
// Every field optional and without defaults, so a patch only changes what it names.
export const SettingsPatch = z.object(settingsPatchShape).strict() as unknown as z.ZodType<Partial<QuizSettingsType>>;
export type SettingsPatch = Partial<QuizSettingsType>;

export const HostCommand = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start") }),
  z.object({ kind: z.literal("next") }),
  z.object({ kind: z.literal("pause") }),
  z.object({ kind: z.literal("resume") }),
  z.object({ kind: z.literal("skip") }),
  z.object({ kind: z.literal("end") }),
  z.object({ kind: z.literal("reveal_now") }),
  z.object({ kind: z.literal("kick"), playerId: z.string().min(1) }),
  z.object({ kind: z.literal("rename"), playerId: z.string().min(1), nickname: Nickname }),
  z.object({ kind: z.literal("lock"), locked: z.boolean() }),
  z.object({ kind: z.literal("update_settings"), patch: SettingsPatch }),
]);
export type HostCommand = z.infer<typeof HostCommand>;
export type HostCommandKind = HostCommand["kind"];

export const ClientMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), nickname: z.string().max(100) }),
  z.object({ type: z.literal("resume"), token: z.string().min(1).max(200) }),
  z.object({
    type: z.literal("answer"),
    questionIndex: z.number().int().min(0),
    choice: z.array(z.number().int().min(0).max(9)).min(1).max(6),
  }),
  z.object({ type: z.literal("pong"), id: z.number().int() }),
  z.object({ type: z.literal("host_auth"), key: z.string().min(1).max(200) }),
  z.object({ type: z.literal("command"), command: HostCommand }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

// ---------- server → client ----------

export const PHASES = ["lobby", "countdown", "question", "reveal", "leaderboard", "podium", "ended"] as const;
export type Phase = (typeof PHASES)[number];

export type AnswerRejection = "too_late" | "already_answered" | "not_accepting" | "invalid_choice";
export type JoinRejection =
  | "room_locked"
  | "room_full"
  | "game_started"
  | "game_over"
  | "nickname_invalid"
  | "nickname_taken"
  | "nickname_inappropriate"
  | "unknown_token"
  | "kicked";
export type CommandRejection = "not_allowed_in_phase" | "unknown_player" | "nickname_taken" | "invalid_settings";

/** A question as players and the projector see it: never carries answer data. */
export type PublicQuestion = {
  index: number;
  total: number;
  type: "single" | "multi" | "true_false";
  prompt: string;
  media: Media | null;
  /** `text` is null when the host hides answer text on student devices (shapes only). */
  answers: { text: string | null }[];
  timeLimitMs: number;
  points: PointsLevel;
};

export type Timer = { msRemaining: number; totalMs: number };

export type Reveal = {
  correct: number[];
  counts: number[];
  explanation: string | null;
};

export type LeaderboardEntry = {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  previousRank: number | null;
  team: string | null;
};

export type TeamEntry = { team: string; score: number; members: number; rank: number };

export type PointsBreakdown = { speed: number; first: number; streak: number; total: number };

export type PlayerResult = {
  outcome: "correct" | "partial" | "wrong" | "no_answer" | "skipped";
  points: PointsBreakdown;
  fastestPlace: 1 | 2 | 3 | null;
  streak: number;
  score: number;
  rank: number;
  behind: { nickname: string; points: number } | null;
};

export type QuestionReview = {
  index: number;
  prompt: string;
  type: PublicQuestion["type"];
  correctRate: number;
  answeredRate: number;
  skipped: boolean;
};

export type LobbyPlayer = {
  id: string;
  nickname: string;
  connected: boolean;
  score: number;
  team: string | null;
};

export type HostView = {
  role: "host";
  code: string;
  phase: Phase;
  title: string;
  questionCount: number;
  settings: QuizSettingsType;
  paused: boolean;
  players: LobbyPlayer[];
  timer: Timer | null;
  question: PublicQuestion | null;
  answered: { count: number; total: number } | null;
  reveal: Reveal | null;
  leaderboard: LeaderboardEntry[] | null;
  teams: TeamEntry[] | null;
  podium: LeaderboardEntry[] | null;
  review: QuestionReview[] | null;
  hasMoreQuestions: boolean;
};

export type PlayerView = {
  role: "player";
  phase: Phase;
  playerId: string;
  nickname: string;
  team: string | null;
  score: number;
  paused: boolean;
  timer: Timer | null;
  question: PublicQuestion | null;
  /** This player's own submitted choice for the open question. */
  answer: number[] | null;
  result: PlayerResult | null;
  /** Only shown once a question has been scored. */
  rank: number | null;
  playerCount: number;
  showAnswersOnDevice: boolean;
};

export type ServerMessage =
  | { type: "welcome"; playerId: string; token: string; nickname: string }
  | { type: "host_welcome"; code: string }
  | { type: "view"; view: HostView | PlayerView }
  | { type: "answer_ack"; questionIndex: number; accepted: true }
  | { type: "answer_ack"; questionIndex: number; accepted: false; reason: AnswerRejection }
  | { type: "answer_progress"; count: number; total: number }
  | { type: "join_rejected"; reason: JoinRejection }
  | { type: "command_rejected"; command: HostCommandKind; reason: CommandRejection }
  | { type: "kicked" }
  | { type: "ping"; id: number }
  | { type: "error"; code: "bad_message" | "auth_failed" | "not_authenticated" | "game_not_found"; message: string };

/** Plain-language text for every rejection, shared so server logs and UI agree. */
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
  unknown_player: "That player isn't in the game.",
  invalid_settings: "Those settings aren't valid.",
};
