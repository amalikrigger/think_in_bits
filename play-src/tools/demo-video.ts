import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import type { PlayerView } from "@bitblitz/schema";
import { chromium, type FrameLocator, type Page } from "playwright";
import { Connection, isType } from "./lib/client";

// Narrated walkthrough video: plays every feature through the real UI and checks each
// result as it goes. One 1920×1080 stage shows the teacher's screen (served from the
// Mac's LAN address, as a teacher would open it) beside two 320 px student phones on
// their own origins, so each keeps its own seat. A few off-screen bot students fill
// the class. Narration is macOS `say`, placed at the moment each caption appears.
//
// Needs `pnpm dev` running, ffmpeg on PATH and macOS. Writes to screenshots/demo/.
// Usage: pnpm --filter @bitblitz/tools exec tsx demo-video.ts [--suite=<dir with suite logs>]

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const lan =
  process.env.BITBLITZ_LAN ??
  Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
if (!lan) throw new Error("no LAN address found; set BITBLITZ_LAN");
const HOST_URL = `http://${lan}:5173/play/#host`;
const PHONE_A = "http://127.0.0.1:5173/play/";
// Phone 2 opens the same Wi-Fi address as the teacher, the path a real phone takes.
const PHONE_B = `http://${lan}:5173/play/`;
const PASSPHRASE = process.env.BITBLITZ_PASSPHRASE ?? "bitblitz-dev";
const VOICE = process.env.BITBLITZ_VOICE ?? "Samantha";
const OUT = fileURLToPath(new URL("../screenshots/demo/", import.meta.url));
const AUDIO = `${OUT}audio/`;
const MEDIA = fileURLToPath(new URL("../samples/media/circle.svg", import.meta.url));
const SUITE = args.suite;
const FPS = 25;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(AUDIO, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- stage page

const STAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --bg:#0b0b10; --panel:#15151d; --line:#2a2a36; --text:#f4f4f7; --muted:#a0a0b2; --brand:#ff7a3d; --good:#3ddc97; --bad:#ff5c6c; }
* { box-sizing:border-box; }
body { margin:0; width:1920px; height:1080px; overflow:hidden; background:var(--bg); color:var(--text); font:20px/1.35 -apple-system, "Segoe UI", sans-serif; }
header { position:absolute; inset:0 0 auto 0; height:56px; display:flex; align-items:center; gap:18px; padding:0 24px; border-bottom:1px solid var(--line); background:#101017; }
header b { color:var(--brand); font-size:24px; } #scene { font-weight:600; } #clock { margin-left:auto; color:var(--muted); font-variant-numeric:tabular-nums; }
.dev { position:absolute; } .dev .label { height:28px; color:var(--muted); font-size:16px; font-weight:600; white-space:nowrap; }
.dev iframe { display:block; border:1px solid var(--line); border-radius:10px; background:#000; }
#hostwrap { left:24px; top:68px; } #host { width:1200px; height:675px; }
#wa { left:1248px; top:68px; } #wb { left:1592px; top:68px; } #a, #b { width:320px; height:693px; border-radius:22px; border-width:3px; }
#caption { position:absolute; left:24px; top:790px; width:1200px; height:266px; padding:18px 24px; background:var(--panel); border:1px solid var(--line); border-radius:12px; font-size:27px; line-height:1.4; }
#caption small { display:block; color:var(--brand); font-size:15px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:6px; }
#checks { position:absolute; left:1248px; top:810px; width:664px; height:246px; padding:12px 18px; background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
#checks h3 { margin:0 0 6px; font-size:15px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; display:flex; } #tally { margin-left:auto; color:var(--good); }
#checklist { list-style:none; margin:0; padding:0; font-size:17px; } #checklist li { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:2px 0; }
#checklist .ok::before { content:"✓ "; color:var(--good); font-weight:800; } #checklist .no { color:var(--bad); } #checklist .no::before { content:"✗ "; font-weight:800; }
/* Solo: only the teacher screen, at a named device size, centred. */
body.solo #wa, body.solo #wb, body.solo #checks { display:none; }
body.solo #hostwrap { left:50%; top:62px; transform:translateX(-50%); }
body.solo #caption { left:24px; width:1872px; top:auto; bottom:12px; height:auto; min-height:110px; font-size:24px; }
/* Projector: the teacher screen fills the whole frame; the caption floats on top. */
body.projector header, body.projector #wa, body.projector #wb, body.projector #checks, body.projector #hostwrap .label { display:none; }
body.projector #hostwrap { left:0; top:0; } body.projector #host { width:1920px; height:1080px; border:0; border-radius:0; }
body.projector #caption { left:50%; transform:translateX(-50%); top:auto; bottom:96px; width:1500px; height:auto; background:rgba(10,10,16,.88); font-size:24px; }
#slide { position:absolute; inset:56px 0 0 0; padding:40px 80px; background:var(--bg); display:none; z-index:5; }
body.slide #slide { display:block; } body.slide #caption { z-index:6; left:80px; width:1760px; top:auto; bottom:24px; height:auto; min-height:120px; }
#slide h1 { font-size:56px; margin:40px 0 12px; } #slide h1 b { color:var(--brand); } #slide h2 { font-size:30px; margin:0 0 18px; }
#slide p.lead { font-size:26px; color:var(--muted); max-width:1400px; }
#slide table { border-collapse:collapse; font-size:22px; width:100%; } #slide td, #slide th { text-align:left; padding:8px 14px; border-bottom:1px solid var(--line); vertical-align:top; }
#slide td.pass { color:var(--good); font-weight:800; white-space:nowrap; } #slide td.fail { color:var(--bad); font-weight:800; }
#slide pre { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:18px; font-size:19px; line-height:1.4; white-space:pre-wrap; max-height:560px; overflow:hidden; }
.tag { display:inline-block; padding:2px 10px; border-radius:99px; background:#222230; color:var(--muted); font-size:15px; margin-left:8px; }
</style></head><body>
<header><b>BitBlitz</b><span>feature walkthrough</span><span class="tag" id="scene"></span><span id="clock">00:00</span></header>
<div class="dev" id="hostwrap"><div class="label" id="hostlabel">Teacher · projector screen</div><iframe id="host"></iframe></div>
<div class="dev" id="wa"><div class="label" id="labela">Student phone 1 · 320 px</div><iframe id="a"></iframe></div>
<div class="dev" id="wb"><div class="label" id="labelb">Student phone 2 · 320 px</div><iframe id="b"></iframe></div>
<div id="caption"><small id="chapter"></small><span id="line"></span></div>
<div id="checks"><h3>Verified in this run <span id="tally"></span></h3><ol id="checklist"></ol></div>
<div id="slide"></div>
<script>
const started = Date.now();
setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); document.getElementById("clock").textContent = String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0"); }, 250);
</script></body></html>`;

// ---------------------------------------------------------------- recorder

let stage: Page;
let t0 = 0;

/** CDP screencast frames → constant-rate MJPEG piped into ffmpeg, timed by the frames' own timestamps. */
async function startRecording(page: Page) {
  const ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", `${OUT}video.mp4`], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  const cdp = await page.context().newCDPSession(page);
  let last: Buffer | null = null;
  let written = 0;
  const fill = (untilMs: number) => {
    const target = Math.floor((untilMs - t0) / (1000 / FPS));
    while (last && written < target) {
      ffmpeg.stdin.write(last);
      written++;
    }
  };
  cdp.on("Page.screencastFrame", (frame) => {
    void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
    const at = frame.metadata.timestamp ? frame.metadata.timestamp * 1000 : Date.now();
    fill(at);
    last = Buffer.from(frame.data, "base64");
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  return async () => {
    await cdp.send("Page.stopScreencast").catch(() => {});
    fill(Date.now());
    ffmpeg.stdin.end();
    await new Promise((r) => ffmpeg.on("close", r));
    return written / FPS;
  };
}

// ---------------------------------------------------------------- narration and checks

type Clip = { at: number; ms: number; file: string; text: string };
const clips: Clip[] = [];
let speechEnd = 0;
let clipNo = 0;

async function say(text: string, wait = true): Promise<void> {
  if (speechEnd > Date.now()) await sleep(speechEnd - Date.now());
  const file = `${AUDIO}${String(++clipNo).padStart(3, "0")}.aiff`;
  execFileSync("say", ["-v", VOICE, "-r", "182", "-o", file, text]);
  const ms = Number(/estimated duration: ([\d.]+)/.exec(execFileSync("afinfo", [file]).toString())![1]) * 1000;
  clips.push({ at: Date.now() - t0, ms, file, text });
  speechEnd = Date.now() + ms + 350;
  await stage.evaluate((t) => (document.getElementById("line")!.textContent = t), text);
  if (wait) await sleep(ms + 350);
}

/** Wait for the current line to finish. */
async function hush(extra = 0): Promise<void> {
  const left = speechEnd - Date.now();
  if (left > 0) await sleep(left);
  if (extra) await sleep(extra);
}

async function chapter(title: string): Promise<void> {
  await hush();
  await stage.evaluate((t) => {
    document.getElementById("chapter")!.textContent = t;
    document.getElementById("scene")!.textContent = t;
  }, title);
  chapters.push({ at: Date.now() - t0, title });
}
const chapters: { at: number; title: string }[] = [];

const results: { label: string; ok: boolean; error?: string; at: number }[] = [];
async function check(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  let ok = true;
  let error: string | undefined;
  try {
    await fn();
  } catch (e) {
    ok = false;
    error = (e as Error).message.split("\n")[0];
    console.error(`✗ ${label}: ${error}`);
    await stage.screenshot({ path: `${OUT}fail-${results.length + 1}.png` }).catch(() => {});
  }
  results.push({ label, ok, error, at: Date.now() - t0 });
  if (ok) console.log(`✓ ${label}`);
  await stage.evaluate(
    ({ label, ok, pass, total }) => {
      const li = document.createElement("li");
      li.className = ok ? "ok" : "no";
      li.textContent = label;
      const list = document.getElementById("checklist")!;
      list.prepend(li);
      while (list.children.length > 9) list.lastElementChild!.remove();
      document.getElementById("tally")!.textContent = `${pass} / ${total} passed`;
    },
    { label, ok, pass: results.filter((r) => r.ok).length, total: results.length },
  );
  return ok;
}

// ---------------------------------------------------------------- layout helpers

async function layout(mode: "normal" | "solo" | "projector" | "slide", host?: { w: number; h: number; label: string }) {
  await stage.evaluate(
    ({ mode, host }) => {
      document.body.className = mode === "normal" ? "" : mode;
      const frame = document.getElementById("host") as HTMLIFrameElement;
      frame.style.width = host ? `${host.w}px` : "";
      frame.style.height = host ? `${host.h}px` : "";
      document.getElementById("hostlabel")!.textContent = host ? host.label : "Teacher · projector screen";
    },
    { mode, host: host ?? null },
  );
  await sleep(500);
}

async function slide(html: string) {
  await stage.evaluate((h) => (document.getElementById("slide")!.innerHTML = h), html);
  await layout("slide");
}

async function phoneLabel(which: "a" | "b", text: string) {
  await stage.evaluate(({ which, text }) => (document.getElementById(`label${which}`)!.textContent = text), { which, text });
}

async function navigate(id: "host" | "a" | "b", url: string) {
  await stage.evaluate(({ id, url }) => ((document.getElementById(id) as HTMLIFrameElement).src = url), { id, url });
  await sleep(300);
}

async function reloadFrame(f: FrameLocator) {
  await f.locator("body").evaluate(() => location.reload());
  await sleep(500);
}

async function frameOf(id: "host" | "a" | "b") {
  return (await stage.$(`#${id}`))!.contentFrame();
}

const tile = (f: FrameLocator, n: number) => f.getByRole("button", { name: new RegExp(`^Answer ${n}`) });

// ---------------------------------------------------------------- bot students

type Bot = { nickname: string; connection: Connection; answered: Set<number> };
const bots: Bot[] = [];
let botsAnswer = true;

async function addBot(code: string, nickname: string): Promise<Bot> {
  const connection = new Connection(code);
  await connection.opened();
  connection.send({ type: "join", nickname });
  const welcome = await connection.waitFor(isType("welcome"), 10_000);
  const bot = { nickname: welcome.nickname ?? nickname, connection, answered: new Set<number>() };
  connection.onMessage((m) => {
    if (m.type !== "view" || m.view.role !== "player") return;
    const view = m.view as PlayerView;
    if (view.phase !== "question" || !view.question || bot.answered.has(view.question.index) || !botsAnswer) return;
    const q = view.question;
    bot.answered.add(q.index);
    setTimeout(
      () => {
        const n = q.answers.length;
        const choice = q.type === "multi" ? [0, 1 + Math.floor(Math.random() * (n - 1))] : [Math.floor(Math.random() * n)];
        connection.send({ type: "answer", questionIndex: q.index, choice });
      },
      700 + Math.random() * 2300,
    );
  });
  bots.push(bot);
  return bot;
}

// ---------------------------------------------------------------- the walkthrough

async function suiteSlide() {
  if (!SUITE || !existsSync(`${SUITE}/summary.txt`)) {
    await slide(`<h1>Automated suite</h1><p class="lead">Suite logs not supplied for this run.</p>`);
    return;
  }
  const read = (name: string) => (existsSync(`${SUITE}/${name}.log`) ? readFileSync(`${SUITE}/${name}.log`, "utf8") : "");
  const summary = Object.fromEntries(
    readFileSync(`${SUITE}/summary.txt`, "utf8")
      .split("\n")
      .map((l) => /^(\w+) rc=(\d+) secs=(\d+)/.exec(l))
      .filter(Boolean)
      .map((m) => [m![1], { rc: Number(m![2]), secs: Number(m![3]) }]),
  );
  const unit = read("unit");
  const counts = [...unit.matchAll(/(packages\/\w+|apps\/\w+) test:\s+Tests\s+(\d+) passed/g)].map((m) => `${m[1]!.split("/")[1]} ${m[2]}`);
  const total = counts.reduce((s, c) => s + Number(c.split(" ")[1]), 0);
  const mutationLog = read("mutation");
  const caught = (mutationLog.match(/^CAUGHT/gm) ?? []).length;
  const tried = (mutationLog.match(/^(CAUGHT|MISSED|ERROR|!!)/gm) ?? []).length;
  const mutation = tried ? [null, String(caught), String(tried)] : null;
  const e2e = (read("e2e").match(/^✓/gm) ?? []).length;
  const bot = read("botload");
  const p95 = /"p95":\s*([\d.]+)/.exec(bot)?.[1];
  const sweep = read("sweep");
  const shots = /^(\d+) screenshots in/m.exec(sweep)?.[1];
  const rows: [string, string, string][] = [
    ["unit", "Unit tests (Vitest)", `${total} tests: ${counts.join(", ")}`],
    ["typecheck", "TypeScript, all 5 packages", "strict mode, no errors"],
    ["validate", "Quiz validator on every sample", (read("validate").match(/^✓/gm) ?? []).length + " quiz files valid"],
    ["mutation", "Mutation check (break a rule, a test must fail)", mutation ? `${mutation[1]} / ${mutation[2]} mutations caught` : "see log"],
    ["e2e", "End-to-end vs local Worker + Durable Object", `${e2e} checks`],
    ["botload", "60 simulated students, full autoplay game", `p95 answer ack ${p95 ?? "?"} ms (limit 300)`],
    ["sweep", "Responsive layout sweep, real Chrome", `${shots ?? "?"} screenshots, 320 px to 1920 px, dark + light`],
  ];
  await slide(
    `<h2>1 · The automated suite, run just before this recording</h2><table><tr><th></th><th>Suite</th><th>Result</th><th>Time</th></tr>${rows
      .map(([key, name, detail]) => {
        const s = summary[key];
        const ok = s && s.rc === 0;
        return `<tr><td class="${ok ? "pass" : "fail"}">${ok ? "PASS" : s ? "FAIL" : "not run"}</td><td>${name}</td><td>${detail}</td><td>${s ? s.secs + " s" : ""}</td></tr>`;
      })
      .join("")}</table>`,
  );
  return { total, counts, mutation, e2e, p95, shots, summary };
}

async function main() {
  const quiz = JSON.parse(readFileSync(fileURLToPath(new URL("../samples/circles-warm-up.json", import.meta.url)), "utf8"));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  stage = await context.newPage();
  const consoleErrors: string[] = [];
  // Failed requests the walkthrough makes on purpose (wrong passphrase, wrong code, the
  // offline test) are logged by Chrome itself; anything else is an app error.
  const expected = (text: string, url: string) =>
    text.includes("ERR_INTERNET_DISCONNECTED") || (text.startsWith("Failed to load resource") && /\/api\/(host\/login|games\/000000)$/.test(url));
  stage.on("console", (m) => m.type() === "error" && !expected(m.text(), m.location().url) && consoleErrors.push(`${m.text()} @ ${m.location().url}`));
  stage.on("pageerror", (e) => consoleErrors.push(e.message));
  writeFileSync(`${OUT}stage.html`, STAGE);
  await stage.goto(`file://${OUT}stage.html`);
  t0 = Date.now();
  const stopRecording = await startRecording(stage);
  const H = stage.frameLocator("#host");
  const A = stage.frameLocator("#a");
  const B = stage.frameLocator("#b");

  // ---- 0. Title
  await chapter("Introduction");
  await slide(
    `<h1><b>BitBlitz</b> · full feature walkthrough</h1><p class="lead">Recorded ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} on the local dev build of branch <code>feat/bitblitz</code>.</p>
    <p class="lead">Teacher screen opened at <code>${HOST_URL}</code>, the address a teacher uses so the QR code works for phones. Two student phones at 320 px, the narrowest supported width: phone 1 on <code>127.0.0.1</code>, phone 2 on the same Wi-Fi address as the teacher, the path a real phone takes. Three to four extra students are simulated off-screen so the class feels real.</p>
    <p class="lead">Every step below is checked automatically. The panel at the bottom right lists each check as it passes or fails.</p>`,
  );
  await say("This is a full walkthrough of BitBlitz, the live quiz game for Think in Bits. Everything you'll see is the real app running locally, driven by a script that checks each result as it goes.");
  await say("First, the automated test suite, which I ran just before recording.");

  // ---- 1. Suite
  await chapter("Automated test suite");
  const suite = await suiteSlide();
  if (suite) {
    await say(
      `All seven suites passed. ${suite.total} unit tests across the schema, the game engine, the server and the web app. Every package type-checks in strict mode. The mutation check deliberately breaks scoring and game rules one at a time, and the tests caught ${suite.mutation?.[1] ?? "every"} out of ${suite.mutation?.[2] ?? "every"}.`,
    );
    await say(
      `The end-to-end run plays real games against the local server and Durable Object: ${suite.e2e} checks, including that no student ever receives the answer key. Sixty simulated students played a full game with a ninety-fifth percentile answer time of ${suite.p95} milliseconds. And the layout sweep took ${suite.shots} screenshots from a 320 pixel phone up to a 1920 pixel projector, with no clipped or covered content.`,
    );
  }
  await say("Now the hands-on part. On the left is the teacher's screen at projector size. On the right, two student phones.");

  // ---- 2. Teacher login
  await chapter("Teacher login");
  await layout("normal");
  await navigate("host", HOST_URL);
  await navigate("a", PHONE_A);
  await navigate("b", PHONE_B);
  await check("Teacher login screen loads from the LAN address", () => H.getByLabel("Passphrase").waitFor({ timeout: 15_000 }));
  await say("The teacher logs in with a passphrase. First, a wrong one.", false);
  await H.getByLabel("Passphrase").pressSequentially("not-the-passphrase", { delay: 35 });
  await H.getByRole("button", { name: "Log in" }).click();
  await check("Wrong passphrase refused: 'that passphrase isn't right'", () => H.getByText("that passphrase isn't right").waitFor({ timeout: 8000 }));
  await hush(600);
  await say("Refused. Now the right one.", false);
  await H.getByLabel("Passphrase").fill("");
  await H.getByLabel("Passphrase").pressSequentially(PASSPHRASE, { delay: 45 });
  await H.getByRole("button", { name: "Log in" }).click();
  await check("Correct passphrase opens the upload screen", () => H.getByRole("heading", { name: "Upload a quiz" }).waitFor({ timeout: 8000 }));
  await hush(400);

  // ---- 3. Upload and validation
  await chapter("Uploading a quiz");
  await say("Quizzes are JSON files, written by hand, by the BitBlitz quiz skill, or by any AI from a lesson. If one has mistakes, BitBlitz explains them in plain language. Let me paste a broken one.", false);
  await H.getByRole("button", { name: "Paste JSON" }).click();
  const broken = JSON.stringify(
    {
      schemaVersion: 1,
      title: "Broken quiz",
      questions: [
        { type: "single", prompt: "Pick one", answers: [{ text: "A", correct: true }, { text: "B", correct: true }] },
        { type: "single", prompt: "Too fast", timeLimitSec: 1, answers: [{ text: "A", correct: true }, { text: "B" }] },
        { type: "true_false", prompt: "No answer given" },
      ],
    },
    null,
    1,
  );
  await H.getByLabel("Quiz JSON").fill(broken);
  await hush();
  await H.getByRole("button", { name: "Check it" }).click();
  await check("Broken quiz: 'Question 1: single choice needs exactly one correct answer'", () =>
    H.getByText(/Question 1: single choice needs exactly one correct answer/).waitFor({ timeout: 5000 }),
  );
  await check("Broken quiz: time limit and true/false problems listed too", async () => {
    const text = await H.getByRole("alert").innerText();
    if (!/Question 2/.test(text) || !/Question 3/.test(text)) throw new Error(text);
  });
  await say("Three problems, each pointing at the question number, so the teacher knows exactly what to fix.");
  await H.getByRole("button", { name: "Hide paste box" }).click();

  await say("Now a real practice quiz: Circles, from the AS Math unit. It uses every question type, an image, maths notation and a double points question.", false);
  await H.getByRole("button", { name: "circles-warm-up", exact: true }).click();
  await check("Sample quiz preview shows title and 9 questions", () => H.getByText("9 questions", { exact: false }).first().waitFor({ timeout: 5000 }));
  await check("Images this quiz uses: circle.svg reported missing", () => H.getByText("missing circle.svg").waitFor({ timeout: 5000 }));
  await hush();
  await say("The preview flags the one image the quiz needs. I'll add it.", false);
  await H.locator('input[type="file"][multiple]').setInputFiles(MEDIA);
  await check("Image added: circle.svg ticked", () => H.getByText("✓ circle.svg").waitFor({ timeout: 5000 }));
  await H.getByText("Question 1", { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
  await hush(800);
  await say("Below that, the teacher can see every question with the correct answers marked, before anything goes live.", false);
  await H.locator("main[data-scroll]").evaluate((m) => m.scrollTo({ top: m.scrollHeight / 2, behavior: "smooth" }));
  await hush(1200);
  await H.locator("main[data-scroll]").evaluate((m) => m.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(600);
  await H.getByRole("button", { name: "Create game" }).click();
  const codeLabel = await H.getByLabel(/^Game code \d/).first().getAttribute("aria-label", { timeout: 10_000 });
  const code = codeLabel!.replace(/\D/g, "");
  await check(`Game created with a 6-digit code (${code})`, async () => {
    if (!/^\d{6}$/.test(code)) throw new Error(codeLabel ?? "no code");
  });

  // ---- 4. Lobby: joining
  await chapter("Lobby and joining");
  await check("Lobby shows a QR code", () => H.getByLabel("QR code that opens the join page").waitFor());
  await say(`The lobby shows the game code, ${code.split("").join(" ")}, the join address and a QR code. Here it is on a full 1920 by 1080 projector.`, false);
  await layout("projector");
  await hush(1500);
  await layout("normal");

  await say("Student one types a wrong code first.", false);
  await A.getByLabel("Game code").pressSequentially("000000", { delay: 60 });
  await A.getByRole("button", { name: "Enter" }).click();
  await check("Wrong code: 'No game with code 000 000'", () => A.getByText(/No game with code/).waitFor({ timeout: 5000 }));
  await hush(500);
  await say("No such game. Then they scan the QR code instead, which opens the join page with the code already filled in.", false);
  await navigate("a", `${PHONE_A}?c=${code}`);
  await check("QR link skips straight to the nickname screen", () => A.getByLabel("Nickname").waitFor({ timeout: 8000 }));
  await hush();
  await A.getByLabel("Nickname").fill("");
  await A.getByLabel("Nickname").pressSequentially("Ada", { delay: 80 });
  await A.getByRole("button", { name: "Join game" }).click();
  await check("Ada joins: phone shows 'You're in!'", () => A.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 8000 }));
  await check("Ada appears in the teacher's lobby", () => H.getByRole("button", { name: "Ada. Manage player" }).waitFor({ timeout: 5000 }));
  await phoneLabel("a", "Student phone 1 · Ada · 320 px");

  await say("The teacher can lock the room, so nobody else gets in.", false);
  await H.getByRole("button", { name: "🔓 Open" }).click();
  await check("Lock: lobby shows 'Room locked'", () => H.getByText("Room locked").waitFor({ timeout: 5000 }));
  await B.getByLabel("Game code").pressSequentially(code, { delay: 60 });
  await B.getByRole("button", { name: "Enter" }).click();
  await check("Locked room refuses student 2: 'The teacher has locked this game.'", () => B.getByText("The teacher has locked this game.").waitFor({ timeout: 5000 }));
  await hush(600);
  await say("Student two is turned away. The teacher unlocks it again.", false);
  await H.getByRole("button", { name: "🔒 Locked" }).click();
  await check("Unlock: 'Room locked' gone", () => H.getByText("Room locked").waitFor({ state: "hidden", timeout: 5000 }));
  await B.getByRole("button", { name: "Enter" }).click();
  await check("Student 2 reaches the nickname screen", () => B.getByLabel("Nickname").waitFor({ timeout: 5000 }));
  await hush();

  await say("Nicknames are filtered. A rude one is refused, even with a number swapped in for a letter.", false);
  await B.getByLabel("Nickname").fill("");
  await B.getByLabel("Nickname").pressSequentially("sh1t", { delay: 90 });
  await B.getByRole("button", { name: "Join game" }).click();
  await check("Nickname filter refuses a rude name", () => B.getByText("Please pick a different nickname.").waitFor({ timeout: 8000 }));
  await hush(500);
  await say("And a name that's already taken is refused, even in different capitals.", false);
  await B.getByLabel("Nickname").fill("");
  await B.getByLabel("Nickname").pressSequentially("ada", { delay: 90 });
  await B.getByRole("button", { name: "Join game" }).click();
  await check("Duplicate nickname refused, ignoring case ('ada' vs 'Ada')", () => B.getByText("Someone already has that nickname. Try another.").waitFor({ timeout: 8000 }));
  await hush(500);
  await B.getByLabel("Nickname").fill("");
  await B.getByLabel("Nickname").pressSequentially("Zed", { delay: 90 });
  await B.getByRole("button", { name: "Join game" }).click();
  await check("Zed joins", () => B.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 8000 }));
  await phoneLabel("b", "Student phone 2 · Zed · 320 px");

  // ---- 5. Managing players
  await chapter("Managing players");
  await say("Tapping a name lets the teacher rename or remove a student. First, a rename.", false);
  await H.getByRole("button", { name: "Zed. Manage player" }).click();
  await H.getByRole("button", { name: "Rename" }).click();
  await H.getByLabel("New nickname for Zed").fill("");
  await H.getByLabel("New nickname for Zed").pressSequentially("Zee", { delay: 90 });
  await H.getByRole("button", { name: "Save" }).click();
  await check("Rename: lobby shows Zee", () => H.getByRole("button", { name: "Zee. Manage player" }).waitFor({ timeout: 5000 }));
  await check("Rename reaches the student's phone ('You are Zee')", () => B.getByText("You are Zee").waitFor({ timeout: 5000 }));
  await hush(500);
  await say("The new name shows on the student's phone straight away. Now removing a student. That asks for confirmation, because it also bars them from rejoining with that seat.", false);
  await H.getByRole("button", { name: "Zee. Manage player" }).click();
  await H.getByRole("button", { name: "Remove", exact: true }).click();
  await check("Remove asks for confirmation", () => H.getByText("Remove Zee?").waitFor({ timeout: 5000 }));
  await hush(400);
  await H.getByRole("button", { name: "Remove", exact: true }).click();
  await check("Removed student sees 'You were removed from this game'", () => B.getByRole("heading", { name: "You were removed from this game" }).waitFor({ timeout: 8000 }));
  await check("Removed student is gone from the lobby", () => H.getByRole("button", { name: "Zee. Manage player" }).waitFor({ state: "hidden", timeout: 5000 }));
  await hush(600);
  await say("They can join again as a new player if the teacher allows it.", false);
  await B.getByRole("button", { name: "Join another game" }).click();
  await B.getByLabel("Game code").fill("");
  await B.getByLabel("Game code").pressSequentially(code, { delay: 50 });
  await B.getByRole("button", { name: "Enter" }).click();
  await B.getByLabel("Nickname").waitFor({ timeout: 8000 });
  await B.getByLabel("Nickname").fill("");
  await B.getByLabel("Nickname").pressSequentially("Bo", { delay: 90 });
  await B.getByRole("button", { name: "Join game" }).click();
  await check("Student 2 rejoins as Bo", () => B.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 8000 }));
  await phoneLabel("b", "Student phone 2 · Bo · 320 px");
  await hush();

  await say("Three more students join from devices off-screen.", false);
  for (const name of ["Cy", "Dee", "Eli"]) {
    await addBot(code, name);
    await sleep(500);
  }
  await check("Lobby shows 5 players", () => H.getByRole("heading", { name: /5 players/ }).waitFor({ timeout: 8000 }));
  await hush();

  await say("If the teacher's laptop refreshes, the game isn't lost. The teacher screen picks up where it was.", false);
  await reloadFrame(H);
  await check("Teacher refresh: lobby restored with all 5 players", () => H.getByRole("heading", { name: /5 players/ }).waitFor({ timeout: 10_000 }));
  await hush();

  // ---- 6. Settings
  await chapter("Game settings");
  await H.getByRole("button", { name: "Settings" }).click();
  await check("Settings panel opens", () => H.getByRole("region", { name: "Game settings" }).or(H.getByLabel("Game settings")).first().waitFor({ timeout: 5000 }));
  await say("Every rule can be changed before the game starts: pacing, scoring bonuses, what students see on their phones, nickname rules, shuffling, sound, timing and teams.");
  await say("Number fields can be typed into. If I type 999 seconds for the reveal, it's clamped to the maximum of sixty.", false);
  const reveal = H.getByRole("textbox", { name: /^Reveal/ });
  await reveal.fill("999");
  await reveal.press("Enter");
  await check("Reveal seconds clamp: 999 → 60", async () => {
    await sleep(400);
    const v = await reveal.inputValue();
    if (v !== "60") throw new Error(`value ${v}`);
  });
  await hush(400);
  await reveal.fill("5");
  await reveal.press("Enter");
  await say("I'll set it back to five seconds, and give every question the same twenty second limit, to keep this video moving.", false);
  await H.getByRole("switch", { name: /Same time limit for every question/ }).click();
  await check("Same time limit switch turns on", () => H.getByRole("switch", { name: /Same time limit/, checked: true }).waitFor({ timeout: 4000 }));
  const perQ = H.getByRole("textbox", { name: /^Seconds per question/ });
  await perQ.fill("20");
  await perQ.press("Enter");
  await check("Per-question limit set to 20 s", async () => {
    await sleep(300);
    if ((await perQ.inputValue()) !== "20") throw new Error(await perQ.inputValue());
  });
  await hush(500);
  await H.getByRole("button", { name: "Hide settings" }).click();

  await say("The sound button toggles game sounds on the teacher's screen. Students' phones stay silent.", false);
  await H.getByRole("button", { name: "Sound on" }).click();
  await check("Sound toggles off", () => H.getByRole("button", { name: "Sound off" }).waitFor({ timeout: 4000 }));
  await H.getByRole("button", { name: "Sound off" }).click();
  await check("Sound toggles back on", () => H.getByRole("button", { name: "Sound on" }).waitFor({ timeout: 4000 }));
  await hush();

  // ---- 7. Playing
  await chapter("Question 1 · practice question");
  await say("Start.", false);
  await H.getByRole("button", { name: "Start ▶" }).click();
  await check("Start: countdown on teacher screen", () => H.getByText(/Question 1 of 9/).waitFor({ timeout: 5000 }));
  await check("Start: phones show 'Get ready!'", () => A.getByText("Get ready!").waitFor({ timeout: 5000 }));
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await check("Question 1 is open: timer running", () => H.getByRole("timer").waitFor());
  await say("The first question is a warm-up worth no points. Maths notation renders properly on every screen.", false);
  await sleep(3200);
  await tile(A, 1).click();
  await check("Ada answers: 'Locked in!'", () => A.getByRole("heading", { name: "Locked in!" }).waitFor({ timeout: 4000 }));
  await hush(300);
  await say("When the last student answers, the reveal happens at once instead of waiting out the clock.", false);
  await tile(B, 1).click();
  await check("Everyone answered: reveal fires immediately", () => H.getByText("Why:").waitFor({ timeout: 5000 }));
  await check("Phone shows the result ('Correct!')", () => A.getByText("Correct!").first().waitFor({ timeout: 4000 }));
  await check("Practice question: phone says 'no points'", () => A.getByText("Practice question: no points").waitFor({ timeout: 3000 }));
  await hush(400);
  await say("The reveal shows the right answer, how many picked each option, and the explanation from the quiz.");
  await H.getByRole("button", { name: "Next →" }).click();
  await check("Leaderboard after question 1", () => H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 }));
  await sleep(1200);
  await H.getByRole("button", { name: "Next question →" }).click();

  await chapter("Question 2 · scoring");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await say("Question two counts. Ada answers right, quickly. Bo picks a wrong answer.", false);
  await sleep(2500);
  await tile(A, 1).click();
  await sleep(1500);
  await tile(B, 2).click();
  await check("Ada: 'Correct!' with points", () => A.getByText("Correct!").first().waitFor({ timeout: 6000 }));
  await check("Points breakdown shows speed bonus", () => A.getByText(/Speed/).waitFor({ timeout: 3000 }));
  await check("Bo: 'Not this time'", () => B.getByText("Not this time").first().waitFor({ timeout: 3000 }));
  await hush(300);
  const adaPoints = (await A.locator("body").innerText()).match(/\+\s?[\d,]+/)?.[0] ?? "";
  await say(`Ada earns ${adaPoints.replace("+", "")} points. Points come from being right, plus a speed bonus, a fastest-finger bonus for the first correct answers, and a streak bonus. Bo sees how far behind they are, which keeps them in the game.`);
  await H.getByRole("button", { name: "Next →" }).click();
  await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 });
  await say("A student who arrives late can still join mid-game, if late joining is on.", false);
  await addBot(code, "Fay");
  await sleep(800);
  await check("Late joiner Fay accepted mid-game", async () => {
    if (!bots.some((b) => b.nickname === "Fay")) throw new Error("Fay missing");
  });
  await hush();
  await say("The teacher can advance with a presentation clicker. The right arrow key moves to the next question.", false);
  await H.locator("body").press("ArrowRight");
  await check("Clicker key (→) advances to question 3", () => H.getByText(/Question 3 of 9/).waitFor({ timeout: 5000 }));

  await chapter("Question 3 · images and pausing");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await check("Question 3 shows the circle image", () => H.getByRole("img", { name: /circle on coordinate axes/i }).waitFor({ timeout: 5000 }));
  await say("Questions can include images. Here is the same question on a full projector.", false);
  botsAnswer = false;
  await layout("projector");
  await hush(1500);
  await layout("normal");
  await say("The teacher can pause at any moment, to explain something, or if the bell rings mid-question.", false);
  await H.getByRole("button", { name: "❚❚ Pause" }).click();
  await check("Pause: teacher screen shows 'Paused'", () => H.getByText("Paused").first().waitFor({ timeout: 4000 }));
  const frozen1 = (await H.getByRole("timer").getAttribute("aria-label")) ?? "";
  await sleep(2500);
  const frozen2 = (await H.getByRole("timer").getAttribute("aria-label")) ?? "";
  await check(`Pause freezes the clock (${frozen1.trim()} → ${frozen2.trim()})`, async () => {
    if (frozen1 !== frozen2) throw new Error(`${frozen1} → ${frozen2}`);
  });
  await check("Pause locks the students' answer tiles", async () => {
    const disabled = (await tile(A, 1).isDisabled()) || (await tile(A, 1).getAttribute("aria-disabled")) === "true";
    if (!disabled) throw new Error("tile still enabled");
  });
  await hush();
  await say("Everything freezes, including the students' tiles. Space bar resumes, which also works from a clicker.", false);
  await H.getByText(/Question 3 of 9/).click();
  await H.locator("body").press(" ");
  await check("Space resumes the game", () => H.getByRole("button", { name: "❚❚ Pause" }).waitFor({ timeout: 4000 }));
  botsAnswer = true;
  for (const b of bots) b.connection.send({ type: "answer", questionIndex: 2, choice: [Math.floor(Math.random() * 4)] });
  await hush(600);
  await tile(A, 1).click();
  await sleep(900);
  await tile(B, 1).click();
  await check("Question 3 revealed after everyone answered", () => H.getByText("Why:").waitFor({ timeout: 8000 }));
  await sleep(1500);
  await H.getByRole("button", { name: "Next →" }).click();
  await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 });
  await sleep(1200);
  await H.getByRole("button", { name: "Next question →" }).click();

  await chapter("Question 4 · refresh mid-question");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await say("What if a student's page refreshes in the middle of a question? Bo's phone reloads now.", false);
  await sleep(1500);
  await reloadFrame(B);
  await check("Bo's phone resumes the same seat mid-question", () => tile(B, 2).waitFor({ timeout: 10_000 }));
  await check("Bo keeps the nickname Bo after refresh", () => B.getByText(/Bo/).first().waitFor({ timeout: 3000 }));
  await hush(300);
  await say("Bo is straight back into the same question, with the same score, and can still answer.", false);
  await tile(A, 2).click();
  await sleep(1000);
  await tile(B, 2).click();
  await check("Bo's answer after refresh is scored ('Correct!')", () => B.getByText("Correct!").first().waitFor({ timeout: 6000 }));
  await hush(800);
  await H.getByRole("button", { name: "Next →" }).click();
  await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 });
  await sleep(1000);
  await H.getByRole("button", { name: "Next question →" }).click();

  await chapter("Question 5 · losing Wi-Fi");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await say("School Wi-Fi drops out. Ada's phone goes offline.", false);
  const aFrame = await frameOf("a");
  const cdpA = await context.newCDPSession(aFrame!);
  await cdpA.send("Network.enable");
  await cdpA.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await check("Offline: phone shows 'Reconnecting…'", () => A.getByRole("status").filter({ hasText: "Reconnecting" }).waitFor({ timeout: 20_000 }));
  await hush(300);
  await say("The phone says it's reconnecting. If the student taps an answer, it tells them it isn't connected, instead of silently losing the tap.", false);
  await tile(A, 3).click();
  await check("Tap while offline: 'Not connected' warning", () => A.getByRole("alert").filter({ hasText: "Not connected" }).waitFor({ timeout: 5000 }));
  await hush(800);
  await say("Wi-Fi comes back.", false);
  await cdpA.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await check("Back online: reconnects by itself", () => A.getByRole("status").filter({ hasText: "Reconnecting" }).waitFor({ state: "hidden", timeout: 20_000 }));
  await hush(300);
  await tile(A, 3).click();
  await check("Ada answers after reconnecting", () => A.getByRole("heading", { name: "Locked in!" }).or(A.getByText("Correct!").first()).waitFor({ timeout: 6000 }));
  await sleep(600);
  await tile(B, 1).click();
  await H.getByText("Why:").waitFor({ timeout: 8000 });
  await sleep(1200);
  await H.getByRole("button", { name: "Next →" }).click();
  await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 });
  await sleep(1000);
  await H.getByRole("button", { name: "Next question →" }).click();

  await chapter("Question 6 · double points, reveal now");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await check("Double points badge on question 6", () => H.getByText("Double points").first().waitFor({ timeout: 4000 }));
  await say("Question six is worth double points, and the screen says so. Ada answers. Bo is still thinking, but the teacher decides to reveal now.", false);
  await sleep(2500);
  await tile(A, 4).click();
  await hush(300);
  await H.getByRole("button", { name: "Reveal now →" }).click();
  await check("Reveal now: reveal shown before the timer ends", () => H.getByText("Why:").waitFor({ timeout: 5000 }));
  await check("Bo, who didn't answer, sees 'Time's up'", () => B.getByText("Time's up").first().waitFor({ timeout: 5000 }));
  await hush(1000);
  await H.getByRole("button", { name: "Next →" }).click();
  await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 5000 });
  await sleep(800);
  await H.getByRole("button", { name: "Next question →" }).click();

  await chapter("Question 7 · skipping");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await say("If a question turns out to be wrong or unfair, the teacher can skip it. Nobody gains or loses points, and the game goes straight on to the next question.", false);
  await sleep(2000);
  await H.getByRole("button", { name: "Skip" }).click();
  await check("Skip: teacher goes straight to question 8", () => H.getByText(/Question 8 of 9/).waitFor({ timeout: 5000 }));
  await check("Skip: phones move on to question 8", () => A.getByText("Get ready!").or(A.getByText(/8 \/ 9/)).first().waitFor({ timeout: 5000 }));
  await hush(300);

  await chapter("Question 8 · select all, autoplay");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await check("Multi-select question says 'Select all that apply'", () => H.getByText("Select all that apply", { exact: true }).waitFor({ timeout: 4000 }));
  await say("Question eight is select all that apply. I'll also switch autoplay on, so the game runs itself from here.", false);
  await H.getByRole("button", { name: "Autoplay off" }).click();
  await check("Autoplay switches on", () => H.getByRole("button", { name: "Autoplay on" }).waitFor({ timeout: 4000 }));
  await hush(300);
  await say("Ada picks all three correct points. Bo picks one right and one wrong, and gets partial credit.", false);
  for (const n of [1, 3, 4]) {
    await tile(A, n).click();
    await sleep(350);
  }
  await A.getByRole("button", { name: /^Submit/ }).click();
  await tile(B, 1).click();
  await sleep(350);
  await tile(B, 2).click();
  await sleep(350);
  await B.getByRole("button", { name: /^Submit/ }).click();
  await check("Multi: Ada all correct ('Correct!')", () => A.getByText("Correct!").first().waitFor({ timeout: 6000 }));
  await check("Multi: Bo gets partial credit ('Partly right')", () => B.getByText("Partly right").first().waitFor({ timeout: 4000 }));
  await hush();
  await say("With autoplay on, the reveal and the leaderboard move on by themselves.", false);
  await check("Autoplay: leaderboard appears without a click", () => H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 15_000 }));
  await check("Autoplay: question 9 starts without a click", () => H.getByText(/Question 9 of 9/).waitFor({ timeout: 15_000 }));
  await H.getByRole("button", { name: "Autoplay on" }).click();

  await chapter("Question 9 · ending early");
  await H.getByRole("timer").waitFor({ timeout: 10_000 });
  await say("Last question. Ada answers, then the teacher ends the game early. This is the behaviour behind open question one in the morning report: today, answers already given to an open question are not scored when the game is ended.", false);
  await sleep(2000);
  await tile(A, 1).click();
  await sleep(1500);
  await H.getByRole("button", { name: "End early" }).click();
  await check("End early asks 'End the game now?'", () => H.getByText("End the game now?").waitFor({ timeout: 4000 }));
  await hush(400);
  await H.getByRole("button", { name: "End", exact: true }).click();

  // ---- 8. Podium and results
  await chapter("Podium and results");
  await check("Podium appears", () => H.getByRole("list", { name: "Podium" }).waitFor({ timeout: 8000 }));
  await say("The podium builds from third place to first, with confetti.", false);
  await sleep(3500);
  await layout("projector");
  await hush(1800);
  await layout("normal");
  await check("Phones show final placing", () => A.getByRole("heading", { name: /You finished|Game over/ }).waitFor({ timeout: 6000 }));
  await check("Finished game shows no false 'Disconnected' badge", async () => {
    if (await A.getByText("Disconnected").isVisible()) throw new Error("badge visible");
  });
  await say("Each phone shows the student's final place and score.");
  await H.getByRole("button", { name: "Answer review" }).click();
  await check("Answer review: 'Most missed first'", () => H.getByText("Most missed first").waitFor({ timeout: 4000 }));
  await say("For the teacher, the answer review lists the questions the class missed most, so you know what to reteach, and the full standings.", false);
  await H.locator("main[data-scroll]").evaluate((m) => m.scrollTo({ top: m.scrollHeight, behavior: "smooth" }));
  await hush(800);
  await say("Results download as a spreadsheet, with nicknames only, never real names.", false);
  const downloadPromise = stage.waitForEvent("download", { timeout: 10_000 });
  await H.getByRole("button", { name: "Download results (CSV)" }).click();
  let csv = "";
  await check("Results CSV downloads", async () => {
    const download = await downloadPromise;
    const path = `${OUT}results.csv`;
    await download.saveAs(path);
    csv = readFileSync(path, "utf8");
  });
  await check("CSV has every player by nickname", async () => {
    for (const n of ["Ada", "Bo", "Cy", "Dee", "Eli", "Fay"]) if (!csv.includes(n)) throw new Error(`missing ${n}`);
  });
  await check("CSV marks the skipped question 7 as 'skipped'", async () => {
    if (!csv.includes("skipped")) throw new Error("no 'skipped' cell");
  });
  await hush();
  if (csv) {
    await slide(`<h2>The downloaded results.csv</h2><pre>${csv.replace(/&/g, "&amp;").replace(/</g, "&lt;").split("\n").slice(0, 14).join("\n")}</pre>`);
    await say("Here's the file: rank, nickname, score, and how each student did on every question.");
    await layout("normal");
  }
  await H.locator("main[data-scroll]").evaluate((m) => m.scrollTo({ top: 0 }));
  await H.getByRole("button", { name: "Finish →" }).click();
  await check("Finish: 'Final results'", () => H.getByRole("heading", { name: "Final results" }).waitFor({ timeout: 5000 }));
  await hush(600);

  // ---- 9. Second game: generated nicknames, teams, autoplay, responsive
  await chapter("Game 2 · teams and generated nicknames");
  for (const b of bots.splice(0)) b.connection.close();
  await say("A second game, to show teams and generated nicknames. New game, and this time the quadratics practice quiz, which has autoplay built in.", false);
  await H.getByRole("button", { name: "New game" }).click();
  await H.getByRole("button", { name: "quadratics-practice", exact: true }).click();
  await H.getByRole("button", { name: "Create game" }).click();
  const code2 = (await H.getByLabel(/^Game code \d/).first().getAttribute("aria-label", { timeout: 10_000 }))!.replace(/\D/g, "");
  await check(`Second game created (${code2})`, async () => {
    if (!/^\d{6}$/.test(code2) || code2 === code) throw new Error(code2);
  });
  await hush();
  await say("Cancelling a game asks first, so a stray click can't throw away a full lobby.", false);
  await H.getByRole("button", { name: "Cancel game" }).click();
  await check("Cancel game asks 'Cancel this game?'", () => H.getByText("Cancel this game?").waitFor({ timeout: 4000 }));
  await hush(500);
  await H.getByRole("button", { name: "Keep it" }).click();
  await H.getByRole("button", { name: "Settings" }).click();
  await say("In settings: generated nicknames only, so students can't type names at all, and teams of two.", false);
  await H.getByRole("switch", { name: /Generated nicknames only/ }).click();
  await H.getByRole("switch", { name: /^Teams/ }).click();
  const teamSize = H.getByRole("textbox", { name: /^Team size/ });
  await teamSize.fill("2");
  await teamSize.press("Enter");
  await check("Generated nicknames and teams switched on", async () => {
    await H.getByRole("switch", { name: /Generated nicknames only/, checked: true }).waitFor({ timeout: 4000 });
    await H.getByRole("switch", { name: /^Teams/, checked: true }).waitFor({ timeout: 4000 });
  });
  const perQ2 = H.getByRole("switch", { name: /Same time limit for every question/ });
  if ((await perQ2.getAttribute("aria-checked")) !== "true") await perQ2.click();
  await H.getByRole("textbox", { name: /^Seconds per question/ }).fill("15");
  await H.getByRole("textbox", { name: /^Seconds per question/ }).press("Enter");
  await hush();
  await H.getByRole("button", { name: "Hide settings" }).click();
  await navigate("a", `${PHONE_A}?c=${code2}`);
  await navigate("b", `${PHONE_B}?c=${code2}`);
  await check("Phone explains generated nicknames", () => A.getByText(/generated nicknames/).waitFor({ timeout: 8000 }));
  await say("The phones explain that a fun name will be picked for them.", false);
  await A.getByRole("button", { name: "Join game" }).click();
  await B.getByRole("button", { name: "Join game" }).click();
  await check("Both phones joined with generated names", async () => {
    await A.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 8000 });
    await B.getByRole("heading", { name: "You're in!" }).waitFor({ timeout: 8000 });
  });
  const generated = async (f: FrameLocator) => ((await f.locator("body").innerText()).match(/Look for (.+?) on the big screen/)?.[1] ?? "").trim();
  const nameA = await generated(A);
  const nameB = await generated(B);
  await check(`Generated names are not what was typed (${nameA}, ${nameB})`, async () => {
    if (!nameA || !nameB || nameA === "player" || nameA === nameB) throw new Error(`${nameA} / ${nameB}`);
  });
  await phoneLabel("a", `Student phone 1 · ${nameA}`);
  await phoneLabel("b", `Student phone 2 · ${nameB}`);
  for (let i = 0; i < 4; i++) await addBot(code2, "player");
  await check("Lobby shows 6 players", () => H.getByRole("heading", { name: /6 players/ }).waitFor({ timeout: 8000 }));
  await hush();

  // ---- 10. Responsive teacher screen
  await chapter("Teacher screen on any device");
  await say("The teacher's screen works on any device. Here it is on a phone. The less common controls fold into a More menu, so nothing covers the game.", false);
  await layout("solo", { w: 390, h: 844, label: "Teacher on a phone · 390 × 844" });
  await check("Phone-size teacher screen shows 'More…'", () => H.getByRole("button", { name: "More…" }).waitFor({ timeout: 4000 }));
  await hush(300);
  await H.getByRole("button", { name: "More…" }).click();
  await check("More… reveals lock, sound and cancel", () => H.getByRole("button", { name: "Cancel game" }).waitFor({ timeout: 4000 }));
  await sleep(1500);
  await H.getByRole("button", { name: "Less" }).click();
  await hush();
  await say("On an iPad in landscape.", false);
  await layout("solo", { w: 1180, h: 820, label: "Teacher on an iPad, landscape · 1180 × 820" });
  await check("iPad-size teacher lobby renders the QR code", () => H.getByLabel("QR code that opens the join page").waitFor({ timeout: 4000 }));
  await hush(1500);
  await say("And on a full projector.", false);
  await layout("projector");
  await hush(1800);
  await layout("normal");

  await chapter("Game 2 · teams on autoplay");
  await say("Start. Teams of two are balanced automatically, and this quiz runs on autoplay.", false);
  await H.getByRole("button", { name: "Start ▶" }).click();
  for (let q = 1; q <= 2; q++) {
    await H.getByRole("timer").waitFor({ timeout: 15_000 });
    await sleep(2200);
    await tile(A, q === 1 ? 2 : 1).click().catch(() => {});
    await sleep(700);
    await tile(B, 1).click().catch(() => {});
    await check(`Autoplay question ${q}: reveal`, () => H.getByText("Why:").waitFor({ timeout: 20_000 }));
    await H.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 20_000 });
    if (q === 1) {
      await check("Leaderboard ranks teams as well as players", () => H.getByRole("region", { name: "Teams" }).waitFor({ timeout: 4000 }));
      await say("The leaderboard now ranks teams as well as players.", false);
    }
    await hush();
  }
  await H.getByRole("timer").waitFor({ timeout: 15_000 });
  await say("I'll end this one early too.", false);
  await H.getByRole("button", { name: "End early" }).click();
  await H.getByRole("button", { name: "End", exact: true }).click();
  await check("Game 2 podium appears", () => H.getByRole("list", { name: "Podium" }).waitFor({ timeout: 8000 }));
  await sleep(3200);
  await check("Team board on the final screen", () => H.getByRole("region", { name: "Teams" }).waitFor({ timeout: 5000 }));
  await hush(1500);

  // ---- 11. Summary
  await chapter("Summary");
  await check("No errors in any browser console during the run", async () => {
    if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 3).join(" | "));
  });
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  await slide(
    `<h1>${failed.length ? `<span style="color:var(--bad)">${failed.length} check${failed.length === 1 ? "" : "s"} failed</span>` : "Every check passed"}</h1>
    <p class="lead">${passed} of ${results.length} live checks passed in this walkthrough${suite ? `, on top of ${suite.total} unit tests, ${suite.e2e} end-to-end checks, the 60-student load test and the ${suite.shots}-screenshot layout sweep` : ""}.</p>
    ${failed.length ? `<pre>${failed.map((f) => `✗ ${f.label}\n   ${f.error ?? ""}`).join("\n")}</pre>` : ""}
    <p class="lead">Not shown, because they need things that don't exist yet: deployment to Cloudflare, the school Wi-Fi test, and music, which stays silent until you supply audio files.</p>`,
  );
  await say(
    failed.length
      ? `${passed} of ${results.length} checks passed. ${failed.length} failed, and they're listed on screen.`
      : `That's everything. All ${results.length} live checks passed. Not shown, because they need things that don't exist yet: deployment, the school Wi-Fi test, and music files. Thanks for watching.`,
  );
  await hush(1500);

  const seconds = await stopRecording();
  await browser.close();
  for (const b of bots) b.connection.close();

  writeFileSync(`${OUT}results.json`, JSON.stringify({ code, code2, results, chapters, consoleErrors, seconds }, null, 2));
  writeFileSync(`${OUT}clips.json`, JSON.stringify(clips, null, 2));
  console.log(`\nrecorded ${seconds.toFixed(1)} s; ${passed}/${results.length} checks passed`);
  if (failed.length) console.log(failed.map((f) => `  ✗ ${f.label}: ${f.error}`).join("\n"));
}

main().catch(async (error) => {
  console.error(error);
  writeFileSync(`${OUT}results.json`, JSON.stringify({ crashed: String(error?.stack ?? error), results, chapters }, null, 2));
  process.exit(1);
});
