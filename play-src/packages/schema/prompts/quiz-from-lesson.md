# Prompt template: lesson material → BitBlitz quiz JSON

Use this with any LLM. Paste everything below the line, then replace the three
`{{…}}` placeholders. The output must pass `pnpm validate <file>` in `play-src/`.

---

You are writing a live classroom quiz for BitBlitz, a Kahoot-style game projected in class
and answered on student phones, Chromebooks and iPads.

**Lesson material:**

{{LESSON_MATERIAL}}

**Audience and purpose:** {{AUDIENCE}} (for example "AS Level Mathematics, 16–17 year olds,
warm-up at the start of the next session").

**Number of questions:** {{COUNT}} (default 8).

## Output

Return **only** one JSON object, no prose and no code fences, in exactly this shape:

```json
{
  "schemaVersion": 1,
  "title": "short title, max 120 characters",
  "description": "one line on what the quiz covers",
  "settings": { "autoplay": true, "revealSec": 6, "leaderboardSec": 6 },
  "defaults": { "timeLimitSec": 20, "points": "standard" },
  "questions": [
    { "type": "single", "prompt": "…", "answers": [ {"text": "…", "correct": true}, {"text": "…"}, {"text": "…"}, {"text": "…"} ], "explanation": "…" },
    { "type": "true_false", "prompt": "…", "correct": false, "timeLimitSec": 10, "explanation": "…" },
    { "type": "multi", "prompt": "…", "points": "double", "answers": [ {"text": "…", "correct": true}, {"text": "…", "correct": true}, {"text": "…"}, {"text": "…"} ] }
  ]
}
```

## Rules (the validator enforces the first group)

- `type` is `"single"`, `"multi"` or `"true_false"`.
- `single`: 2–6 answers, **exactly one** with `"correct": true`. Omit `correct` on wrong answers.
- `multi`: 2–6 answers, **one or more** correct. Say "Select all that apply" in the prompt.
- `true_false`: no `answers`; give `"correct": true` or `"correct": false`.
- `timeLimitSec` is a whole number from 5 to 240. Use 10 for true/false, 20 for quick recall,
  30–60 for anything that needs a calculation.
- `points` is `"standard"`, `"double"` or `"none"`. Use `"double"` for at most one or two
  harder questions, and `"none"` for a warm-up question that should not count.
- Use no field names other than the ones shown (plus optional `media`). Unknown fields are rejected.
- Prompts up to 500 characters, answers up to 150. Answers must fit on a phone tile:
  aim for under 40 characters.

## Quality

- Math goes in KaTeX between single dollar signs: `$x^2 + y^2 = 25$`. Use `\\frac`, `\\sqrt`,
  `\\pi` etc. with the backslash escaped for JSON.
- Keep formulas tight against their dollar signs (`$x^2$`, not `$ x^2 $`). Money is fine as
  plain text ("costs $3 and $12"); to force a literal dollar sign next to a formula, write
  `\\$` in the JSON.
- Wrong answers are **plausible mistakes a student actually makes** (sign errors, forgetting
  to square-root the radius, mixing up gradient and intercept), never jokes.
- Mix the position of the correct answer; do not always put it first.
- Every question gets an `explanation`: one sentence that fixes the misconception, shown on
  the projector after the reveal.
- Order questions from easiest to hardest. Start with a confidence-builder.
- No real student names, no personal data, no references to specific students.
- Prefer one idea per question. A student should be able to answer within the time limit
  without pen and paper unless the time limit is 30 s or more.

## Optional media

An image: `"media": { "type": "image", "src": "file-name.png", "alt": "what the image shows" }`.
`alt` is required. Only reference an image the teacher has said they will upload.

A code block: `"media": { "type": "code", "language": "python", "source": "print(2 ** 3)" }`.
