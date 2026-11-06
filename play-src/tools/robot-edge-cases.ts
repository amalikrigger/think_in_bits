import type { HostView, ServerMessage } from "@bitblitz/schema";
import type { Browser, BrowserContext, Locator, Page } from "playwright";
import { launchBrowser } from "./lib/browser";
import { API, Connection, createGame, hostToken, isType } from "./lib/client";

// Robot edge cases: the real web app in a real browser, against the running dev server,
// for the classroom situations the second adversarial review found broken (Nov 2026).
// Each scenario plays the situation through the UI and checks what the student or the
// projector actually shows. Needs `pnpm dev`. Usage: pnpm --filter @bitblitz/tools robot

const WEB = process.env.BITBLITZ_WEB ?? "http://127.0.0.1:5173";
const PLAYER = `${WEB}/play/`;
const HOST = `${WEB}/play/#host`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const trueFalse = (prompt: string) => ({ type: "true_false", prompt, correct: true });
const quiz = (title: string, questions: unknown[], settings: Record<string, unknown> = {}) => ({ schemaVersion: 1, title, settings, questions });

/** A game with its host on a protocol connection, as the projector would be. */
async function game(title: string, questions: unknown[], settings: Record<string, unknown> = {}) {
  const { code, hostKey } = await createGame(await hostToken(), quiz(title, questions, settings));
  const host = new Connection(code);
  await host.opened();
  host.send({ type: "host_auth", key: hostKey });
  await host.waitFor(isType("host_welcome"));
  return { code, hostKey, host };
}

async function phone(browser: Browser, options: { blockStorage?: boolean } = {}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  if (options.blockStorage) {
    // Safari "Block all cookies", or a managed Chromebook: any storage access throws.
    await context.addInitScript(() => {
      const deny = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      };
      Object.defineProperty(window, "localStorage", { get: deny });
      Object.defineProperty(window, "sessionStorage", { get: deny });
    });
  }
  return { context, page: await context.newPage() };
}

async function joinByLink(page: Page, code: string, nickname: string): Promise<void> {
  await page.goto(`${PLAYER}?c=${code}`);
  await page.locator("#nickname").fill(nickname);
  await page.getByRole("button", { name: "Join game" }).click();
  await page.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 10_000 });
}

/** Polls state the robot already holds: a reply can land before a Playwright click resolves. */
async function eventually(condition: () => boolean, timeoutMs = 5000): Promise<boolean> {
  for (const end = Date.now() + timeoutMs; Date.now() < end; await sleep(100)) if (condition()) return true;
  return condition();
}
const appears = (locator: Locator, timeout: number) => locator.waitFor({ timeout }).then(() => true, () => false);
const bodyText = async (page: Page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const hostView = (host: Connection) => host.lastView() as HostView;

// ---------------------------------------------------------------- scenarios

async function storageBlockedBlip(browser: Browser) {
  const { code, host } = await game("Robot: storage blocked", [trueFalse("Sky is blue"), trueFalse("Grass is green")]);
  const { context, page } = await phone(browser, { blockStorage: true });
  await joinByLink(page, code, "Dana");
  host.command({ kind: "start" });
  await page.getByRole("button", { name: /^Answer 1/ }).click({ timeout: 10_000 });
  await host.waitForPhase("reveal");
  const scoreBefore = hostView(host).players.find((p) => p.nickname === "Dana")!.score;

  const danaConnected = (connected: boolean) => (m: ServerMessage) =>
    m.type === "view" && m.view.role === "host" && m.view.players.some((p) => p.nickname === "Dana" && p.connected === connected);
  await context.setOffline(true);
  await host.waitFor(danaConnected(false), 15_000);
  await sleep(1500);
  await context.setOffline(false);
  const reconnected = await host.waitFor(danaConnected(true), 20_000).then(() => true, () => false);
  check("storage blocked: the phone reconnects by itself when the Wi-Fi comes back", reconnected);
  await sleep(500);
  const text = await bodyText(page);
  const players = hostView(host).players;
  check("storage blocked: after a Wi-Fi blip the student is back in their seat, not asked for a new nickname",
    !/Someone already has that nickname/.test(text) && /You're in 1st/.test(text), text.slice(0, 120));
  check("storage blocked: the class still has one Dana, with her score", players.length === 1 && players[0]!.score === scoreBefore && players[0]!.connected,
    JSON.stringify(players.map((p) => [p.nickname, p.score, p.connected])));
  await context.close();
  host.close();
}

async function finishedGameIsNotATrap(browser: Browser) {
  const { code, host } = await game("Robot: finish", [trueFalse("One question")]);
  const { context, page } = await phone(browser);
  // Typed code, the path the URL bug hit.
  await page.goto(PLAYER);
  await page.locator("#code").fill(code);
  await page.getByRole("button", { name: "Enter" }).click();
  await page.locator("#nickname").fill("Eli");
  await page.getByRole("button", { name: "Join game" }).click();
  await page.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 10_000 });
  host.command({ kind: "start" });
  await page.getByRole("button", { name: /^Answer 1/ }).click({ timeout: 10_000 });
  await host.waitForPhase("reveal");
  host.press("next"); // last question → podium

  check("podium: the phone points at the projector instead of spoiling the reveal",
    await appears(page.getByRole("heading", { name: "Look up at the podium!" }), 8000), (await bodyText(page)).slice(0, 120));
  check("podium: then the phone shows the student's own place",
    await appears(page.getByRole("heading", { name: /You finished 1st/ }), 8000), (await bodyText(page)).slice(0, 120));
  check("final screen says '1 player', not '1 players'", /of 1 player\./.test(await bodyText(page)), (await bodyText(page)).slice(0, 120));

  host.press("next"); // podium → ended
  await host.waitForPhase("ended");
  const leave = page.getByRole("button", { name: "Join another game" });
  check("final screen offers 'Join another game'", await leave.isVisible().catch(() => false));
  await page.reload();
  await sleep(1500);
  const afterRefresh = await bodyText(page);
  check("a refresh after the game ended does not reopen the finished game", !/You finished/.test(afterRefresh), afterRefresh.slice(0, 120));
  await context.close();
  host.close();
}

async function leaderboardHoldsStill(browser: Browser) {
  const { code, hostKey, host } = await game("Robot: leaderboard", [trueFalse("Q1"), trueFalse("Q2"), trueFalse("Q3")]);
  const players = await Promise.all(["Alpha", "Bravo", "Charlie"].map(async (nickname) => {
    const c = new Connection(code);
    await c.opened();
    c.send({ type: "join", nickname });
    await c.waitFor(isType("welcome"));
    return c;
  }));
  const [alpha, bravo, charlie] = players as [Connection, Connection, Connection];
  host.command({ kind: "start" });
  await alpha.waitForPhase("question", 8000);
  // Q1: Bravo right fast, Alpha right slower, Charlie wrong.
  bravo.send({ type: "answer", questionIndex: 0, choice: [0] });
  await sleep(400);
  alpha.send({ type: "answer", questionIndex: 0, choice: [0] });
  charlie.send({ type: "answer", questionIndex: 0, choice: [1] });
  await host.waitForPhase("reveal");
  host.press("next");
  await host.waitForPhase("leaderboard");
  host.press("next");
  await alpha.waitForPhase("question", 8000);
  // Q2: Charlie right first, the others wrong, so the order changes on this board.
  charlie.send({ type: "answer", questionIndex: 1, choice: [0] });
  alpha.send({ type: "answer", questionIndex: 1, choice: [1] });
  bravo.send({ type: "answer", questionIndex: 1, choice: [1] });
  await host.waitForPhase("reveal");

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(({ code, hostKey }) => sessionStorage.setItem("bitblitz:host-game", JSON.stringify({ code, hostKey })), { code, hostKey });
  const projector = await context.newPage();
  await projector.goto(HOST);
  await projector.getByRole("button", { name: "Next →" }).click({ timeout: 10_000 });
  await projector.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 8000 });
  await sleep(1500); // let the climb animation settle
  const order = () => projector.getByRole("list", { name: "Leaderboard" }).getByRole("listitem").allInnerTexts();
  const settled = (await order()).map((t) => t.replace(/\s+/g, " "));

  bravo.close(); // a phone drops off: the host view is re-sent with the same standings
  await sleep(150);
  const afterDrop = (await order()).map((t) => t.replace(/\s+/g, " "));
  check("leaderboard does not jump back to the old order when a phone drops off", JSON.stringify(afterDrop) === JSON.stringify(settled),
    `${settled.join(" / ")} → ${afterDrop.join(" / ")}`);
  await context.close();
  for (const c of [host, alpha, charlie]) c.close();
}

async function tiesAndMoney(browser: Browser) {
  const { code, host } = await game("Robot: ties and money", [
    { type: "single", prompt: "A pen costs $3 and a book costs $12. Which costs more?", answers: [{ text: "The book", correct: true }, { text: "The pen" }] },
  ]);
  const a = await phone(browser);
  const b = await phone(browser);
  await joinByLink(a.page, code, "Ada");
  await joinByLink(b.page, code, "Bo");
  host.command({ kind: "start" });
  check("a prompt with dollar amounts shows the money as written, not as a garbled formula",
    await appears(a.page.getByText("A pen costs $3 and a book costs $12. Which costs more?", { exact: true }), 10_000),
    (await bodyText(a.page)).slice(0, 140));
  await a.page.getByRole("button", { name: /^Answer 2/ }).click({ timeout: 10_000 });
  await b.page.getByRole("button", { name: /^Answer 2/ }).click({ timeout: 10_000 });
  await host.waitForPhase("reveal");
  await b.page.getByText(/You're in/).waitFor({ timeout: 8000 });
  const boText = await bodyText(b.page);
  check("two students tied on 0: neither is told they are '0 behind' the other", !/\b0 behind\b/.test(boText), boText.slice(0, 140));

  for (const p of [a, b]) await p.context.close();
  host.close();
}

async function kickAndRenameMidGame(browser: Browser) {
  const { code, hostKey, host } = await game("Robot: players mid-game", [trueFalse("Q1"), trueFalse("Q2")]);
  const students = await Promise.all(["Bo", "Zed", "Cy"].map(async (nickname) => {
    const c = new Connection(code);
    await c.opened();
    c.send({ type: "join", nickname });
    await c.waitFor(isType("welcome"));
    return c;
  }));
  const [, zed] = students as [Connection, Connection, Connection];
  host.command({ kind: "start" });
  await host.waitForPhase("question", 8000);

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(({ code, hostKey }) => sessionStorage.setItem("bitblitz:host-game", JSON.stringify({ code, hostKey })), { code, hostKey });
  const projector = await context.newPage();
  await projector.goto(HOST);
  await projector.getByRole("button", { name: "Players" }).click({ timeout: 10_000 });
  const panel = projector.getByRole("dialog", { name: /Players/ });
  check("mid-game: the Players panel opens from the control bar", await appears(panel, 5000));

  await projector.keyboard.press("ArrowRight");
  await sleep(500);
  check("mid-game: the clicker key does not advance the game while the panel is open", hostView(host).phase === "question", hostView(host).phase);

  await panel.getByRole("button", { name: /^Bo\. Manage player/ }).click();
  await panel.getByRole("button", { name: "Rename" }).click();
  await panel.getByLabel("New nickname for Bo").fill("Bo B.");
  await panel.getByRole("button", { name: "Save" }).click();
  check("mid-game: the teacher renames a student", await eventually(() => hostView(host).players.some((p) => p.nickname === "Bo B.")));

  await panel.getByRole("button", { name: /^Zed\. Manage player/ }).click();
  await panel.getByRole("button", { name: "Remove" }).click();
  await panel.getByRole("group", { name: "Remove Zed?" }).getByRole("button", { name: "Remove" }).click();
  const kicked = await eventually(() => zed.received.some((r) => r.message.type === "kicked") && hostView(host).players.every((p) => p.nickname !== "Zed"));
  check("mid-game: the teacher removes a student, who is told and disconnected", kicked);
  check("mid-game: removing a student does not stop the question", hostView(host).phase === "question", hostView(host).phase);

  await projector.keyboard.press("Escape");
  check("mid-game: Escape closes the Players panel", await panel.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false));
  await context.close();
  host.close();
  for (const c of students) c.close();
}

async function countdownShowsNoAnswers() {
  const { code, host } = await game("Robot: countdown", [
    { type: "single", prompt: "Countdown secrecy", answers: [{ text: "Right", correct: true }, { text: "Wrong" }] },
  ]);
  const student = new Connection(code);
  await student.opened();
  student.send({ type: "join", nickname: "Fin" });
  await student.waitFor(isType("welcome"));
  host.command({ kind: "start" });
  const countdown = await student.waitForPhase("countdown");
  check("countdown: the phone gets the prompt but none of the answer texts",
    countdown.question?.prompt === "Countdown secrecy" && countdown.question.answers.every((a) => a.text === null),
    JSON.stringify(countdown.question?.answers));
  host.close();
  student.close();
}

async function devServerKeepsSecrets() {
  const repoRoot = new URL("../..", import.meta.url).pathname;
  const statuses = await Promise.all(
    ["play-src/apps/server/.dev.vars", "play-src/quizzes-private/README.md"].map(async (path) => (await fetch(`${WEB}/play/@fs${repoRoot}${path}`)).status),
  );
  check("a phone on the Wi-Fi cannot download .dev.vars or quizzes-private from the dev server", statuses.every((s) => s === 403), statuses.join(","));
}

async function main() {
  console.log(`robot edge cases against ${WEB} and ${API}`);
  const browser = await launchBrowser();
  try {
    await devServerKeepsSecrets();
    await storageBlockedBlip(browser);
    await finishedGameIsNotATrap(browser);
    await leaderboardHoldsStill(browser);
    await tiesAndMoney(browser);
    await kickAndRenameMidGame(browser);
    await countdownShowsNoAnswers();
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nall robot edge cases passed" : `\n${failures} robot edge case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
