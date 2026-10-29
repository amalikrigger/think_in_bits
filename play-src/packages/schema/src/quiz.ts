import { z } from "zod";

// Quiz JSON v1: the single authoring format. Claude generates it from lesson material,
// the host uploads it, and the server is the only place that ever holds the answers.

export const LIMITS = {
  answersMin: 2,
  answersMax: 6,
  timeLimitMinSec: 5,
  timeLimitMaxSec: 240,
  questionsMax: 100,
  promptMaxChars: 500,
  answerMaxChars: 150,
  explanationMaxChars: 600,
  titleMaxChars: 120,
} as const;

export const POINTS_LEVELS = ["standard", "double", "none"] as const;
export const PointsLevel = z.enum(POINTS_LEVELS);
export type PointsLevel = z.infer<typeof PointsLevel>;

const timeLimitSec = z
  .number()
  .int("time limit must be a whole number of seconds")
  .min(LIMITS.timeLimitMinSec, `time limit must be at least ${LIMITS.timeLimitMinSec} seconds`)
  .max(LIMITS.timeLimitMaxSec, `time limit must be at most ${LIMITS.timeLimitMaxSec} seconds`);

export const ImageMedia = z.strictObject({
  type: z.literal("image"),
  // An https URL, or the file name of an image uploaded alongside the quiz.
  src: z.string().trim().min(1, "image src is required"),
  alt: z.string().trim().min(1, "image alt text is required, so screen readers can describe it").max(200),
});

export const CodeMedia = z.strictObject({
  type: z.literal("code"),
  language: z.string().trim().min(1).max(30),
  source: z.string().min(1, "code source is required").max(2000),
});

export const Media = z.discriminatedUnion("type", [ImageMedia, CodeMedia]);
export type Media = z.infer<typeof Media>;

export const Answer = z.strictObject({
  text: z.string().trim().min(1, "answer text is required").max(LIMITS.answerMaxChars),
  correct: z.boolean().optional(),
});
export type Answer = z.infer<typeof Answer>;

const questionCommon = {
  prompt: z.string().trim().min(1, "the question prompt is required").max(LIMITS.promptMaxChars),
  media: Media.optional(),
  timeLimitSec: timeLimitSec.optional(),
  points: PointsLevel.optional(),
  explanation: z.string().trim().max(LIMITS.explanationMaxChars).optional(),
};

const answerList = z
  .array(Answer)
  .min(LIMITS.answersMin, `needs at least ${LIMITS.answersMin} answers`)
  .max(LIMITS.answersMax, `can have at most ${LIMITS.answersMax} answers`);

const countCorrect = (answers: Answer[]) => answers.filter((a) => a.correct === true).length;

export const SingleQuestion = z
  .strictObject({ type: z.literal("single"), ...questionCommon, answers: answerList })
  .refine((q) => countCorrect(q.answers) === 1, {
    message: "single choice needs exactly one correct answer",
    path: ["answers"],
  });

export const MultiQuestion = z
  .strictObject({ type: z.literal("multi"), ...questionCommon, answers: answerList })
  .refine((q) => countCorrect(q.answers) >= 1, {
    message: "multi-select needs at least one correct answer",
    path: ["answers"],
  });

export const TrueFalseQuestion = z.strictObject({
  type: z.literal("true_false"),
  ...questionCommon,
  correct: z.boolean({ error: "true/false needs \"correct\": true or false" }),
});

export const Question = z.discriminatedUnion("type", [SingleQuestion, MultiQuestion, TrueFalseQuestion]);
export type Question = z.infer<typeof Question>;
export type QuestionType = Question["type"];

export const TeamScoring = z.enum(["average", "sum"]);

export const QuizSettings = z.strictObject({
  // After the reveal and leaderboard, advance on a timer instead of waiting for Next.
  autoplay: z.boolean().default(false),
  revealSec: z.number().int().min(2).max(60).default(6),
  leaderboardSec: z.number().int().min(2).max(60).default(6),
  // When set, replaces every question's own time limit.
  timeLimitOverrideSec: timeLimitSec.nullable().default(null),
  // Scales base points only; bonuses stay fixed so the per-question maximum stays predictable.
  pointsMultiplier: z.number().min(0).max(5).default(1),
  // Off shows only the coloured shapes on student devices; the projector shows the text.
  showAnswersOnDevice: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(false),
  shuffleAnswers: z.boolean().default(false),
  generatedNicknamesOnly: z.boolean().default(false),
  profanityFilter: z.boolean().default(true),
  lateJoin: z.boolean().default(true),
  streaks: z.boolean().default(true),
  fastestFinger: z.boolean().default(true),
  // Off by default (Amali's choice): wrong multi-select picks cost nothing.
  multiPenalty: z.boolean().default(false),
  teams: z
    .strictObject({
      enabled: z.boolean().default(false),
      size: z.number().int().min(2).max(10).default(4),
      scoring: TeamScoring.default("average"),
    })
    .prefault({}),
  lobbyCapacity: z.number().int().min(1).max(300).default(100),
  locked: z.boolean().default(false),
  sound: z.boolean().default(true),
  music: z.boolean().default(true),
  leaderboardEvery: z.number().int().min(1).max(50).default(1),
  explanationSlide: z.boolean().default(true),
});
export type QuizSettings = z.infer<typeof QuizSettings>;
export type QuizSettingsInput = z.input<typeof QuizSettings>;

// Music is a slot list for now: Amali supplies the files later.
export const QuizMusic = z.strictObject({
  lobby: z.string().trim().min(1).optional(),
  question: z.string().trim().min(1).optional(),
  podium: z.string().trim().min(1).optional(),
});

export type QuizMusic = z.infer<typeof QuizMusic>;

export const QuizDefaults = z.strictObject({
  timeLimitSec: timeLimitSec.default(20),
  points: PointsLevel.default("standard"),
});

export const Quiz = z.strictObject({
  schemaVersion: z.literal(1, { error: "schemaVersion must be 1" }),
  title: z.string().trim().min(1, "the quiz needs a title").max(LIMITS.titleMaxChars),
  description: z.string().trim().max(500).optional(),
  settings: QuizSettings.prefault({}),
  music: QuizMusic.optional(),
  defaults: QuizDefaults.prefault({}),
  questions: z
    .array(Question)
    .min(1, "the quiz needs at least one question")
    .max(LIMITS.questionsMax, `a quiz can have at most ${LIMITS.questionsMax} questions`),
});
export type Quiz = z.infer<typeof Quiz>;
export type QuizInput = z.input<typeof Quiz>;

export const defaultSettings = (): QuizSettings => QuizSettings.parse({});
