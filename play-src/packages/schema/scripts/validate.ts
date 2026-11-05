import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatProblems, validateQuizText } from "../src/index";

// Usage: pnpm validate <quiz.json> [more.json ...]
// Exits non-zero when any file has problems, so the bitblitz-quiz skill can loop on it.
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: pnpm validate <quiz.json> [more.json ...]");
  process.exit(2);
}

let failed = false;
for (const file of files) {
  // pnpm runs this script inside packages/schema; INIT_CWD is where the teacher (or the
  // bitblitz-quiz skill) typed the command, so "quizzes-private/x.json" means what it says.
  const result = validateQuizText(readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file), "utf8"));
  if (result.ok) {
    const { quiz } = result;
    console.log(`✓ ${file}: "${quiz.title}", ${quiz.questions.length} questions`);
  } else {
    failed = true;
    console.log(`✗ ${file}`);
    for (const line of formatProblems(result.problems)) console.log(`  - ${line}`);
  }
}
process.exit(failed ? 1 : 0);
