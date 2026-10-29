import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

// Responsive screenshot sweep that also plays a full game through the real UI:
// one projector host and four student devices (320 px phone → Chromebook), under both
// dark and light OS colour schemes. Flags any page that scrolls sideways.
//
// Needs `pnpm dev` running. Uses the installed Google Chrome (headless, throwaway
// profile) so no browser download is required.
// Usage: pnpm --filter @bitblitz/tools screenshots [--sample=<name>] [--schemes=dark,light]

const WEB = process.env.BITBLITZ_WEB ?? "http://127.0.0.1:5173/play/";
const PASSPHRASE = process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev";
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const SAMPLE = args.sample ?? "circles-warm-up";
const SCHEMES = (args.schemes ?? "dark,light").split(",") as ("dark" | "light")[];
const OUT = fileURLToPath(new URL("../screenshots/", import.meta.url));

const DEVICES = [
  { name: "phone-320", viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  { name: "phone-390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "tablet-820", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  { name: "chromebook-1366", viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
] as const;
const HOST_SIZES = [
  { name: "projector-1920", width: 1920, height: 1080 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
];

type Finding = { shot: string; problem: string };
const findings: Finding[] = [];
const shots: string[] = [];
const consoleErrors: string[] = [];

async function snap(page: Page, scheme: string, name: string): Promise<void> {
  await page.waitForTimeout(450); // let enter animations settle
  const dir = `${OUT}${scheme}`;
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${name}.png`;
  await page.screenshot({ path: file });
  shots.push(`${scheme}/${name}.png`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) findings.push({ shot: `${scheme}/${name}`, problem: `scrolls sideways by ${overflow}px` });
}

async function hostSizes(page: Page, scheme: string, step: string): Promise<void> {
  for (const size of HOST_SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await snap(page, scheme, `host-${step}-${size.name}`);
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

function watchConsole(page: Page, label: string): void {
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${label}: ${m.text()}`));
  page.on("pageerror", (e) => consoleErrors.push(`${label}: ${e.message}`));
}

async function runScheme(browser: Browser, scheme: "dark" | "light"): Promise<void> {
  const hostContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: scheme });
  const host = await hostContext.newPage();
  watchConsole(host, "host");

  await host.goto(`${WEB}#host`);
  await snap(host, scheme, "host-login-projector-1920");
  await host.getByLabel("Passphrase").fill(PASSPHRASE);
  await host.getByRole("button", { name: "Log in" }).click();
  await host.getByRole("heading", { name: "Upload a quiz" }).waitFor();
  await host.getByRole("button", { name: SAMPLE, exact: true }).click();
  await host.getByRole("button", { name: "Create game" }).waitFor();
  await hostSizes(host, scheme, "upload-preview");
  await host.getByRole("button", { name: "Create game" }).click();
  const codeLabel = await host.getByLabel(/^Game code \d/).first().getAttribute("aria-label");
  const code = codeLabel!.replace(/\D/g, "");

  const players: { name: string; page: Page; context: BrowserContext }[] = [];
  for (const [i, device] of DEVICES.entries()) {
    const context = await browser.newContext({ ...device, colorScheme: scheme });
    const page = await context.newPage();
    watchConsole(page, device.name);
    await page.goto(`${WEB}?c=${code}`);
    await page.getByLabel("Nickname").waitFor();
    if (i === 0) await snap(page, scheme, `player-nickname-${device.name}`);
    await page.getByLabel("Nickname").fill(["Ada", "Bo", "Cy", "Dee"][i]!);
    await page.getByRole("button", { name: "Join game" }).click();
    await page.getByRole("heading", { name: "You're in!" }).waitFor();
    players.push({ name: device.name, page, context });
  }
  // The code entry screen, on its own.
  const codePage = await (await browser.newContext({ ...DEVICES[1], colorScheme: scheme })).newPage();
  await codePage.goto(WEB);
  await snap(codePage, scheme, "player-code-phone-390");

  await host.getByRole("heading", { name: /4 players/ }).waitFor();
  await hostSizes(host, scheme, "lobby");
  await host.getByRole("button", { name: "Settings" }).click();
  await snap(host, scheme, "host-lobby-settings-projector-1920");
  await host.getByRole("button", { name: "Settings" }).click();
  for (const p of players) await snap(p.page, scheme, `player-lobby-${p.name}`);

  await host.getByRole("button", { name: "Start ▶" }).click();
  await host.getByText(/Question 1 of/).waitFor();
  await snap(host, scheme, "host-countdown-projector-1920");
  await snap(players[1]!.page, scheme, "player-countdown-phone-390");

  let question = 0;
  for (;;) {
    await host.getByRole("timer").waitFor({ timeout: 10_000 });
    const isMulti = await host.getByText("Select all that apply", { exact: true }).isVisible();
    if (question === 0 || isMulti) {
      await hostSizes(host, scheme, `question-${question + 1}`);
      for (const p of players) await snap(p.page, scheme, `player-question-${question + 1}-${p.name}`);
    }
    // Players answer: the first two pick tile 1, the others tile 2 (multi: tiles 1 + 2).
    for (const [i, p] of players.entries()) {
      const tiles = p.page.getByRole("button", { name: /^Answer \d/ });
      if (isMulti) {
        await tiles.nth(0).click();
        if (i % 2 === 0) await tiles.nth(1).click();
        if (question === 0 || i === 0) await snap(p.page, scheme, `player-multi-selected-${p.name}`);
        await p.page.getByRole("button", { name: /^Submit/ }).click();
      } else {
        await tiles.nth(i < 2 ? 0 : 1).click();
      }
      if (i === 0 && question === 0) {
        await p.page.getByRole("heading", { name: "Locked in!" }).waitFor();
        await snap(p.page, scheme, `player-locked-${p.name}`);
      }
    }
    await host.getByText("Why:").or(host.getByRole("button", { name: /^(Next|Podium) →/ })).first().waitFor();
    if (question === 0 || isMulti) {
      await hostSizes(host, scheme, `reveal-${question + 1}`);
      for (const p of players) await snap(p.page, scheme, `player-result-${question + 1}-${p.name}`);
    }
    const toPodium = await host.getByRole("button", { name: "Podium →" }).isVisible();
    if (toPodium) {
      await host.getByRole("button", { name: "Podium →" }).click();
      break;
    }
    await host.getByRole("button", { name: "Next →" }).click();
    await host.getByRole("heading", { name: "Leaderboard" }).waitFor();
    if (question === 0) await host.waitForTimeout(900);
    if (question <= 1) await hostSizes(host, scheme, `leaderboard-${question + 1}`);
    await host.getByRole("button", { name: "Next question →" }).click();
    await host.getByText(new RegExp(`Question ${question + 2} of`)).waitFor();
    question++;
  }

  await host.getByRole("list", { name: "Podium" }).waitFor();
  await host.waitForTimeout(3300); // podium builds 3rd → 2nd → 1st, then confetti
  await hostSizes(host, scheme, "podium");
  for (const p of players) await snap(p.page, scheme, `player-final-${p.name}`);
  await host.getByRole("button", { name: "Answer review" }).click();
  await snap(host, scheme, "host-review-projector-1920");
  await host.getByRole("button", { name: "Finish →" }).click();
  await host.getByRole("heading", { name: "Final results" }).waitFor();
  await snap(host, scheme, "host-ended-projector-1920");

  await hostContext.close();
  for (const p of players) await p.context.close();
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const scheme of SCHEMES) await runScheme(browser, scheme);
  } finally {
    await browser.close();
  }
  const report = { web: WEB, sample: SAMPLE, schemes: SCHEMES, shots: shots.length, sidewaysScroll: findings, consoleErrors };
  writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
  console.log(`${shots.length} screenshots in ${OUT}`);
  console.log(findings.length ? `sideways scroll:\n${findings.map((f) => `  ${f.shot}: ${f.problem}`).join("\n")}` : "no sideways scroll");
  console.log(consoleErrors.length ? `console errors:\n  ${consoleErrors.join("\n  ")}` : "no console errors");
  process.exit(findings.length || consoleErrors.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
