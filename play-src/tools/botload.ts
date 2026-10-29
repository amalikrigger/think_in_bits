import { readFileSync } from "node:fs";
import type { HostView, PlayerView } from "@bitblitz/schema";
import { Connection, createGame, hostToken, isType } from "./lib/client";

// Simulated class: N bots play a whole autoplay game against the local server.
// Reports dropped players and answer-acknowledgement latency (send → ack).
// Usage: pnpm botload [--bots=60] [--quiz=../samples/quadratics-practice.json]
// Pass criteria (PLAN.md verification 3): no dropped players, p95 ack < 300 ms locally.

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const BOTS = Number(args.bots ?? 60);
const quizPath = new URL(args.quiz ?? "../samples/quadratics-practice.json", import.meta.url);
const P95_LIMIT_MS = 300;

async function main(): Promise<void> {
  const quiz = JSON.parse(readFileSync(quizPath, "utf8"));
  // Keep the run short: autoplay with brief reveal/leaderboard and a 10 s limit.
  quiz.settings = { ...quiz.settings, autoplay: true, revealSec: 2, leaderboardSec: 2, timeLimitOverrideSec: 10, lobbyCapacity: 300 };
  const questionCount: number = quiz.questions.length;

  const { code, hostKey } = await createGame(await hostToken(), quiz);
  const host = new Connection(code);
  await host.opened();
  host.send({ type: "host_auth", key: hostKey });
  await host.waitFor(isType("host_welcome"));

  const ackLatencies: number[] = [];
  const unexpectedCloses: string[] = [];
  const bots = await Promise.all(
    Array.from({ length: BOTS }, async (_, i) => {
      const nickname = `Bot ${String(i + 1).padStart(2, "0")}`;
      const connection = new Connection(code);
      await connection.opened();
      connection.send({ type: "join", nickname });
      await connection.waitFor(isType("welcome"), 15_000);
      return { nickname, connection, answered: new Set<number>() };
    }),
  );
  console.log(`${bots.length} bots joined game ${code}`);

  // Each bot answers every question it sees, after a human-ish random delay.
  for (const bot of bots) {
    bot.connection.onClose((closeCode) => {
      if (!finished) unexpectedCloses.push(`${bot.nickname} (closed ${closeCode})`);
    });
    const onView = (view: PlayerView) => {
      if (view.phase !== "question" || !view.question || bot.answered.has(view.question.index)) return;
      const question = view.question;
      bot.answered.add(question.index);
      setTimeout(async () => {
        const options = question.answers.length;
        const choice = question.type === "multi" ? [0, 1 + Math.floor(Math.random() * (options - 1))] : [Math.floor(Math.random() * options)];
        const sentAt = performance.now();
        bot.connection.send({ type: "answer", questionIndex: question.index, choice });
        try {
          await bot.connection.waitFor((m) => m.type === "answer_ack" && m.questionIndex === question.index, 15_000);
          ackLatencies.push(performance.now() - sentAt);
        } catch {
          unexpectedCloses.push(`${bot.nickname} (no ack for Q${question.index + 1})`);
        }
      }, 300 + Math.random() * 3500);
    };
    bot.connection.onMessage((m) => m.type === "view" && m.view.role === "player" && onView(m.view));
  }

  let finished = false;
  const started = performance.now();
  host.command({ kind: "start" });
  const podium = (await host.waitForPhase("podium", questionCount * 25_000)) as HostView;
  finished = true;
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  const offline = podium.players.filter((p) => !p.connected).map((p) => p.nickname);
  const sorted = [...ackLatencies].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? NaN;
  const expectedAnswers = BOTS * questionCount;
  const report = {
    bots: BOTS,
    questions: questionCount,
    gameSeconds: Number(seconds),
    playersAtPodium: podium.players.length,
    offlineAtPodium: offline,
    unexpectedCloses,
    answersAcknowledged: `${ackLatencies.length}/${expectedAnswers}`,
    ackMs: { p50: round(pct(50)), p95: round(pct(95)), p99: round(pct(99)), max: round(sorted.at(-1) ?? NaN) },
    winner: podium.podium?.[0] ? `${podium.podium[0].nickname} ${podium.podium[0].score}` : null,
  };
  console.log(JSON.stringify(report, null, 2));

  const pass =
    podium.players.length === BOTS && offline.length === 0 && unexpectedCloses.length === 0 && ackLatencies.length === expectedAnswers && pct(95) < P95_LIMIT_MS;
  console.log(pass ? "PASS" : "FAIL");
  host.close();
  for (const bot of bots) bot.connection.close();
  process.exit(pass ? 0 : 1);
}

const round = (n: number) => Math.round(n * 10) / 10;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
