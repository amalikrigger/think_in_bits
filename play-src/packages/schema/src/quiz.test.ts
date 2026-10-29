import { describe, expect, it } from "vitest";
import { formatProblems, validateQuiz, validateQuizText, type QuizInput } from "./index";

const validQuiz = (): QuizInput => ({
  schemaVersion: 1,
  title: "1.3 Circles: warm-up",
  questions: [
    {
      type: "single",
      prompt: "Centre of $(x-2)^2+(y+3)^2=25$?",
      answers: [{ text: "(2, −3)", correct: true }, { text: "(−2, 3)" }, { text: "(2, 3)" }, { text: "(−2, −3)" }],
    },
    { type: "true_false", prompt: "A tangent meets a circle at exactly one point.", correct: true, timeLimitSec: 10 },
    {
      type: "multi",
      prompt: "Which points lie on $x^2+y^2=25$?",
      points: "double",
      answers: [{ text: "(3, 4)", correct: true }, { text: "(5, 0)", correct: true }, { text: "(4, 4)" }, { text: "(1, 1)" }],
    },
  ],
});

function problemsFor(input: unknown): string[] {
  const result = validateQuiz(input);
  if (result.ok) throw new Error("expected the quiz to be rejected");
  return formatProblems(result.problems);
}

describe("validateQuiz: accepts", () => {
  it("the v1 example from the plan and fills every default", () => {
    const result = validateQuiz(validQuiz());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quiz.defaults).toEqual({ timeLimitSec: 20, points: "standard" });
    expect(result.quiz.settings.autoplay).toBe(false);
    expect(result.quiz.settings.teams).toEqual({ enabled: false, size: 4, scoring: "average" });
  });

  it("partial settings, keeping the given values and defaulting the rest", () => {
    const result = validateQuiz({ ...validQuiz(), settings: { autoplay: true, revealSec: 4, teams: { enabled: true } } });
    expect(result.ok && result.quiz.settings).toMatchObject({
      autoplay: true,
      revealSec: 4,
      leaderboardSec: 6,
      teams: { enabled: true, size: 4 },
    });
  });

  it("image and code media", () => {
    const quiz = validQuiz();
    quiz.questions[0] = { ...quiz.questions[0]!, media: { type: "image", src: "circle.png", alt: "Circle on axes" } };
    quiz.questions[1] = { ...quiz.questions[1]!, media: { type: "code", language: "python", source: "print(2 ** 3)" } };
    expect(validateQuiz(quiz).ok).toBe(true);
  });

  it("the 2-answer and 6-answer limits and the 5 s and 240 s time limits", () => {
    const answers = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `A${i}`, correct: i === 0 }));
    for (const [count, time] of [[2, 5], [6, 240]] as const) {
      const quiz = { ...validQuiz(), questions: [{ type: "single", prompt: "p", answers: answers(count), timeLimitSec: time }] };
      expect(validateQuiz(quiz).ok).toBe(true);
    }
  });
});

describe("validateQuiz: rejects with plain-language problems", () => {
  it("a single-choice question without exactly one correct answer", () => {
    const quiz = validQuiz();
    quiz.questions[2] = { type: "single", prompt: "p", answers: [{ text: "a", correct: true }, { text: "b", correct: true }] };
    expect(problemsFor(quiz)).toContain("Question 3: single choice needs exactly one correct answer");
  });

  it("a multi-select question with no correct answers", () => {
    const quiz = validQuiz();
    quiz.questions[0] = { type: "multi", prompt: "p", answers: [{ text: "a" }, { text: "b" }] };
    expect(problemsFor(quiz)).toContain("Question 1: multi-select needs at least one correct answer");
  });

  it("too few and too many answers", () => {
    const one = { ...validQuiz(), questions: [{ type: "single", prompt: "p", answers: [{ text: "a", correct: true }] }] };
    expect(problemsFor(one)).toContain("Question 1: needs at least 2 answers");
    const seven = Array.from({ length: 7 }, (_, i) => ({ text: `${i}`, correct: i === 0 }));
    expect(problemsFor({ ...validQuiz(), questions: [{ type: "single", prompt: "p", answers: seven }] })).toContain(
      "Question 1: can have at most 6 answers",
    );
  });

  it("true/false without a boolean", () => {
    expect(problemsFor({ ...validQuiz(), questions: [{ type: "true_false", prompt: "p" }] })).toContain(
      'Question 1: true/false needs "correct": true or false',
    );
    expect(problemsFor({ ...validQuiz(), questions: [{ type: "true_false", prompt: "p", correct: "yes" }] })).toContain(
      'Question 1: true/false needs "correct": true or false',
    );
  });

  it("time limits outside 5–240 seconds", () => {
    const quiz = validQuiz();
    quiz.questions[1] = { type: "true_false", prompt: "p", correct: true, timeLimitSec: 4 };
    expect(problemsFor(quiz)).toContain("Question 2: time limit must be at least 5 seconds");
    quiz.questions[1] = { type: "true_false", prompt: "p", correct: true, timeLimitSec: 241 };
    expect(problemsFor(quiz)).toContain("Question 2: time limit must be at most 240 seconds");
  });

  it("an unknown question type", () => {
    expect(problemsFor({ ...validQuiz(), questions: [{ type: "essay", prompt: "p" }] })).toContain(
      'Question 1: type must be one of "single", "multi" or "true_false"',
    );
  });

  it("misspelled fields, which an LLM sometimes produces", () => {
    const quiz = { ...validQuiz(), questions: [{ type: "true_false", prompt: "p", correct: true, explaination: "x" }] };
    expect(problemsFor(quiz)).toContain('Question 1: unknown field "explaination"');
  });

  it("an empty answer, pointing at the answer number", () => {
    const quiz = validQuiz();
    quiz.questions[0] = { type: "single", prompt: "p", answers: [{ text: "a", correct: true }, { text: "  " }] };
    expect(problemsFor(quiz)).toContain("Question 1, answer 2: answer text is required");
  });

  it("an image without alt text", () => {
    const quiz = validQuiz();
    quiz.questions[0] = { ...quiz.questions[0]!, media: { type: "image", src: "x.png" } as never };
    expect(problemsFor(quiz)).toContain("Question 1: image alt text is missing");
  });

  it("a missing title, a wrong schema version and no questions", () => {
    const problems = problemsFor({ schemaVersion: 2, questions: [] });
    expect(problems).toEqual(
      expect.arrayContaining([
        'Quiz: "schemaVersion" must be 1',
        'Quiz: "title" is missing',
        "Quiz: the quiz needs at least one question",
      ]),
    );
  });

  it("text that is not JSON", () => {
    const result = validateQuizText("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]!.message).toMatch(/^this is not valid JSON/);
  });
});

describe("committed samples", () => {
  it("all validate, so the practice quizzes on the upload screen always load", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const dir = new URL("../../../samples/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const result = validateQuizText(readFileSync(new URL(file, dir), "utf8"));
      expect(result.ok ? [] : formatProblems(result.problems), file).toEqual([]);
    }
  });
});
