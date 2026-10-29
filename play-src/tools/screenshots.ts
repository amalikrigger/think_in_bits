import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

// Responsive screenshot sweep that also plays a full game through the real UI:
// one projector host (re-sized through six screens, from a 1920×1080 projector to a
// teacher's phone) and five student devices (320 px phone → Chromebook), under both dark
// and light OS colour schemes. Along the way it refreshes a player and the host (resume),
// removes a player (kicked screen), and takes one player offline mid-question (reconnect).
//
// Every screenshot is checked for: sideways scroll, any element poking past the viewport
// edge (clipped content), and any interactive element whose centre is covered by another
// element (a control bar over a tile). Stage screens on projector-sized screens must also
// fit without scrolling.
//
// Needs `pnpm dev` running. Uses the installed Google Chrome (headless, throwaway
// profile) so no browser download is required.
// Usage: pnpm --filter @bitblitz/tools screenshots [--sample=<name>] [--schemes=dark,light]
//        [--stress=off] [--fixture=<path to quiz json>]
//   The stress pass (dark only) uploads tools/fixtures/stress-test.json: six long answers,
//   300-character prompts, KaTeX fractions, a code block and an image.

const WEB = process.env.BITBLITZ_WEB ?? "http://127.0.0.1:5173/play/";
const PASSPHRASE = process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev";
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const SAMPLE = args.sample ?? "circles-warm-up";
const SCHEMES = (args.schemes ?? "dark,light").split(",") as ("dark" | "light")[];
const STRESS = args.stress !== "off";
const FIXTURE = args.fixture ?? fileURLToPath(new URL("./fixtures/stress-test.json", import.meta.url));
const OUT = fileURLToPath(new URL("../screenshots/", import.meta.url));
const MEDIA_DIR = fileURLToPath(new URL("../samples/media/", import.meta.url));

const DEVICES = [
  { name: "phone-320", viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  { name: "phone-360", viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  { name: "phone-390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "tablet-820", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  { name: "chromebook-1366", viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
] as const;
const HOST_SIZES = [
  { name: "projector-1920", width: 1920, height: 1080 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "projector-1280", width: 1280, height: 720 },
  { name: "ipad-landscape-1180", width: 1180, height: 820 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "phone-390", width: 390, height: 844 },
];
/** Stage screens must fit these without scrolling: anything a projector or laptop shows. */
const MUST_FIT_WIDTH = 1180;
const STAGE_STEPS = /^host-(question|reveal|countdown|leaderboard|podium)-/;

type Finding = { shot: string; problem: string };
const findings: Finding[] = [];
const shots: string[] = [];
const consoleErrors: string[] = [];
/** File-name prefix for the current run ("" for the sample game, "stress-" for the fixture). */
let shotPrefix = "";

/**
 * Layout checks that run inside the page for one screenshot. Kept as plain source (not a
 * TypeScript function) because tsx's keepNames would inject a `__name` helper into the
 * serialised function that doesn't exist in the page.
 */
const INSPECT_LAYOUT = `(() => {
  const problems = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const describe = (el) => {
    const text = (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 30);
    return "<" + el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (text ? ' "' + text + '"' : "") + ">";
  };
  const sideways = document.documentElement.scrollWidth - vw;
  if (sideways > 0) problems.push("scrolls sideways by " + sideways + "px");

  // Anything poking past the viewport edge is clipped content (main hides x-overflow).
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (el instanceof HTMLCanvasElement || el.closest("pre, .katex-mathml, .sr-only, .sr-only-live")) continue;
    // Inner SVG geometry (KaTeX square roots, the QR code) is clipped by its <svg> viewport.
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right > vw + 1 || rect.left < -1) problems.push(describe(el) + " spans x " + Math.round(rect.left) + "–" + Math.round(rect.right) + " of " + vw);
  }

  // Every visible control must be the thing you'd hit at its centre.
  const controls = document.querySelectorAll("button, a[href], input:not([type=file]), textarea, select, [role=switch]");
  for (const el of Array.from(controls)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue; // off-screen inside a scroll area
    const scroller = el.closest("main[data-scroll]");
    if (scroller) {
      // Half-scrolled past the edge of the main area is reachable by scrolling, not covered.
      const sr = scroller.getBoundingClientRect();
      if (cy < sr.top || cy > sr.bottom) continue;
    }
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
    problems.push(describe(el) + " is covered by " + describe(hit));
  }
  return problems;
})()`;

/** How much the main area would need to scroll; 0 means the whole stage fits. */
const STAGE_OVERFLOW = `(() => {
  const main = document.querySelector("main[data-scroll]");
  return main ? main.scrollHeight - main.clientHeight : 0;
})()`;

async function snap(page: Page, scheme: string, name: string, mustFit = false): Promise<void> {
  await page.waitForTimeout(450); // let enter animations settle
  const dir = `${OUT}${scheme}`;
  mkdirSync(dir, { recursive: true });
  const shot = `${scheme}/${shotPrefix}${name}`;
  await page.screenshot({ path: `${dir}/${shotPrefix}${name}.png` });
  shots.push(`${shot}.png`);
  for (const problem of await page.evaluate<string[]>(INSPECT_LAYOUT)) findings.push({ shot, problem });
  if (mustFit) {
    const overflow = await page.evaluate<number>(STAGE_OVERFLOW);
    if (overflow > 0) findings.push({ shot, problem: `stage needs ${overflow}px of scrolling` });
  }
}

async function hostSizes(page: Page, scheme: string, step: string): Promise<void> {
  for (const size of HOST_SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    const name = `host-${step}-${size.name}`;
    await snap(page, scheme, name, size.width >= MUST_FIT_WIDTH && STAGE_STEPS.test(name));
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
}

function watchConsole(page: Page, label: string): void {
  // Chrome logs its own failed WebSocket connect while a player is deliberately offline
  // (the reconnect test); that is the network, not the app.
  const expected = (text: string) => text.includes("net::ERR_INTERNET_DISCONNECTED");
  page.on("console", (m) => m.type() === "error" && !expected(m.text()) && consoleErrors.push(`${label}: ${m.text()}`));
  page.on("pageerror", (e) => consoleErrors.push(`${label}: ${e.message}`));
}

type Quiz = { sample: string } | { fixture: string };
type Player = { name: string; page: Page; context: BrowserContext; nickname: string };

async function joinPlayer(browser: Browser, scheme: "dark" | "light", device: (typeof DEVICES)[number], code: string, nickname: string): Promise<Player> {
  const context = await browser.newContext({ ...device, colorScheme: scheme });
  const page = await context.newPage();
  watchConsole(page, `${nickname}/${device.name}`);
  await page.goto(`${WEB}?c=${code}`);
  await page.getByLabel("Nickname").waitFor();
  return { name: device.name, page, context, nickname };
}

async function runGame(browser: Browser, scheme: "dark" | "light", quiz: Quiz, prefix: string, extras: boolean): Promise<void> {
  shotPrefix = prefix;
  const s = (name: string) => name;
  const hostContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: scheme });
  const host = await hostContext.newPage();
  watchConsole(host, `${prefix}host`);

  await host.goto(`${WEB}#host`);
  if (extras) await snap(host, scheme, s("host-login-projector-1920"));
  await host.getByLabel("Passphrase").fill(PASSPHRASE);
  await host.getByRole("button", { name: "Log in" }).click();
  await host.getByRole("heading", { name: "Upload a quiz" }).waitFor();
  if ("sample" in quiz) await host.getByRole("button", { name: quiz.sample, exact: true }).click();
  else await host.locator('input[type="file"][accept*="json"]').setInputFiles(quiz.fixture);
  await host.getByRole("button", { name: "Create game" }).waitFor();
  if (await host.getByText("Images this quiz uses").isVisible()) {
    await host.locator('input[type="file"][multiple]').setInputFiles(readdirSync(MEDIA_DIR).map((f) => `${MEDIA_DIR}${f}`));
  }
  await hostSizes(host, scheme, s("upload-preview"));
  await host.getByRole("button", { name: "Create game" }).click();
  const codeLabel = await host.getByLabel(/^Game code \d/).first().getAttribute("aria-label");
  const code = codeLabel!.replace(/\D/g, "");

  const players: Player[] = [];
  const nicknames = ["Ada", "Bo", "Cy", "Dee", "Eli"];
  for (const [i, device] of DEVICES.entries()) {
    const player = await joinPlayer(browser, scheme, device, code, nicknames[i]!);
    if (i === 0) await snap(player.page, scheme, s(`player-nickname-${device.name}`));
    await player.page.getByLabel("Nickname").fill(player.nickname);
    await player.page.getByRole("button", { name: "Join game" }).click();
    await player.page.getByRole("heading", { name: "You're in!" }).waitFor();
    players.push(player);
  }

  if (extras) {
    // The code entry screen, on its own, and a wrong code.
    const codePage = await (await browser.newContext({ ...DEVICES[2], colorScheme: scheme })).newPage();
    await codePage.goto(WEB);
    await snap(codePage, scheme, s("player-code-phone-390"));
    await codePage.getByLabel("Game code").fill("000000");
    await codePage.getByRole("button", { name: "Enter" }).click();
    await codePage.getByRole("alert").waitFor();
    await snap(codePage, scheme, s("player-code-wrong-phone-390"));
    await codePage.context().close();

    // A refresh resumes the same seat (localStorage), for a student and for the teacher.
    await players[0]!.page.reload();
    await players[0]!.page.getByRole("heading", { name: "You're in!" }).waitFor();
    await players[0]!.page.getByText(`You are ${players[0]!.nickname}`).waitFor(); // same seat, same nickname
    await host.reload();
    await host.getByRole("heading", { name: /players/ }).waitFor();

    // Removing a player: the teacher confirms, the student lands on the removed screen.
    const victim = await joinPlayer(browser, scheme, DEVICES[1], code, "Zed");
    await victim.page.getByLabel("Nickname").fill("Zed");
    await victim.page.getByRole("button", { name: "Join game" }).click();
    await victim.page.getByRole("heading", { name: "You're in!" }).waitFor();
    await host.getByRole("button", { name: "Zed. Manage player" }).click();
    await host.getByRole("button", { name: "Remove", exact: true }).click();
    await snap(host, scheme, s("host-lobby-remove-confirm-projector-1920"));
    await host.getByRole("button", { name: "Remove", exact: true }).click();
    await victim.page.getByRole("heading", { name: "You were removed from this game" }).waitFor();
    await snap(victim.page, scheme, s("player-kicked-phone-360"));
    await victim.page.getByRole("button", { name: "Join another game" }).click();
    await victim.page.getByLabel("Game code").waitFor();
    await victim.context.close();
  }

  await host.getByRole("heading", { name: new RegExp(`${players.length} players`) }).waitFor();
  await hostSizes(host, scheme, s("lobby"));
  if (extras) {
    await host.getByRole("button", { name: "Settings" }).click();
    await snap(host, scheme, s("host-lobby-settings-projector-1920"));
    // Number fields accept typed values digit by digit and clamp on commit.
    const reveal = host.getByRole("textbox", { name: /^Reveal/ });
    await reveal.fill("15");
    await reveal.press("Enter");
    await host.waitForFunction(() => Array.from(document.querySelectorAll("input")).some((i) => i.value === "15"));
    await reveal.fill("999");
    await reveal.press("Enter");
    await host.waitForFunction(() => Array.from(document.querySelectorAll("input")).some((i) => i.value === "60"));
    await host.setViewportSize({ width: 390, height: 844 });
    await snap(host, scheme, s("host-lobby-settings-phone-390"));
    await host.setViewportSize({ width: 1920, height: 1080 });
    await host.getByRole("button", { name: "Hide settings" }).click();
    for (const p of players) await snap(p.page, scheme, s(`player-lobby-${p.name}`));
  }

  await host.getByRole("button", { name: "Start ▶" }).click();
  await host.getByText(/Question 1 of/).waitFor();
  await hostSizes(host, scheme, s("countdown"));
  await snap(players[2]!.page, scheme, s("player-countdown-phone-390"));

  let question = 0;
  for (;;) {
    await host.getByRole("timer").waitFor({ timeout: 10_000 });
    const isMulti = await host.getByText("Select all that apply", { exact: true }).isVisible();
    const hasMedia = (await host.getByRole("img", { name: /circle on coordinate axes/i }).isVisible()) || (await host.locator("main pre").isVisible());
    const interesting = question === 0 || isMulti || hasMedia;
    if (interesting) {
      await hostSizes(host, scheme, s(`question-${question + 1}`));
      for (const p of players) await snap(p.page, scheme, s(`player-question-${question + 1}-${p.name}`));
    }
    if (extras && question === 1) {
      // Wi-Fi drops mid-question: the badge shows, a tap says so, and coming back resumes.
      const p = players[1]!;
      await p.context.setOffline(true);
      await p.page.getByRole("status").filter({ hasText: "Reconnecting" }).waitFor({ timeout: 15_000 });
      await p.page.getByRole("button", { name: /^Answer 1/ }).click();
      await p.page.getByRole("alert").filter({ hasText: "Not connected" }).waitFor();
      await snap(p.page, scheme, s(`player-offline-${p.name}`));
      await p.context.setOffline(false);
      await p.page.getByRole("status").filter({ hasText: "Reconnecting" }).waitFor({ state: "hidden", timeout: 15_000 });
      await p.page.getByRole("button", { name: /^Answer 1/ }).waitFor();
    }
    // Players answer: the first two pick tile 1, the others tile 2 (multi: tiles 1 + 2).
    for (const [i, p] of players.entries()) {
      const tiles = p.page.getByRole("button", { name: /^Answer \d/ });
      if (isMulti) {
        await tiles.nth(0).click();
        if (i % 2 === 0) await tiles.nth(1).click();
        if (interesting) await snap(p.page, scheme, s(`player-multi-selected-${p.name}`));
        await p.page.getByRole("button", { name: /^Submit/ }).click();
      } else {
        await tiles.nth(i < 2 ? 0 : 1).click();
      }
      if (i === 0 && question === 0) {
        await p.page.getByRole("heading", { name: "Locked in!" }).waitFor();
        await snap(p.page, scheme, s(`player-locked-${p.name}`));
      }
    }
    await host.getByText("Why:").or(host.getByRole("button", { name: /^(Next|Podium) →/ })).first().waitFor();
    if (interesting) {
      await host.waitForTimeout(400); // the explanation fades in after the tiles light up
      await hostSizes(host, scheme, s(`reveal-${question + 1}`));
      for (const p of players) await snap(p.page, scheme, s(`player-result-${question + 1}-${p.name}`));
    }
    const toPodium = await host.getByRole("button", { name: "Podium →" }).isVisible();
    if (toPodium) {
      await host.getByRole("button", { name: "Podium →" }).click();
      break;
    }
    await host.getByRole("button", { name: "Next →" }).click();
    await host.getByRole("heading", { name: "Leaderboard" }).waitFor();
    if (question === 0) await host.waitForTimeout(900);
    if (question <= 1) await hostSizes(host, scheme, s(`leaderboard-${question + 1}`));
    await host.getByRole("button", { name: "Next question →" }).click();
    await host.getByText(new RegExp(`Question ${question + 2} of`)).waitFor();
    question++;
  }

  await host.getByRole("list", { name: "Podium" }).waitFor();
  await host.waitForTimeout(3300); // podium builds 3rd → 2nd → 1st, then confetti
  await hostSizes(host, scheme, s("podium"));
  for (const p of players) await snap(p.page, scheme, s(`player-final-${p.name}`));
  await host.getByRole("button", { name: "Answer review" }).click();
  await snap(host, scheme, s("host-review-projector-1920"));
  await host.getByRole("button", { name: "Finish →" }).click();
  await host.getByRole("heading", { name: "Final results" }).waitFor();
  await snap(host, scheme, s("host-ended-projector-1920"));
  await players[0]!.page.getByRole("heading", { name: /You finished|Game over/ }).waitFor();

  await hostContext.close();
  for (const p of players) await p.context.close();
}

async function main(): Promise<void> {
  if (STRESS && !existsSync(FIXTURE)) throw new Error(`fixture not found: ${FIXTURE}`);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const scheme of SCHEMES) await runGame(browser, scheme, { sample: SAMPLE }, "", true);
    if (STRESS) await runGame(browser, SCHEMES[0] ?? "dark", { fixture: FIXTURE }, "stress-", false);
  } finally {
    await browser.close();
  }
  const report = { web: WEB, sample: SAMPLE, stress: STRESS ? FIXTURE : null, schemes: SCHEMES, shots: shots.length, layoutFindings: findings, consoleErrors };
  writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2));
  console.log(`${shots.length} screenshots in ${OUT}`);
  console.log(findings.length ? `layout findings:\n${findings.map((f) => `  ${f.shot}: ${f.problem}`).join("\n")}` : "no layout findings (no sideways scroll, nothing clipped or covered, stage fits)");
  console.log(consoleErrors.length ? `console errors:\n  ${consoleErrors.join("\n  ")}` : "no console errors");
  process.exit(findings.length || consoleErrors.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
