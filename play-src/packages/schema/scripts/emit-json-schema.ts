import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { quizJsonSchemaText } from "../src/json-schema";

// Regenerates quiz.schema.json from the Zod source of truth. A test fails if the
// committed file drifts, so run this after changing src/quiz.ts.
const target = fileURLToPath(new URL("../quiz.schema.json", import.meta.url));
writeFileSync(target, quizJsonSchemaText());
console.log(`wrote ${target}`);
