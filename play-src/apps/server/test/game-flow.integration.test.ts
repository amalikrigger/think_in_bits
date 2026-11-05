import type { HostView, PlayerView, QuizInput } from "@bitblitz/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isType } from "../../../tools/lib/client";
import { hostGame, isHostView, joinAs, nextPlayerView, startServer, type TestServer } from "./harness";

// Integration: the real Worker + Durable Object + engine + schema, over real WebSockets and
// alarms. These complement the engine's unit tests (which own the scoring arithmetic) by
// proving the same rules hold once clocks, sockets, persistence and timers are involved.

let server: TestServer;
beforeAll(async () => {
  server = await startServer();
}, 60_000);
afterAll(async () => {
  await server?.close();
});

const single = (prompt: string, correctIndex = 0) => ({
  type: "single" as const,
  prompt,
  answers: ["A", "B", "C", "D"].map((text, i) => ({ text, ...(i === correctIndex ? { correct: true } : {}) })),
});
const quiz = (questions: unknown[], settings: Record<string, unknown> = {}, extra: Partial<QuizInput> = {}) => ({
  schemaVersion: 1,
  title: "Integration",
  settings,
  defaults: { timeLimitSec: 20, points: "standard" },
  questions,
  ...extra,
});

describe("a full game over the wire", () => {
  it("scores fast correct answers with a breakdown that adds up, ranks players and reaches the podium", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1"), single("Q2", 1)], { autoplay: false }));
    const { player: ada } = await joinAs(server, code, "Ada");
    const { player: bo } = await joinAs(server, code, "Bo");

    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    await ada.waitFor(isType("answer_ack"));
    bo.send({ type: "answer", questionIndex: 0, choice: [0] });

    const adaReveal = (await ada.waitForPhase("reveal")) as PlayerView;
    const boReveal = (await bo.waitForPhase("reveal")) as PlayerView;
    const a = adaReveal.result!;
    const b = boReveal.result!;
    expect(a.outcome).toBe("correct");
    expect(a.fastestPlace).toBe(1);
    expect(b.fastestPlace).toBe(2);
    expect(a.points.first).toBe(100);
    expect(b.points.first).toBe(60);
    // The breakdown a student reads must add up to what they were awarded.
    for (const r of [a, b]) expect(r.points.speed + r.points.first + r.points.streak).toBe(r.points.total);
    // Instant answers on a standard question: speed is between 50% and 100% of 1000.
    expect(a.points.speed).toBeGreaterThan(900);
    expect(a.points.speed).toBeLessThanOrEqual(1000);
    expect(adaReveal.rank).toBe(1);
    expect(boReveal.rank).toBe(2);
    expect(b.behind?.nickname).toBe("Ada");
    expect(b.behind?.points).toBe(adaReveal.score - boReveal.score);

    host.press("next");
    await host.waitForPhase("leaderboard");
    host.press("next");
    await ada.waitForPhase("question", 8000);
    // Question 2: Ada right again (streak 2 → +50), Bo wrong (streak resets).
    ada.send({ type: "answer", questionIndex: 1, choice: [1] });
    bo.send({ type: "answer", questionIndex: 1, choice: [0] });
    const adaQ2 = ((await ada.waitForPhase("reveal")) as PlayerView).result!;
    const boQ2 = ((await bo.waitForPhase("reveal")) as PlayerView).result!;
    expect(adaQ2.streak).toBe(2);
    expect(adaQ2.points.streak).toBe(50);
    expect(boQ2.outcome).toBe("wrong");
    expect(boQ2.points.total).toBe(0);
    expect(boQ2.streak).toBe(0);

    host.press("next");
    const podium = (await host.waitForPhase("podium")) as HostView;
    expect(podium.podium!.map((p) => p.nickname)).toEqual(["Ada", "Bo"]);
    for (const c of [host, ada, bo]) c.close();
  }, 60_000);
});

describe("teacher controls", () => {
  it("pause freezes the question clock and refuses answers until resume", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1")]));
    const { player: ada } = await joinAs(server, code, "Ada");
    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);

    host.command({ kind: "pause" });
    const paused = await nextPlayerView(ada, (v) => v.paused);
    await new Promise((r) => setTimeout(r, 1500));
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    const refused = await ada.waitFor(isType("answer_ack"));
    expect(refused.accepted).toBe(false);

    host.command({ kind: "resume" });
    const resumed = await nextPlayerView(ada, (v) => !v.paused && v.phase === "question");
    // Time spent paused is not taken from the students.
    expect(Math.abs(resumed.timer!.msRemaining - paused.timer!.msRemaining)).toBeLessThan(500);
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    expect((await ada.waitFor(isType("answer_ack"))).accepted).toBe(true);
    for (const c of [host, ada]) c.close();
  }, 30_000);

  it("skip scores nobody and moves on; reveal-now closes a question early", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1"), single("Q2")]));
    const { player: ada } = await joinAs(server, code, "Ada");
    await joinAs(server, code, "Bo");
    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    await ada.waitFor(isType("answer_ack"));
    host.press("skip");
    const next = await nextPlayerView(ada, (v) => v.phase === "question" && v.question?.index === 1, 10_000);
    expect(next.score).toBe(0);

    host.press("reveal_now");
    const reveal = (await ada.waitForPhase("reveal")) as PlayerView;
    expect(reveal.result!.outcome).toBe("no_answer");
    host.close();
    ada.close();
  }, 30_000);

  it("locking the room and turning late join off keep newcomers out", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1")], { lateJoin: false }));
    await joinAs(server, code, "Ada");
    host.command({ kind: "lock", locked: true });
    await host.waitFor((m) => isHostView(m) && m.view.settings.locked);
    const locked = server.client.connect(code);
    await locked.opened();
    locked.send({ type: "join", nickname: "Eve" });
    expect((await locked.waitFor(isType("join_rejected"))).reason).toBe("room_locked");

    host.command({ kind: "lock", locked: false });
    host.command({ kind: "start" });
    await host.waitForPhase("question", 8000);
    const late = server.client.connect(code);
    await late.opened();
    late.send({ type: "join", nickname: "Late" });
    expect((await late.waitFor(isType("join_rejected"))).reason).toBe("game_started");
    host.close();
  }, 30_000);

  it("a player connection cannot run host commands", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1")]));
    const { player: ada } = await joinAs(server, code, "Ada");
    ada.command({ kind: "start" });
    expect((await ada.waitFor(isType("error"))).code).toBe("not_authenticated");
    // And the game did not start.
    const info = (await (await fetch(`${server.api}/api/games/${code}`)).json()) as { phase: string };
    expect(info.phase).toBe("lobby");
    host.close();
    ada.close();
  }, 20_000);
});

describe("autoplay", () => {
  it("runs a game from start to podium with no further teacher input", async () => {
    const { host, code } = await hostGame(
      server,
      quiz([single("Q1"), single("Q2")], { autoplay: true, revealSec: 2, leaderboardSec: 2 }, { defaults: { timeLimitSec: 5, points: "standard" } }),
    );
    const { player: ada } = await joinAs(server, code, "Ada");
    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    // Q2 is left unanswered: the 5 s clock has to close it by itself.
    const podium = (await host.waitForPhase("podium", 40_000)) as HostView;
    expect(podium.podium![0]!.nickname).toBe("Ada");
    host.close();
    ada.close();
  }, 60_000);
});

describe("answer secrecy", () => {
  it("with shuffled answers, nothing a player receives before the reveal identifies the correct tile", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1", 2), single("Q2", 3)], { shuffleAnswers: true, shuffleQuestions: true }));
    const { player: ada } = await joinAs(server, code, "Ada");
    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);
    const before = ada.received.map((r) => JSON.stringify(r.message)).join("\n");
    expect(before).not.toMatch(/"correct"\s*:/);
    expect(before).not.toMatch(/"reveal"\s*:\s*\{/);
    host.close();
    ada.close();
  }, 20_000);
});

describe("regressions from the second adversarial review, over the wire", () => {
  it("a Reveal press that arrives after the clock already revealed is refused as out of date, and the reveal stays up", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1"), single("Q2")], {}, { defaults: { timeLimitSec: 5, points: "standard" } }));
    const { player: ada } = await joinAs(server, code, "Ada");
    host.command({ kind: "start" });
    await host.waitForPhase("question", 8000);
    const sawQuestion = { phase: "question" as const, questionIndex: 0 };
    await host.waitForPhase("reveal", 10_000); // nobody answers: the clock closes it

    host.command({ kind: "next", seen: sawQuestion });

    const rejected = await host.waitFor(isType("command_rejected"));
    expect(rejected.reason).toBe("out_of_date");
    const info = (await (await fetch(`${server.api}/api/games/${code}`)).json()) as { phase: string };
    expect(info.phase).toBe("reveal");
    host.close();
    ada.close();
  }, 30_000);

  it("a student dropping off during a pause does not end the pause or reveal the answer", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1")], { autoplay: true, revealSec: 2 }));
    const { player: ada } = await joinAs(server, code, "Ada");
    const { player: bo } = await joinAs(server, code, "Bo");
    host.command({ kind: "start" });
    await ada.waitForPhase("question", 8000);
    ada.send({ type: "answer", questionIndex: 0, choice: [0] });
    await ada.waitFor(isType("answer_ack"));
    host.command({ kind: "pause" });
    await host.waitFor((m) => isHostView(m) && m.view.paused);

    bo.close();
    await host.waitFor((m) => isHostView(m) && m.view.players.some((p) => p.nickname === "Bo" && !p.connected));
    await new Promise((r) => setTimeout(r, 2500));

    const view = host.lastView() as HostView;
    expect(view.phase).toBe("question");
    expect(view.paused).toBe(true);
    host.command({ kind: "resume" });
    await host.waitForPhase("reveal", 5000);
    host.close();
    ada.close();
  }, 30_000);

  it("phones receive the prompt but no answer texts during the countdown", async () => {
    const { host, code } = await hostGame(server, quiz([single("Q1")]));
    const { player: ada } = await joinAs(server, code, "Ada");
    host.command({ kind: "start" });
    const countdown = (await ada.waitForPhase("countdown")) as PlayerView;
    expect(countdown.question?.prompt).toBe("Q1");
    expect(countdown.question?.answers.map((a) => a.text)).toEqual([null, null, null, null]);
    const open = (await ada.waitForPhase("question", 8000)) as PlayerView;
    expect(open.question?.answers.map((a) => a.text)).toEqual(["A", "B", "C", "D"]);
    host.close();
    ada.close();
  }, 20_000);

  it("refuses a quiz naming an image file the upload would reject, before any game is created", async () => {
    const token = await server.client.hostToken();
    const bad = quiz([{ ...single("Q1"), media: { type: "image", src: "circle+1.png", alt: "Circle" } }]);
    const response = await fetch(`${server.api}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quiz: bad }),
    });
    const body = (await response.json()) as { problems?: { message: string }[] };
    expect(response.status).toBe(400);
    expect(body.problems?.[0]?.message).toMatch(/image file name using only letters/);
  }, 20_000);
});
