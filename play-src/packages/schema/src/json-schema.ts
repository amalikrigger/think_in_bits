import { z } from "zod";
import { Quiz } from "./quiz";

// The JSON Schema describes the authoring (input) shape: defaults are optional to write.
// Cross-field rules (exactly one correct answer, etc.) live in Zod refinements, which
// JSON Schema cannot express; validateQuiz remains the authority.
export function quizJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(Quiz, { io: "input", target: "draft-2020-12" }),
    $id: "https://thinkinbits.site/play/quiz.schema.json",
    title: "BitBlitz quiz v1",
    description:
      "A BitBlitz quiz. Also enforced but not expressible here: single needs exactly one correct answer; multi needs at least one.",
  };
}

export function quizJsonSchemaText(): string {
  return `${JSON.stringify(quizJsonSchema(), null, 2)}\n`;
}
