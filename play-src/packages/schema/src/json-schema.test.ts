import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { quizJsonSchemaText } from "./json-schema";

describe("quiz.schema.json", () => {
  it("matches the Zod source (run `pnpm schema:json` after changing the schema)", () => {
    const committed = readFileSync(new URL("../quiz.schema.json", import.meta.url), "utf8");
    expect(committed).toBe(quizJsonSchemaText());
  });
});
