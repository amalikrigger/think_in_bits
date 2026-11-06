import { readFileSync } from "node:fs";
import { hashPassphrase } from "../src/auth";

// Prints the value for the HOST_PASSPHRASE_HASH secret. The passphrase itself is never stored.
// Pipe it in, so it stays out of shell history and the process list (DEPLOY.md step 2):
//   read -rs PASS && printf '%s' "$PASS" | pnpm --filter @bitblitz/server hash-passphrase
// An argument still works for throwaway local passphrases: hash-passphrase "local only"
const passphrase = process.argv[2] ?? (process.stdin.isTTY ? "" : readFileSync(0, "utf8").replace(/\r?\n$/, ""));
if (passphrase.length < 8) {
  console.error("hash-passphrase: give a passphrase of at least 8 characters on stdin (or as an argument)");
  process.exit(2);
}
console.log(await hashPassphrase(passphrase));
