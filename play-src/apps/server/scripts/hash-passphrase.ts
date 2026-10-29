import { hashPassphrase } from "../src/auth";

// Usage: pnpm --filter @bitblitz/server hash-passphrase "your passphrase"
// Prints the value for the HOST_PASSPHRASE_HASH secret. The passphrase itself is never stored.
const passphrase = process.argv[2];
if (!passphrase || passphrase.length < 8) {
  console.error('usage: hash-passphrase "a passphrase of at least 8 characters"');
  process.exit(2);
}
console.log(await hashPassphrase(passphrase));
