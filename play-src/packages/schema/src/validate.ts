import type { z } from "zod";
import { Quiz } from "./quiz";

// Turns Zod issues into sentences a teacher can act on, e.g.
// "Question 3: single choice needs exactly one correct answer".

export type QuizProblem = { where: string; message: string };

export type QuizValidation =
  | { ok: true; quiz: Quiz }
  | { ok: false; problems: QuizProblem[] };

export function validateQuiz(input: unknown): QuizValidation {
  const result = Quiz.safeParse(input);
  if (result.success) return { ok: true, quiz: result.data };
  return { ok: false, problems: result.error.issues.map(describeIssue) };
}

export function validateQuizText(text: string): QuizValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, problems: [{ where: "File", message: `this is not valid JSON (${detail})` }] };
  }
  return validateQuiz(parsed);
}

export function formatProblems(problems: QuizProblem[]): string[] {
  return problems.map((p) => `${p.where}: ${p.message}`);
}

type Issue = z.core.$ZodIssue;

function describeIssue(issue: Issue): QuizProblem {
  return { where: describePath(issue.path), message: describeMessage(issue) };
}

const FIELD_NAMES: Record<string, string> = {
  prompt: "prompt",
  answers: "answers",
  text: "text",
  correct: "\"correct\"",
  timeLimitSec: "time limit",
  points: "points",
  media: "media",
  src: "image src",
  alt: "image alt text",
  explanation: "explanation",
  type: "type",
};

function describePath(path: PropertyKey[]): string {
  if (path.length === 0) return "Quiz";
  const [head, index, ...rest] = path;
  if (head === "questions" && typeof index === "number") {
    let where = `Question ${index + 1}`;
    const [field, answerIndex] = rest;
    if (field === "answers" && typeof answerIndex === "number") where += `, answer ${answerIndex + 1}`;
    return where;
  }
  if (head === "settings") return `Settings (${path.slice(1).join(".") || "all"})`;
  if (path.length === 1) return "Quiz";
  return `Quiz (${path.join(".")})`;
}

function fieldLabel(path: PropertyKey[]): string {
  const last = [...path].reverse().find((p) => typeof p === "string");
  return typeof last === "string" ? (FIELD_NAMES[last] ?? `"${last}"`) : "value";
}

function describeMessage(issue: Issue): string {
  const field = fieldLabel(issue.path);
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined && issue.path.at(-1) === "correct") {
        return `true/false needs "correct": true or false`;
      }
      if (issue.input === undefined) return `${field} is missing`;
      return `${field} should be ${article(issue.expected)}, not ${typeName(issue.input)}`;
    case "invalid_union":
      if (issue.path.at(-1) === "type" || "discriminator" in issue) {
        return `type must be one of "single", "multi" or "true_false"`;
      }
      return `${field} is not in a recognised shape`;
    case "invalid_value":
      if (issue.values.length === 1) return `${field} must be ${JSON.stringify(issue.values[0])}`;
      return `${field} must be one of ${issue.values.map((v) => JSON.stringify(v)).join(", ")}`;
    case "unrecognized_keys":
      return `unknown field${issue.keys.length > 1 ? "s" : ""} ${issue.keys.map((k) => `"${k}"`).join(", ")}`;
    default:
      // Our own refinements and limits carry plain-language messages already.
      return issue.message;
  }
}

function article(expected: string): string {
  const map: Record<string, string> = {
    string: "text",
    number: "a number",
    boolean: "true or false",
    array: "a list",
    object: "an object",
  };
  return map[expected] ?? expected;
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "string") return "text";
  if (typeof value === "boolean") return "true/false";
  return `a ${typeof value}`;
}
