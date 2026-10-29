import type {
  HostCommand,
  Media,
  Phase,
  PointsLevel,
  QuestionType,
  Quiz,
  QuizSettings,
  ServerMessage,
} from "@bitblitz/schema";
import type { QuestionScore } from "./scoring";

// The whole game is one JSON-serialisable value, so the Durable Object can persist it
// after every step and resume after eviction or a deploy.

export const COUNTDOWN_MS = 3000;
export const RTT_SAMPLES_KEPT = 5;
export const TEAM_NAMES = ["Cyan", "Coral", "Teal", "Violet", "Amber", "Pink", "Indigo", "Lime", "Rose", "Sky"];

export type PlayerState = {
  id: string;
  nickname: string;
  /** Secret issued on join; presenting it again resumes this player (reconnect). */
  token: string;
  joinSeq: number;
  connected: boolean;
  score: number;
  /** Run of exactly-right answers. */
  streak: number;
  /** Sum of fair response times (time limit for a missed question); breaks score ties. */
  totalResponseMs: number;
  correctCount: number;
  rttSamplesMs: number[];
  team: string | null;
  rank: number | null;
  previousRank: number | null;
};

/** A question as it will be played: shuffles applied, defaults resolved, answers included. */
export type PlannedQuestion = {
  sourceIndex: number;
  type: QuestionType;
  prompt: string;
  media: Media | null;
  answers: string[];
  correct: number[];
  timeLimitMs: number;
  points: PointsLevel;
  explanation: string | null;
};

export type SubmittedAnswer = {
  choice: number[];
  receivedAt: number;
  responseMs: number;
};

export type OpenQuestion = {
  index: number;
  /** Shifted forward by any pause, so response times exclude paused time. */
  openedAt: number;
  answers: Record<string, SubmittedAnswer>;
};

export type QuestionRecord = {
  index: number;
  skipped: boolean;
  /** How many players picked each answer slot. */
  counts: number[];
  results: Record<string, QuestionScore>;
};

export type GameState = {
  code: string;
  seed: number;
  quiz: Quiz;
  settings: QuizSettings;
  phase: Phase;
  /** Built when the game starts, because shuffle settings can change in the lobby. */
  plan: PlannedQuestion[];
  /** Index into plan of the current (or last) question; -1 before the first. */
  questionIndex: number;
  players: Record<string, PlayerState>;
  nextJoinSeq: number;
  bannedTokens: string[];
  /** Absolute time the current phase's timer fires; null when waiting on the teacher. */
  timer: { at: number; totalMs: number } | null;
  paused: { at: number; remainingMs: number | null } | null;
  open: OpenQuestion | null;
  records: QuestionRecord[];
};

export type EngineEvent =
  | { type: "join"; connectionId: string; nickname: string; token: string }
  | { type: "resume"; connectionId: string; token: string }
  | { type: "disconnect"; playerId: string }
  | { type: "answer"; playerId: string; questionIndex: number; choice: number[] }
  | { type: "latency"; playerId: string; rttMs: number }
  | { type: "host_connected" }
  | { type: "host_command"; command: HostCommand }
  | { type: "tick" };

export type Recipient =
  | { kind: "host" }
  | { kind: "player"; playerId: string }
  | { kind: "connection"; connectionId: string };

export type OutgoingMessage = { to: Recipient; message: ServerMessage };

export type StepResult = { state: GameState; messages: OutgoingMessage[] };
