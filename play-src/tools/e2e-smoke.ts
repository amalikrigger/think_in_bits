import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { HostView, PlayerView, ServerMessage } from "@bitblitz/schema";
import { API, Connection, createGame, hostToken, isType, login } from "./lib/client";

// End-to-end smoke test against a running local server (`pnpm dev`, or
// `pnpm --filter @bitblitz/server dev`). Exercises the real Worker, Durable Object,
// WebSockets, alarms and auth. Usage: pnpm --filter @bitblitz/tools e2e
//
// Game plan: Q1 (single) with Ada reconnecting after it; Q2 (true/false) with Ada
// reconnecting mid-question, Late joining mid-question and then being kicked; Q3 (multi).

const quiz = JSON.parse(readFileSync(new URL("../samples/smoke-test.json", import.meta.url), "utf8"));
let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const isPlayerView = (m: ServerMessage): m is { type: "view"; view: PlayerView } => m.type === "view" && m.view.role === "player";

async function main(): Promise<void> {
  // --- auth ---
  check("health", (await fetch(`${API}/api/health`)).ok);
  const wrong = await login("not the passphrase", { "CF-Connecting-IP": "203.0.113.50" });
  check("wrong passphrase is refused", wrong.status === 401, String(wrong.status));
  const token = await hostToken();
  check("right passphrase returns a session token", token.startsWith("host."));

  const anonymous = await fetch(`${API}/api/games`, { method: "POST", body: JSON.stringify({ quiz }) });
  check("creating a game without logging in is refused", anonymous.status === 401);

  const badQuiz = await fetch(`${API}/api/games`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quiz: { ...quiz, questions: [{ type: "single", prompt: "x", answers: [{ text: "a" }, { text: "b" }] }] } }),
  });
  const badBody = (await badQuiz.json()) as { problems?: { where: string; message: string }[] };
  check(
    "an invalid quiz is refused with plain-language problems",
    badQuiz.status === 400 && badBody.problems?.[0]?.message === "single choice needs exactly one correct answer",
    JSON.stringify(badBody.problems?.[0]),
  );

  const huge = await fetch(`${API}/api/games`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ quiz, padding: "x".repeat(600 * 1024) }),
  });
  const hugeBody = (await huge.json()) as { error?: string };
  check("an oversized quiz upload is refused", huge.status === 400 && /512 KB/.test(hugeBody.error ?? ""), `${huge.status} ${hugeBody.error}`);

  // --- create, host, join ---
  const { code, hostKey } = await createGame(token, quiz);
  check("game created with a 6-digit code", /^\d{6}$/.test(code), code);
  const info = (await (await fetch(`${API}/api/games/${code}`)).json()) as { joinable: boolean; phase: string };
  check("join screen sees an open lobby", info.joinable && info.phase === "lobby");

  const impostor = new Connection(code);
  await impostor.opened();
  impostor.send({ type: "host_auth", key: "wrong" });
  const denied = await impostor.waitFor(isType("error"));
  check("a wrong host key is refused and the socket closed", denied.code === "auth_failed" && (await impostor.whenClosed()) === 4001);

  const host = new Connection(code);
  await host.opened();
  host.send({ type: "host_auth", key: hostKey });
  await host.waitFor(isType("host_welcome"));
  check("host authenticated", true);

  // --- bad input on the socket ---
  const junk = new Connection(code);
  await junk.opened();
  junk.sendRaw("not json at all");
  const notJson = await junk.waitFor(isType("error"));
  junk.sendRaw(JSON.stringify({ type: "teleport", to: "podium" }));
  const unknown = await junk.waitFor((m) => m.type === "error" && m !== notJson);
  check("malformed and unknown messages get a bad_message error and the socket stays open",
    notJson.code === "bad_message" && unknown.type === "error" && unknown.code === "bad_message" && !junk.closed);
  junk.sendRaw(JSON.stringify({ type: "join", nickname: "x".repeat(9000) }));
  check("an oversized message closes the socket with 1009", (await junk.whenClosed()) === 1009);

  const flooder = new Connection(code);
  await flooder.opened();
  for (let i = 0; i < 60; i++) flooder.send({ type: "pong", id: i });
  const flooded = await flooder.waitFor(isType("error"));
  check("a message flood is cut off with rate_limited and close 4008",
    flooded.code === "rate_limited" && (await flooder.whenClosed()) === 4008);

  const ada = new Connection(code);
  const bo = new Connection(code);
  await Promise.all([ada.opened(), bo.opened()]);
  ada.send({ type: "join", nickname: "Ada" });
  const adaWelcome = await ada.waitFor(isType("welcome"));
  bo.send({ type: "join", nickname: "ada" });
  const taken = await bo.waitFor(isType("join_rejected"));
  check("duplicate nickname is refused", taken.reason === "nickname_taken");
  bo.send({ type: "join", nickname: "​Bo​" });
  const boWelcome = await bo.waitFor(isType("welcome"));
  check("zero-width padding is stripped from a nickname", boWelcome.nickname === "Bo", JSON.stringify(boWelcome.nickname));

  ada.send({ type: "host_auth", key: hostKey });
  ada.command({ kind: "lock", locked: true });
  const refused = await ada.waitFor(isType("error"));
  check("a player socket cannot become the host even with the real key", refused.code === "not_authenticated");

  const media = await fetch(`${API}/api/games/${code}/media/dot.svg`, {
    method: "PUT",
    headers: { "X-Host-Key": hostKey, "Content-Type": "image/svg+xml" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><circle cx="2" cy="2" r="2"/></svg>',
  });
  const served = await fetch(`${API}/api/games/${code}/media/dot.svg`);
  check("media uploads with the host key and serves inert", media.ok && served.ok && (served.headers.get("Content-Security-Policy") ?? "").includes("default-src 'none'"));
  const spaced = await fetch(`${API}/api/games/${code}/media/${encodeURIComponent("my dot.svg")}`, {
    method: "PUT",
    headers: { "X-Host-Key": hostKey, "Content-Type": "image/svg+xml" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>',
  });
  const spacedServed = await fetch(`${API}/api/games/${code}/media/${encodeURIComponent("my dot.svg")}`);
  check("a media file name with a space (as the browser sends it) works", spaced.ok && spacedServed.ok, `${spaced.status}/${spacedServed.status}`);
  const noKey = await fetch(`${API}/api/games/${code}/media/evil.svg`, { method: "PUT", headers: { "Content-Type": "image/svg+xml" }, body: "<svg/>" });
  const badType = await fetch(`${API}/api/games/${code}/media/page.html`, { method: "PUT", headers: { "X-Host-Key": hostKey, "Content-Type": "text/html" }, body: "<p>" });
  check("media upload needs the host key and an image type", noKey.status === 401 && badType.status === 400, `${noKey.status}/${badType.status}`);

  // --- Q1 (single): answer, double answer, reveal, then Ada reconnects ---
  host.command({ kind: "start" });
  await ada.waitForPhase("question", 8000);
  ada.send({ type: "answer", questionIndex: 0, choice: [0] });
  const ack = await ada.waitFor(isType("answer_ack"));
  check("answer acknowledged", ack.accepted);
  ada.send({ type: "answer", questionIndex: 0, choice: [1] });
  const again = await ada.waitFor(isType("answer_ack"));
  check("second answer refused as already_answered", !again.accepted && "reason" in again && again.reason === "already_answered");
  bo.send({ type: "answer", questionIndex: 0, choice: [2] });
  const reveal = (await ada.waitForPhase("reveal")) as PlayerView;
  check("everyone answered → reveal, with a points breakdown", reveal.result?.outcome === "correct" && reveal.result.points.total > 0,
    JSON.stringify(reveal.result?.points));

  const scoreBefore = reveal.score;
  ada.close();
  await host.waitFor((m) => m.type === "view" && m.view.role === "host" && m.view.players.some((p) => p.nickname === "Ada" && !p.connected));
  check("host sees Ada drop", true);
  const ada2 = new Connection(code);
  await ada2.opened();
  ada2.send({ type: "resume", token: adaWelcome.token });
  const resumed = await ada2.waitFor(isType("welcome"));
  const resumedView = (await ada2.waitFor((m) => m.type === "view")) as { view: PlayerView };
  check("Ada resumes with the same id, nickname and score",
    resumed.playerId === adaWelcome.playerId && resumedView.view.nickname === "Ada" && resumedView.view.score === scoreBefore);

  // --- Q2 (true/false): reconnect mid-question, late join mid-question, kick ---
  host.press("next"); // reveal → leaderboard
  await host.waitForPhase("leaderboard");
  host.press("next"); // leaderboard → countdown
  await ada2.waitForPhase("question", 8000);
  ada2.close();
  const ada3 = new Connection(code);
  await ada3.opened();
  ada3.send({ type: "resume", token: adaWelcome.token });
  await ada3.waitFor(isType("welcome"));
  const midQuestion = (await ada3.waitFor(isPlayerView)).view;
  check("a reconnect mid-question gets the open question, no answer yet and a running clock",
    midQuestion.phase === "question" && midQuestion.question?.index === 1 && midQuestion.answer === null &&
      midQuestion.timer !== null && midQuestion.timer.msRemaining > 0 && midQuestion.timer.msRemaining <= 10_000,
    JSON.stringify({ phase: midQuestion.phase, timer: midQuestion.timer }));

  const late = new Connection(code);
  await late.opened();
  late.send({ type: "join", nickname: "Late" });
  const lateWelcome = await late.waitFor(isType("welcome"));
  const lateView = (await late.waitFor(isPlayerView)).view;
  late.send({ type: "answer", questionIndex: 1, choice: [0] });
  const lateAck = await late.waitFor(isType("answer_ack"));
  check("a late joiner mid-question sees the question and can answer", lateView.phase === "question" && lateAck.accepted);

  ada3.send({ type: "answer", questionIndex: 1, choice: [0] });
  bo.send({ type: "answer", questionIndex: 1, choice: [1] });
  const q2Host = (await host.waitForPhase("reveal")) as HostView;
  check("three players were counted for question 2", q2Host.players.length === 3, q2Host.players.map((p) => p.nickname).join(","));

  host.command({ kind: "kick", playerId: lateWelcome.playerId });
  const kickedMessage = await late.waitFor(isType("kicked"));
  const lateClose = await late.whenClosed();
  check("a kicked player is told and their socket closed with 4003", kickedMessage.type === "kicked" && lateClose === 4003, String(lateClose));
  const lateAgain = new Connection(code);
  await lateAgain.opened();
  lateAgain.send({ type: "resume", token: lateWelcome.token });
  const lateRefused = await lateAgain.waitFor(isType("join_rejected"));
  check("a kicked token cannot resume", lateRefused.reason === "kicked");
  const latestHostView = host.received.map((r) => r.message).filter((m): m is { type: "view"; view: HostView } => m.type === "view" && m.view.role === "host").at(-1)!.view;
  check("host roster drops the kicked player", latestHostView.players.length === 2 && latestHostView.players.every((p) => p.nickname !== "Late"),
    latestHostView.players.map((p) => p.nickname).join(","));

  // --- Q3 (multi) to the podium ---
  host.press("next");
  await host.waitForPhase("leaderboard");
  host.press("next");
  await ada3.waitForPhase("question", 8000);
  ada3.send({ type: "answer", questionIndex: 2, choice: [0, 1] });
  bo.send({ type: "answer", questionIndex: 2, choice: [1] });
  await host.waitForPhase("reveal");
  host.press("next");
  const podium = await host.waitForPhase("podium");
  check("game reaches the podium", podium.role === "host" && podium.podium!.length === 2, podium.role === "host" ? podium.podium!.map((p) => `${p.nickname} ${p.score}`).join(", ") : "");

  // --- results and privacy ---
  const csv = await fetch(`${API}/api/games/${code}/results.csv`, { headers: { "X-Host-Key": hostKey } });
  const csvText = await csv.text();
  check("results CSV for the host", csv.ok && csvText.startsWith("rank,nickname,team,score,correct"), csvText.split("\r\n")[1]);
  const csvDenied = await fetch(`${API}/api/games/${code}/results.csv`);
  check("results CSV refused without the host key", csvDenied.status === 401);

  const playerMessages = [ada, ada2, ada3, bo, late, lateAgain].flatMap((c) => c.received).map((r) => JSON.stringify(r.message));
  check("no player message ever carried the answer key", playerMessages.every((j) => !/"correct"\s*:/.test(j)), `${playerMessages.length} messages`);
  check("no player message ever carried an explanation", playerMessages.every((j) => !j.includes("Two pairs make four")));

  // --- the web dev server (what students' phones load over the Wi-Fi) serves no repo secrets ---
  const web = process.env.BITBLITZ_WEB ?? "http://127.0.0.1:5173";
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const exposed: string[] = [];
  for (const path of ["play-src/apps/server/.dev.vars", "play-src/quizzes-private/README.md", "play-src/apps/server/wrangler.toml", "play-src/PLAN.md"]) {
    const response = await fetch(`${web}/play/@fs${repoRoot}${path}`).catch(() => null);
    if (response?.ok) exposed.push(path);
  }
  check("the web dev server refuses .dev.vars, quizzes-private and the rest of the repo", exposed.length === 0, exposed.join(", "));

  // --- rate limiting (made-up documentation-range IPs, unique per run so the dev login stays
  // usable and a re-run inside the 10-minute window, or a concurrent run, cannot collide) ---
  const runId = Date.now().toString(16);
  const ip = { "CF-Connecting-IP": `2001:db8:e2e:1::${runId}` };
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await login("wrong", ip)).status);
  check("6th wrong login in a row is rate limited", statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429, statuses.join(","));

  const burst = await Promise.all(Array.from({ length: 8 }, () => login("wrong", { "CF-Connecting-IP": `2001:db8:e2e:2::${runId}` })));
  const burstStatuses = burst.map((r) => r.status);
  check("a parallel burst of wrong logins cannot get more than 5 guesses checked",
    burstStatuses.filter((s) => s === 401).length <= 5 && burstStatuses.filter((s) => s === 429).length >= 3, burstStatuses.join(","));
  check("other clients can still log in", (await login()).ok);

  for (const c of [host, ada3, bo, impostor, junk, flooder, lateAgain]) c.close();
  console.log(failures === 0 ? "\nall smoke checks passed" : `\n${failures} smoke check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
