import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hashPassphrase, randomToken } from "../src/auth";

// Writes the untracked .dev.vars that local `wrangler dev` reads, with a throwaway dev
// passphrase. Auth stays on locally (prototype rule): the host screen still asks for it.
// Usage: pnpm --filter @bitblitz/server setup:dev [passphrase]   (default: bitblitz-dev)
const target = fileURLToPath(new URL("../.dev.vars", import.meta.url));
if (existsSync(target) && !process.argv.includes("--force")) {
  console.log(`${target} already exists; pass --force to replace it`);
  process.exit(0);
}
const passphrase = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "bitblitz-dev";
writeFileSync(
  target,
  `# Local development only. Gitignored. Not used by any deployed Worker.\n` +
    `HOST_PASSPHRASE_HASH="${await hashPassphrase(passphrase)}"\n` +
    `SESSION_SECRET="${randomToken(32)}"\n`,
);
console.log(`wrote ${target} (dev passphrase: ${passphrase})`);
