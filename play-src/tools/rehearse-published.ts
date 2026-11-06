// The published build, served as Pages would (DEPLOY.md step 3), played end to end: a teacher
// creates a game, a phone joins and answers. Fails on any browser error, including a refusal
// by the Content-Security-Policy that only the published build carries.
// Usage: pnpm --filter @bitblitz/tools rehearse  (BITBLITZ_PUBLISHED_URL to point elsewhere)

import { launchBrowser } from "./lib/browser";

const WEB = process.env.BITBLITZ_PUBLISHED_URL ?? "http://localhost:4173/play/";
const errors: string[] = [];
const browser = await launchBrowser();
const watch = (page: import("playwright").Page, who: string) => {
  page.on("console", (m) => m.type() === "error" && errors.push(`${who}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${who}: ${e.message}`));
};
const host = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
watch(host, "host");
await host.goto(`${WEB}#host`);
await host.getByLabel("Passphrase").fill(process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev");
await host.getByRole("button", { name: "Log in" }).click();
await host.getByRole("button", { name: "circles-warm-up", exact: true }).click();
await host.getByRole("button", { name: "Create game" }).click();
const code = (await host.getByLabel(/^Game code \d/).first().getAttribute("aria-label", { timeout: 15000 }))!.replace(/\D/g, "");
const qrShown = await host.getByLabel("QR code that opens the join page").isVisible();
const phone = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
watch(phone, "phone");
await phone.goto(`${WEB}?c=${code}`);
await phone.locator("#nickname").fill("Ada");
await phone.getByRole("button", { name: "Join game" }).click();
await phone.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 10000 });
await host.getByRole("button", { name: "Start ▶" }).click();
await phone.getByRole("button", { name: /^Answer 1/ }).click({ timeout: 15000 });
await phone.getByText(/Correct|Not quite|Practice/).first().waitFor({ timeout: 15000 });
const mathRendered = await host.locator(".katex").count();
const fontLoaded = await host.evaluate(() => document.fonts.check("700 16px Poppins"));
// The favicon lives on the real site (/images), which this local preview does not serve.
const real = errors.filter((e) => !/favicon|images\/|404/.test(e));
console.log(`game ${code}: created, QR shown ${qrShown}, phone joined and answered, ${mathRendered} formulas rendered, Poppins loaded ${fontLoaded}`);
console.log(real.length ? `browser errors:\n  ${real.join("\n  ")}` : "no browser errors and no CSP violations");
await browser.close(); process.exit(real.length ? 1 : 0);
