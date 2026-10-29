import * as schema from "@bitblitz/schema";
import { describe, expect, it } from "vitest";
import { NICKNAME_MAX_CHARS, REJECTION_TEXT } from "./rejection-text";

// The player bundle carries a copy of the rejection wording so it doesn't ship zod.
// This test pins the copy to the schema, which remains the single source of truth.
describe("rejection text copy", () => {
  it("matches @bitblitz/schema word for word", () => {
    expect(REJECTION_TEXT).toEqual(schema.REJECTION_TEXT);
    expect(NICKNAME_MAX_CHARS).toBe(schema.NICKNAME_MAX_CHARS);
  });
});
