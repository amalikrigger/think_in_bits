---
name: bitblitz-quiz
description: Turn a think_in_bits lesson (a math/ session folder, a deck, or pasted notes) into a validated BitBlitz quiz JSON. FIRES on "make a BitBlitz quiz from <lesson>", "quiz for session N", "turn these notes into a BitBlitz game", "generate a warm-up quiz". Does NOT fire for editing the BitBlitz app itself, for CSV import (not built yet), or for uploading/running a game (that happens in the host screen). OUTCOME: one quiz file that passes `pnpm validate`, saved to play-src/quizzes-private/ (real class quiz, gitignored) or play-src/samples/ (public practice quiz, only when asked), plus a one-line summary of what it covers.
---

# bitblitz-quiz

Generate a BitBlitz quiz from lesson material and prove it valid before handing it over.

## Inputs

- A lesson source: a folder under `math/` (for example
  `math/1.3-coordinate-geometry/session-02-circles/`), a single deck `index.html`, or notes
  pasted into the conversation.
- Optional: number of questions (default 8), purpose (warm-up, exit ticket, test review),
  and whether it is a **real class quiz** or a **public practice sample**.

## Where the output goes (the repo is public)

- **Real class quiz** (default): `play-src/quizzes-private/<lesson-slug>-<purpose>.json`.
  That folder is gitignored because a quiz file contains its answers.
- **Public practice sample**: `play-src/samples/<lesson-slug>-practice.json`, only when Amali
  asks for a sample. Samples are committed, so they must be low-stakes practice that would
  not spoil a real assessment.
- Never put student names or any personal data in a quiz.

## Steps

1. **Read the lesson.** For a session folder, read its `index.html` deck (and booklet
   if present). Note the learning objectives, worked examples, and the misconceptions the
   deck calls out; those make the best wrong answers. Ignore styling, scripts and KaTeX assets.
2. **Draft the quiz** following `play-src/packages/schema/prompts/quiz-from-lesson.md`
   exactly (field names, KaTeX in `$…$`, plausible distractors, an explanation on every
   question, easiest first, one or two `"double"` questions at most).
3. **Write the file** to the location above.
4. **Validate** from `play-src/`:
   ```bash
   corepack pnpm validate quizzes-private/<file>.json
   ```
   If it prints problems (they read like "Question 3: single choice needs exactly one
   correct answer"), fix each one and run it again until it prints `✓`.
5. **Check the math yourself.** The validator checks structure, not correctness. Re-solve
   every question and confirm exactly the intended answers are correct.
6. **Report** the path, the question count, the topics covered, and anything you were
   unsure about (for example a question that may be too long for its time limit).

## Reference

- Schema source of truth: `play-src/packages/schema/src/quiz.ts`
- JSON Schema for editors: `play-src/packages/schema/quiz.schema.json`
- Prompt template: `play-src/packages/schema/prompts/quiz-from-lesson.md`
