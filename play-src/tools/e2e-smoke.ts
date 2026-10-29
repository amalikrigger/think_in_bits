import { readFileSync } from "node:fs";
import type { PlayerView } from "@bitblitz/schema";
import { API, Connection, createGame, hostToken, isType, login } from "./lib/client";

// End-to-end smoke test against a running local server (`pnpm dev`, or
// `pnpm --filter @bitblitz/server dev`). Exercises the real Worker, Durable Object,
// WebSockets, alarms and auth. Usage: pnpm --filter @bitblitz/tools e2e

const quiz = JSON.parse(readFileSync(new URL("../samples/smoke-test.json", import.meta.url), "utf8"));
let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

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

  // --- create, host, join ---
  const { code, hostKey } = await createGame(token, quiz);
  check("game created with a 6-digit code", /^\d{6}$/.test(code), code);
  const info = (await (await fetch(`${API}/api/games/${code}`)).json()) as { joinable: boolean; phase: string };
  check("join screen sees an open lobby", info.joinable && info.phase === "lobby");

  const impostor = new Connection(code);
  await impostor.opened();
  impostor.send({ type: "host_auth", key: "wrong" });
  const denied = await impostor.waitFor(isType("error"));
  check("a wrong host key is refused", denied.code === "auth_failed");

  const host = new Connection(code);
  await host.opened();
  host.send({ type: "host_auth", key: hostKey });
  await host.waitFor(isType("host_welcome"));
  check("host authenticated", true);

  const ada = new Connection(code);
  const bo = new Connection(code);
  await Promise.all([ada.opened(), bo.opened()]);
  ada.send({ type: "join", nickname: "Ada" });
  const adaWelcome = await ada.waitFor(isType("welcome"));
  bo.send({ type: "join", nickname: "ada" });
  const taken = await bo.waitFor(isType("join_rejected"));
  check("duplicate nickname is refused", taken.reason === "nickname_taken");
  bo.send({ type: "join", nickname: "Bo" });
  await bo.waitFor(isType("welcome"));

  const media = await fetch(`${API}/api/games/${code}/media/dot.svg`, {
    method: "PUT",
    headers: { "X-Host-Key": hostKey, "Content-Type": "image/svg+xml" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><circle cx="2" cy="2" r="2"/></svg>',
  });
  const served = await fetch(`${API}/api/games/${code}/media/dot.svg`);
  check("media uploads with the host key and serves inert", media.ok && served.ok && (served.headers.get("Content-Security-Policy") ?? "").includes("default-src 'none'"));

  // --- play: question 1 (single), with Ada reconnecting mid-game ---
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

  // --- the rest of the game, driven by the teacher ---
  for (let q = 1; q < quiz.questions.length; q++) {
    host.command({ kind: "next" }); // reveal → leaderboard
    await host.waitForPhase("leaderboard");
    host.command({ kind: "next" }); // leaderboard → countdown
    const open = (await ada2.waitForPhase("question", 8000)) as PlayerView;
    const choice = open.question!.type === "multi" ? [0, 1] : [0];
    ada2.send({ type: "answer", questionIndex: q, choice });
    bo.send({ type: "answer", questionIndex: q, choice: [1] });
    await host.waitForPhase("reveal");
  }
  host.command({ kind: "next" });
  const podium = await host.waitForPhase("podium");
  check("game reaches the podium", podium.role === "host" && podium.podium!.length === 2, podium.role === "host" ? podium.podium!.map((p) => `${p.nickname} ${p.score}`).join(", ") : "");

  // --- results and privacy ---
  const csv = await fetch(`${API}/api/games/${code}/results.csv`, { headers: { "X-Host-Key": hostKey } });
  const csvText = await csv.text();
  check("results CSV for the host", csv.ok && csvText.startsWith("rank,nickname,team,score,correct"), csvText.split("\r\n")[1]);
  const csvDenied = await fetch(`${API}/api/games/${code}/results.csv`);
  check("results CSV refused without the host key", csvDenied.status === 401);

  const playerJson = [...ada.received, ...ada2.received, ...bo.received].map((r) => JSON.stringify(r.message));
  check("no player message ever carried the answer key", playerJson.every((j) => !/"correct"\s*:/.test(j)), `${playerJson.length} messages`);

  // --- rate limiting (a made-up IP, so the dev login stays usable) ---
  const ip = { "CF-Connecting-IP": "203.0.113.77" };
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await login("wrong", ip)).status);
  check("6th wrong login in a row is rate limited", statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429, statuses.join(","));
  check("other clients can still log in", (await login()).ok);

  for (const c of [host, ada2, bo, impostor]) c.close();
  console.log(failures === 0 ? "\nall smoke checks passed" : `\n${failures} smoke check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
