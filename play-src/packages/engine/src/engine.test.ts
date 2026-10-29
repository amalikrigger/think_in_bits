import { describe, expect, it } from "vitest";
import { buildPlan } from "./engine";
import { resultsCsv } from "./export";
import { checkNickname, isInappropriate } from "./nicknames";
import { COUNTDOWN_MS } from "./state";
import { Harness, sampleQuiz } from "./test-harness";

// Question 1: single, 20 s, correct slot 0. Question 2: true/false, 10 s, correct "True" (slot 0).
// Question 3: multi, double points, 20 s, correct slots 0 and 1.

describe("game flow", () => {
  it("runs lobby → countdown → question → reveal → leaderboard → … → podium → ended with the teacher pressing Next", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    expect(game.state.phase).toBe("lobby");

    game.host({ kind: "start" });
    expect(game.state.phase).toBe("countdown");
    game.advance(COUNTDOWN_MS);
    expect(game.state.phase).toBe("question");

    game.answer(ada, [0]);
    expect(game.state.phase).toBe("question");
    game.answer(bo, [1]);
    expect(game.state.phase).toBe("reveal"); // everyone answered, so no waiting for the clock

    game.host({ kind: "next" });
    expect(game.state.phase).toBe("leaderboard");
    game.host({ kind: "next" });
    expect(game.state.phase).toBe("countdown");
    game.advance(COUNTDOWN_MS);
    game.advance(10_000); // nobody answers question 2; the clock closes it
    expect(game.state.phase).toBe("reveal");

    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0, 1]);
    game.answer(bo, [0]);
    expect(game.state.phase).toBe("reveal");
    game.host({ kind: "next" });
    expect(game.state.phase).toBe("podium"); // the last reveal goes straight to the podium
    game.host({ kind: "next" });
    expect(game.state.phase).toBe("ended");
  });

  it("autoplays reveal and leaderboard on their timers with no clicks", () => {
    const game = new Harness(sampleQuiz({ settings: { autoplay: true, revealSec: 5, leaderboardSec: 4 } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    expect(game.state.phase).toBe("reveal");
    game.advance(4_999);
    expect(game.state.phase).toBe("reveal");
    game.advance(1);
    expect(game.state.phase).toBe("leaderboard");
    game.advance(4_000);
    expect(game.state.phase).toBe("countdown");
    // The rest of the game plays itself out to the podium.
    game.advance(120_000);
    expect(game.state.phase).toBe("podium");
  });

  it("shows the leaderboard only every N questions", () => {
    const game = new Harness(sampleQuiz({ settings: { leaderboardEvery: 2 } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "next" });
    expect(game.state.phase).toBe("countdown"); // after question 1: no leaderboard
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0]);
    game.host({ kind: "next" });
    expect(game.state.phase).toBe("leaderboard"); // after question 2
  });

  it("will not start an empty game", () => {
    const game = new Harness();
    const messages = game.host({ kind: "start" });
    expect(messages[0]!.message).toEqual({ type: "command_rejected", command: "start", reason: "no_players" });
    expect(game.state.phase).toBe("lobby");
  });

  it("rejects Next during the countdown with a named outcome", () => {
    const game = new Harness();
    game.join("Ada");
    game.host({ kind: "start" });
    expect(game.host({ kind: "next" })[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
  });
});

describe("answers", () => {
  it("scores a correct answer with speed, fastest-finger and the breakdown the student sees", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.advance(5_000);
    game.answer(ada, [0]);
    game.advance(5_000);
    game.answer(bo, [0]);

    const adaView = game.playerView(ada);
    expect(adaView.phase).toBe("reveal");
    // t = 5 s of 20 → speed 875; first correct → +100.
    expect(adaView.result).toMatchObject({
      outcome: "correct",
      points: { speed: 875, first: 100, streak: 0, total: 975 },
      rank: 1,
      behind: null,
    });
    // Bo: t = 10 s → 750, second → +60, 165 behind Ada.
    expect(game.playerView(bo).result).toMatchObject({
      points: { total: 810 },
      rank: 2,
      behind: { nickname: "Ada", points: 165 },
    });
  });

  it("rejects an answer before the question opens", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.host({ kind: "start" });
    expect(game.answer(ada, [0], 0)).toMatchObject({ accepted: false, reason: "not_accepting" });
  });

  it("rejects a second answer to the same question", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.join("Bo");
    game.startAndOpenFirstQuestion();
    expect(game.answer(ada, [0])).toMatchObject({ accepted: true });
    expect(game.answer(ada, [1])).toMatchObject({ accepted: false, reason: "already_answered" });
  });

  it("rejects an answer arriving 1 ms after the time limit (no latency)", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.now += 20_001; // the close timer has not been delivered yet
    expect(game.answer(ada, [0])).toMatchObject({ accepted: false, reason: "too_late" });
  });

  it("accepts an answer exactly at the time limit, at half points", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.now += 20_000;
    expect(game.answer(ada, [0])).toMatchObject({ accepted: true });
    expect(game.playerView(ada).result?.points.speed).toBe(500);
  });

  it("forgives slow Wi-Fi: latency is subtracted, so an answer received after T can still count", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    for (let i = 0; i < 3; i++) game.send({ type: "latency", playerId: ada, rttMs: 1200 }); // one-way 600 ms
    game.startAndOpenFirstQuestion();
    game.now += 20_500; // received 500 ms after the limit; fair time is 19.9 s
    expect(game.answer(ada, [0])).toMatchObject({ accepted: true });
    expect(game.playerView(ada).result?.points.speed).toBe(Math.round(1000 * (1 - 19_900 / 20_000 / 2)));
  });

  it("caps the latency allowance, and the close grace, at 1 s", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    for (let i = 0; i < 3; i++) game.send({ type: "latency", playerId: ada, rttMs: 9000 });
    game.startAndOpenFirstQuestion();
    expect(game.state.timer!.at - game.now).toBe(20_000 + 1000);
    game.now += 21_001; // fair time 20.001 s
    expect(game.answer(ada, [0])).toMatchObject({ accepted: false, reason: "too_late" });
  });

  it("answers for a question that has closed are too late", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.host({ kind: "reveal_now" });
    expect(game.answer(bo, [0], 0)).toMatchObject({ accepted: false, reason: "too_late" });
    void ada;
  });

  it("rejects malformed choices", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    expect(game.answer(ada, [0, 1])).toMatchObject({ accepted: false, reason: "invalid_choice" }); // two picks on single
    expect(game.answer(ada, [7])).toMatchObject({ accepted: false, reason: "invalid_choice" });
    expect(game.answer(ada, [0])).toMatchObject({ accepted: true });
  });

  it("builds a streak over consecutive correct answers and shows it in the breakdown", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0]);
    expect(game.playerView(ada).result).toMatchObject({ streak: 2, points: { streak: 50 } });
  });

  it("closes the question when the last player still to answer drops out", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.send({ type: "disconnect", playerId: bo });
    expect(game.state.phase).toBe("reveal");
  });
});

describe("leaderboard order (rule 9)", () => {
  it("breaks a score tie by lower total response time, then by earlier join", () => {
    // Question 1 is 20 s and question 2 is 10 s. Ada and Bo each get one instant correct answer
    // (1000 points), but Ada's miss costs the 20 s question and Bo's costs the 10 s one.
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    const cy = game.join("Cy");
    game.startAndOpenFirstQuestion();
    game.answer(bo, [0]);
    game.answer(cy, [1]);
    game.advance(20_000);
    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0]);
    game.answer(cy, [1]);
    game.advance(10_000);
    game.host({ kind: "next" });
    const board = game.hostView().leaderboard!;
    expect(board.map((e) => [e.nickname, e.score])).toEqual([
      ["Bo", 1000], // total response 0 + 10 s
      ["Ada", 1000], // total response 20 s + 0
      ["Cy", 0],
    ]);
  });

  it("with identical score and time, the earlier joiner ranks first", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const first = game.join("First");
    const second = game.join("Second");
    game.startAndOpenFirstQuestion();
    game.answer(second, [0]);
    game.answer(first, [0]);
    game.host({ kind: "next" });
    expect(game.hostView().leaderboard!.map((e) => e.nickname)).toEqual(["First", "Second"]);
  });

  it("tracks previous rank so the board can animate", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.answer(bo, [1]);
    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [1]);
    game.answer(bo, [0]);
    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.advance(COUNTDOWN_MS);
    game.answer(bo, [0, 1]);
    game.answer(ada, [3]);
    game.host({ kind: "next" });
    const bo3 = game.hostView().leaderboard!.find((e) => e.nickname === "Bo")!;
    expect(bo3).toMatchObject({ rank: 1, previousRank: 2 });
  });
});

describe("joining", () => {
  it("rejects a taken nickname regardless of case", () => {
    const game = new Harness();
    game.join("Ada");
    expect(game.joinResult("ADA", "t2")).toEqual({ type: "join_rejected", reason: "nickname_taken" });
  });

  it("rejects an inappropriate nickname when the filter is on, and allows it when off", () => {
    expect(new Harness().joinResult("sh1thead")).toEqual({ type: "join_rejected", reason: "nickname_inappropriate" });
    const relaxed = new Harness(sampleQuiz({ settings: { profanityFilter: false } }));
    expect(relaxed.joinResult("sh1thead").type).toBe("welcome");
  });

  it("assigns generated nicknames when that setting is on", () => {
    const game = new Harness(sampleQuiz({ settings: { generatedNicknamesOnly: true } }));
    const message = game.joinResult("anything I like");
    expect(message.type).toBe("welcome");
    if (message.type === "welcome") expect(message.nickname).toMatch(/^\w+ \w+$/);
  });

  it("respects lock, capacity and late-join settings", () => {
    const locked = new Harness(sampleQuiz({ settings: { locked: true } }));
    expect(locked.joinResult("Ada")).toMatchObject({ reason: "room_locked" });

    const tiny = new Harness(sampleQuiz({ settings: { lobbyCapacity: 1 } }));
    tiny.join("Ada");
    expect(tiny.joinResult("Bo")).toMatchObject({ reason: "room_full" });

    const strict = new Harness(sampleQuiz({ settings: { lateJoin: false } }));
    strict.join("Ada");
    strict.host({ kind: "start" });
    expect(strict.joinResult("Late")).toMatchObject({ reason: "game_started" });
  });

  it("lets a late joiner in mid-game with zero points", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    const late = game.join("Late");
    expect(game.playerView(late)).toMatchObject({ phase: "reveal", score: 0 });
  });

  it("locks the room from the host controls", () => {
    const game = new Harness();
    game.host({ kind: "lock", locked: true });
    expect(game.joinResult("Ada")).toMatchObject({ reason: "room_locked" });
    game.host({ kind: "lock", locked: false });
    expect(game.joinResult("Ada").type).toBe("welcome");
  });
});

describe("reconnect", () => {
  it("resumes a dropped player with the same nickname and score", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    const scoreBefore = game.state.players[ada]!.score;
    game.send({ type: "disconnect", playerId: ada });
    expect(game.hostView().players[0]!.connected).toBe(false);

    const messages = game.send({ type: "resume", connectionId: "new-socket", token: "token-Ada" });
    expect(messages[0]!.message).toEqual({ type: "welcome", playerId: ada, token: "token-Ada", nickname: "Ada" });
    expect(game.playerView(ada)).toMatchObject({ nickname: "Ada", score: scoreBefore });
    expect(game.hostView().players[0]!.connected).toBe(true);
  });

  it("rejects an unknown token", () => {
    const game = new Harness();
    const messages = game.send({ type: "resume", connectionId: "x", token: "nope" });
    expect(messages[0]!.message).toEqual({ type: "join_rejected", reason: "unknown_token" });
  });
});

describe("teacher controls", () => {
  it("kicks a player, tells them, and refuses their token afterwards", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const messages = game.host({ kind: "kick", playerId: ada });
    expect(messages[0]).toEqual({ to: { kind: "player", playerId: ada }, message: { type: "kicked" } });
    expect(game.hostView().players).toHaveLength(0);
    const resume = game.send({ type: "resume", connectionId: "x", token: "token-Ada" });
    expect(resume[0]!.message).toEqual({ type: "join_rejected", reason: "kicked" });
  });

  it("renames a player, keeping nicknames unique", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.join("Bo");
    expect(game.host({ kind: "rename", playerId: ada, nickname: "bo" })[0]!.message).toMatchObject({ reason: "nickname_taken" });
    game.host({ kind: "rename", playerId: ada, nickname: "Ada L." });
    expect(game.playerView(ada).nickname).toBe("Ada L.");
  });

  it("pauses the clock: paused time never counts against a student", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.advance(4_000);
    game.host({ kind: "pause" });
    expect(game.answer(ada, [0])).toMatchObject({ accepted: false, reason: "not_accepting" });
    game.advance(60_000); // far beyond the time limit, but paused
    expect(game.state.phase).toBe("question");
    expect(game.hostView().timer).toEqual({ msRemaining: 16_000, totalMs: 20_000 });
    game.host({ kind: "resume" });
    game.advance(1_000);
    game.answer(ada, [0]);
    expect(game.playerView(ada).result?.points.speed).toBe(Math.round(1000 * (1 - 5_000 / 20_000 / 2)));
  });

  it("skips a question without scoring it or breaking streaks", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "next" });
    game.host({ kind: "next" });
    game.host({ kind: "skip" }); // during question 2's countdown
    expect(game.state.phase).toBe("countdown");
    expect(game.state.questionIndex).toBe(2);
    expect(game.state.players[ada]!.streak).toBe(1);
    expect(game.state.records[1]).toMatchObject({ skipped: true });
  });

  it("ends early: straight to the podium if anything was scored, otherwise ended", () => {
    const scored = new Harness();
    const ada = scored.join("Ada");
    scored.startAndOpenFirstQuestion();
    scored.answer(ada, [0]);
    scored.host({ kind: "next" });
    scored.host({ kind: "next" });
    scored.advance(COUNTDOWN_MS);
    scored.host({ kind: "end" });
    expect(scored.state.phase).toBe("podium");
    expect(scored.state.records).toHaveLength(1); // the open question was dropped, not scored

    const fresh = new Harness();
    fresh.join("Ada");
    fresh.host({ kind: "start" });
    fresh.host({ kind: "end" });
    expect(fresh.state.phase).toBe("ended");
  });

  it("changes any setting in the lobby but only live settings mid-game", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.host({ kind: "update_settings", patch: { shuffleQuestions: true, autoplay: true } });
    expect(game.hostView().settings).toMatchObject({ shuffleQuestions: true, autoplay: true });
    game.startAndOpenFirstQuestion();
    expect(game.host({ kind: "update_settings", patch: { shuffleAnswers: true } })[0]!.message).toMatchObject({
      reason: "not_allowed_in_phase",
    });
    game.answer(ada, [0]);
    game.host({ kind: "update_settings", patch: { autoplay: false } });
    expect(game.state.timer).toBeNull(); // autoplay off cancels the reveal timer
    game.host({ kind: "update_settings", patch: { autoplay: true } });
    expect(game.state.timer).not.toBeNull();
  });
});

describe("teams (rule 10)", () => {
  it("auto-balances into teams of the configured size and averages scores", () => {
    const game = new Harness(sampleQuiz({ settings: { teams: { enabled: true, size: 2 }, fastestFinger: false } }));
    const ids = ["A", "B", "C", "D", "E"].map((n) => game.join(n));
    game.startAndOpenFirstQuestion();
    const teamsOf = Object.values(game.state.players).map((p) => p.team);
    expect(new Set(teamsOf).size).toBe(3);
    for (const id of ids) game.answer(id, [0]);
    game.host({ kind: "next" });
    const teams = game.hostView().teams!;
    expect(teams.every((t) => t.score === 1000)).toBe(true); // everyone scored 1000, so every average is 1000
    expect(teams.reduce((n, t) => n + t.members, 0)).toBe(5);
  });

  it("sums scores when set to sum", () => {
    const game = new Harness(sampleQuiz({ settings: { teams: { enabled: true, size: 4, scoring: "sum" }, fastestFinger: false } }));
    const a = game.join("A");
    const b = game.join("B");
    game.startAndOpenFirstQuestion();
    game.answer(a, [0]);
    game.answer(b, [0]);
    game.host({ kind: "next" });
    expect(game.hostView().teams).toEqual([{ team: "Cyan", score: 2000, members: 2, rank: 1 }]);
  });
});

describe("the server never leaks answers before the reveal", () => {
  it("holds over the full message log of a shuffled, three-player game", () => {
    const quiz = sampleQuiz({ settings: { shuffleAnswers: true, shuffleQuestions: true } });
    const game = new Harness(quiz, 7);
    const players = ["Ada", "Bo", "Cy"].map((n) => game.join(n));
    game.startAndOpenFirstQuestion();
    for (let q = 0; q < 3; q++) {
      game.advance(2_000);
      players.forEach((id, i) => game.answer(id, i === 0 ? [0] : [1]));
      game.host({ kind: "next" });
      if (game.state.phase === "leaderboard") game.host({ kind: "next" });
      game.advance(COUNTDOWN_MS);
    }
    game.host({ kind: "end" });

    const secrets = quiz.questions.flatMap((q) => (q.explanation ? [q.explanation] : []));
    for (const logged of game.messagesFor("player")) {
      const json = JSON.stringify(logged.message);
      // Players learn how they did (result.outcome) but never the answer key or explanation.
      expect(json).not.toMatch(/"correct"\s*:/);
      for (const secret of secrets) expect(json).not.toContain(secret);
    }
    for (const logged of game.messagesFor("host")) {
      const json = JSON.stringify(logged.message);
      const phase = logged.message.type === "view" ? logged.message.view.phase : null;
      // Even the projector only receives the key once the question is closed and revealed.
      if (phase !== "reveal") expect(json).not.toMatch(/"correct"\s*:/);
    }
  });

  it("hides answer text on devices when showAnswersOnDevice is off (shapes only)", () => {
    const game = new Harness(sampleQuiz({ settings: { showAnswersOnDevice: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    expect(game.playerView(ada).question!.answers.every((a) => a.text === null)).toBe(true);
    expect(game.hostView().question!.answers.every((a) => a.text !== null)).toBe(true);
  });
});

describe("plan building", () => {
  it("is deterministic for a seed and keeps the answer key attached to the right text after shuffling", () => {
    const quiz = sampleQuiz();
    const settings = { ...quiz.settings, shuffleAnswers: true, shuffleQuestions: true };
    const plan = buildPlan(quiz, settings, 99);
    expect(buildPlan(quiz, settings, 99)).toEqual(plan);
    for (const question of plan) {
      const source = quiz.questions[question.sourceIndex]!;
      if (source.type === "true_false") continue;
      const correctTexts = source.answers.filter((a) => a.correct).map((a) => a.text).sort();
      expect(question.correct.map((i) => question.answers[i]).sort()).toEqual(correctTexts);
    }
  });

  it("applies the time-limit override and the points multiplier", () => {
    const quiz = sampleQuiz();
    const plan = buildPlan(quiz, { ...quiz.settings, timeLimitOverrideSec: 15 }, 1);
    expect(plan.every((q) => q.timeLimitMs === 15_000)).toBe(true);

    const game = new Harness(sampleQuiz({ settings: { pointsMultiplier: 2, fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    expect(game.playerView(ada).result?.points.speed).toBe(2000);
  });
});

describe("results export", () => {
  it("lists nicknames, scores and per-question points, and defuses spreadsheet formulas", () => {
    const game = new Harness(sampleQuiz({ settings: { profanityFilter: false } }));
    const evil = game.join("=HYPERLINK(1)");
    game.startAndOpenFirstQuestion();
    game.answer(evil, [0]);
    const csv = resultsCsv(game.state).split("\r\n");
    expect(csv[0]).toBe("rank,nickname,team,score,correct,Q1,Q2,Q3");
    expect(csv[1]).toMatch(/^1,'=HYPERLINK\(1\),,1100,1,1100,,$/);
  });
});

describe("nickname filter", () => {
  it.each(["Grape Ape", "Peacock", "Parsec", "Essex Eagle", "Dickens"])("allows %s", (name) => {
    expect(isInappropriate(name)).toBe(false);
  });

  it.each(["sh1t", "F.U.C.K", "b1tch", "a$$hole"])("blocks %s", (name) => {
    expect(isInappropriate(name)).toBe(true);
  });

  it("trims and limits length", () => {
    expect(checkNickname("   Ada   ", [], true)).toEqual({ ok: true, nickname: "Ada" });
    expect(checkNickname("x".repeat(21), [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
    expect(checkNickname("   ", [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
  });
});
