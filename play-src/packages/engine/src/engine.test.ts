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

    game.press("next");
    expect(game.state.phase).toBe("leaderboard");
    game.press("next");
    expect(game.state.phase).toBe("countdown");
    game.advance(COUNTDOWN_MS);
    game.advance(10_000); // nobody answers question 2; the clock closes it
    expect(game.state.phase).toBe("reveal");

    game.press("next");
    game.press("next");
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0, 1]);
    game.answer(bo, [0]);
    expect(game.state.phase).toBe("reveal");
    game.press("next");
    expect(game.state.phase).toBe("podium"); // the last reveal goes straight to the podium
    game.press("next");
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
    game.press("next");
    expect(game.state.phase).toBe("countdown"); // after question 1: no leaderboard
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0]);
    game.press("next");
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
    expect(game.press("next")[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
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
    game.press("reveal_now");
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
    game.press("next");
    game.press("next");
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
    game.press("next");
    game.press("next");
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [0]);
    game.answer(cy, [1]);
    game.advance(10_000);
    game.press("next");
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
    game.press("next");
    expect(game.hostView().leaderboard!.map((e) => e.nickname)).toEqual(["First", "Second"]);
  });

  it("numbers the board 1, 2, 3… from the live order, even after a kick or a late join", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    const cy = game.join("Cy");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.advance(2_000);
    game.answer(bo, [0]);
    game.answer(cy, [1]);
    game.press("next");
    expect(game.hostView().leaderboard!.map((e) => [e.nickname, e.rank])).toEqual([["Ada", 1], ["Bo", 2], ["Cy", 3]]);

    game.host({ kind: "kick", playerId: ada });
    const late = game.join("Late");
    const board = game.hostView().leaderboard!;
    // Late and Cy both have 0, but Late missed the whole 20 s question while Cy answered (wrongly) at 2 s.
    expect(board.map((e) => [e.nickname, e.rank])).toEqual([["Bo", 1], ["Cy", 2], ["Late", 3]]);
    expect(game.playerView(bo).rank).toBe(1);
    expect(game.playerView(late).rank).toBeNull(); // not scored yet, so no rank to show
  });

  it("tracks previous rank so the board can animate", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.answer(bo, [1]);
    game.press("next");
    game.press("next");
    game.advance(COUNTDOWN_MS);
    game.answer(ada, [1]);
    game.answer(bo, [0]);
    game.press("next");
    game.press("next");
    game.advance(COUNTDOWN_MS);
    game.answer(bo, [0, 1]);
    game.answer(ada, [3]);
    game.press("next");
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

  it("resumes mid-question with the open question, own answer and clock, and still no answer key", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.advance(3_000);
    game.answer(ada, [2]);
    game.send({ type: "disconnect", playerId: ada });
    game.advance(2_000);
    const messages = game.send({ type: "resume", connectionId: "new-socket", token: "token-Ada" });
    const view = messages.find((m) => m.message.type === "view" && m.to.kind === "player")!.message;
    expect(view).toMatchObject({
      type: "view",
      view: { phase: "question", answer: [2], timer: { msRemaining: 15_000, totalMs: 20_000 }, question: { index: 0 } },
    });
    expect(JSON.stringify(view)).not.toMatch(/"correct"\s*:/);
    // The second answer attempt from the resumed player is still refused.
    expect(game.answer(ada, [0])).toMatchObject({ accepted: false, reason: "already_answered" });
  });

  it("a tick that arrives before its deadline changes nothing (alarms may fire a little early)", () => {
    const game = new Harness();
    game.join("Ada");
    game.host({ kind: "start" });
    const before = structuredClone(game.state);
    game.now += COUNTDOWN_MS - 1;
    expect(game.send({ type: "tick" })).toEqual([]);
    expect(game.state).toEqual(before);
  });
});

describe("mid-game joins and kicks", () => {
  it("a late joiner mid-question sees the open question, can answer, and is scored from the question's start", () => {
    const game = new Harness(sampleQuiz({ settings: { fastestFinger: false } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.advance(10_000);
    const late = game.join("Late");
    expect(game.playerView(late)).toMatchObject({ phase: "question", question: { index: 0 }, answer: null });
    expect(game.answer(late, [0])).toMatchObject({ accepted: true });
    game.answer(ada, [0]);
    expect(game.playerView(late).result).toMatchObject({ outcome: "correct", points: { speed: 750 } });
  });

  it("charges a late joiner the time limit of every scored question, but not skipped or unscored ones", () => {
    const quiz = sampleQuiz({ questions: [...sampleQuiz().questions.slice(0, 2), { ...sampleQuiz().questions[2]!, points: "none" }] });
    const game = new Harness(quiz);
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion(); // Q1: 20 s, scored
    game.answer(ada, [0]);
    game.press("next");
    game.press("next");
    game.press("skip"); // Q2 skipped
    game.advance(COUNTDOWN_MS); // Q3: points none
    game.answer(ada, [0, 1]);
    const late = game.join("Late");
    expect(game.state.players[late]!.totalResponseMs).toBe(20_000);
  });

  it("kicking the last player still to answer closes the question", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "kick", playerId: bo });
    expect(game.state.phase).toBe("reveal");
    expect(game.hostView().players.map((p) => p.nickname)).toEqual(["Ada"]);
  });

  it("a kicked player's nickname is free again, and their old answer no longer counts", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "kick", playerId: ada });
    expect(game.hostView().answered).toEqual({ count: 0, total: 1 });
    expect(game.joinResult("ada", "t-new").type).toBe("welcome");
  });

  it("the teacher cannot rename over a disconnected player's nickname", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.send({ type: "disconnect", playerId: bo });
    expect(game.host({ kind: "rename", playerId: ada, nickname: "BO" })[0]!.message).toMatchObject({ reason: "nickname_taken" });
  });
});

describe("command rejections", () => {
  it("names the outcome for commands that make no sense in the current phase", () => {
    const game = new Harness();
    game.join("Ada");
    expect(game.press("reveal_now")[0]!.message).toMatchObject({ command: "reveal_now", reason: "not_allowed_in_phase" });
    expect(game.host({ kind: "resume" })[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
    expect(game.host({ kind: "pause" })[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
    expect(game.press("skip")[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
    expect(game.host({ kind: "kick", playerId: "p99" })[0]!.message).toMatchObject({ reason: "unknown_player" });
    expect(game.host({ kind: "update_settings", patch: { revealSec: 1 } })[0]!.message).toMatchObject({ reason: "invalid_settings" });
    game.host({ kind: "start" });
    expect(game.press("reveal_now")[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
    expect(game.host({ kind: "start" })[0]!.message).toMatchObject({ reason: "not_allowed_in_phase" });
  });

  it("an answer for an earlier question is too late, and for a later one not accepted", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.press("next");
    game.press("next");
    game.advance(COUNTDOWN_MS);
    expect(game.answer(ada, [0], 0)).toMatchObject({ accepted: false, reason: "too_late" });
    expect(game.answer(ada, [0], 2)).toMatchObject({ accepted: false, reason: "not_accepting" });
    expect(game.answer(ada, [0], 1)).toMatchObject({ accepted: true });
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
    game.press("next");
    game.press("next");
    game.press("skip"); // during question 2's countdown
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
    scored.press("next");
    scored.press("next");
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

  it("shows the visible countdown while paused, not the latency grace added to the close timer", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    for (let i = 0; i < 3; i++) game.send({ type: "latency", playerId: ada, rttMs: 1200 }); // grace 600 ms
    game.startAndOpenFirstQuestion();
    game.advance(4_000);
    game.host({ kind: "pause" });
    expect(game.hostView().timer).toEqual({ msRemaining: 16_000, totalMs: 20_000 });
    expect(game.playerView(ada).timer).toEqual({ msRemaining: 16_000, totalMs: 20_000 });
  });

  it("Next while paused advances and unpauses, so the following countdown actually runs", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    expect(game.state.phase).toBe("reveal");
    game.host({ kind: "pause" });
    game.press("next");
    expect(game.state.phase).toBe("leaderboard");
    expect(game.state.paused).toBeNull();
    expect(game.hostView().paused).toBe(false);
    // Pausing on the leaderboard and pressing Next goes straight into a countdown that must run.
    game.host({ kind: "pause" });
    game.press("next");
    expect(game.state.phase).toBe("countdown");
    expect(game.state.paused).toBeNull();
    game.advance(COUNTDOWN_MS);
    expect(game.state.phase).toBe("question");
  });

  it("Skip while paused also unpauses", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "pause" });
    game.press("skip"); // reveal → leaderboard
    expect(game.state.paused).toBeNull();
    game.press("skip"); // leaderboard → countdown of question 2
    game.advance(COUNTDOWN_MS);
    expect(game.state.phase).toBe("question");
  });

  it("autoplay switched on or off while paused takes effect on resume", () => {
    const game = new Harness(sampleQuiz({ settings: { revealSec: 5 } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "pause" });
    game.host({ kind: "update_settings", patch: { autoplay: true } });
    game.host({ kind: "resume" });
    expect(game.state.timer).not.toBeNull();
    game.advance(5_000);
    expect(game.state.phase).toBe("leaderboard");

    // And the other way: a paused autoplay timer must not fire after autoplay is turned off.
    game.host({ kind: "pause" });
    game.host({ kind: "update_settings", patch: { autoplay: false } });
    game.host({ kind: "resume" });
    expect(game.state.timer).toBeNull();
    game.advance(60_000);
    expect(game.state.phase).toBe("leaderboard");
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
    game.press("next");
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
    game.press("next");
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
      game.press("next");
      if (game.state.phase === "leaderboard") game.press("next");
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

  it("counts the 20-character limit in code points, so emoji names are not cut short", () => {
    expect(checkNickname("🦊".repeat(20), [], true)).toMatchObject({ ok: true });
    expect(checkNickname("🦊".repeat(21), [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
  });

  it("rejects names that would render blank: invisible characters, braille blanks, bare combining marks", () => {
    expect(checkNickname("​​​", [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
    expect(checkNickname("⠀⠀", [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
    expect(checkNickname("́́́", [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
    expect(checkNickname("..._", [], true)).toEqual({ ok: false, reason: "nickname_invalid" });
    expect(checkNickname("Ada​​", ["Ada"], true)).toEqual({ ok: false, reason: "nickname_taken" });
  });

  it("folds compatibility look-alikes (fullwidth, ligatures) to plain text", () => {
    expect(checkNickname("Ａｄａ", [], true)).toEqual({ ok: true, nickname: "Ada" });
    expect(checkNickname("ﬁsh", [], true)).toEqual({ ok: true, nickname: "fish" });
  });

  it("applies the same rules when the teacher renames", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    expect(game.host({ kind: "rename", playerId: ada, nickname: "⠀" })[0]!.message).toMatchObject({ reason: "nickname_invalid" });
    game.host({ kind: "rename", playerId: ada, nickname: "Ａda L." });
    expect(game.playerView(ada).nickname).toBe("Ada L.");
  });
});

// ---------------------------------------------------------------------------
// Second adversarial review (Nov 2026). Each scenario failed before its fix.

describe("a teacher's pause holds until they resume", () => {
  it("does not reveal when the last student still to answer drops out during a pause", () => {
    const game = new Harness(sampleQuiz({ settings: { autoplay: true } }));
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "pause" });

    game.send({ type: "disconnect", playerId: bo });
    game.advance(60_000);

    expect(game.state.phase).toBe("question");
    expect(game.state.paused).not.toBeNull();
  });

  it("does not reveal when the teacher kicks the last student still to answer during a pause", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "pause" });

    game.host({ kind: "kick", playerId: bo });

    expect(game.state.phase).toBe("question");
  });

  it("closes the question on resume if everyone still in the game has answered by then", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.host({ kind: "pause" });
    game.send({ type: "disconnect", playerId: bo });

    game.host({ kind: "resume" });

    expect(game.state.phase).toBe("reveal");
  });
});

describe("an advance press only acts on the screen the teacher was looking at", () => {
  it("ignores 'Reveal now' that arrives just after the clock already revealed, instead of skipping the reveal", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    const sawQuestion = { phase: "question" as const, questionIndex: 0 };
    game.advance(20_000); // the time limit passes: the server reveals on its own

    const rejected = game.host({ kind: "next", seen: sawQuestion });

    expect(rejected[0]!.message).toMatchObject({ type: "command_rejected", command: "next", reason: "out_of_date" });
    expect(game.state.phase).toBe("reveal");
    expect(game.playerView(ada).phase).toBe("reveal");
  });

  it("ignores a 'Next' pressed on the reveal that arrives after autoplay already moved on", () => {
    const game = new Harness(sampleQuiz({ settings: { autoplay: true, revealSec: 6 } }));
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    const sawReveal = { phase: "reveal" as const, questionIndex: 0 };
    game.advance(6_000); // autoplay leaves the reveal

    game.host({ kind: "next", seen: sawReveal });

    expect(game.state.phase).toBe("leaderboard");
  });

  it("ignores a 'Skip' meant for an earlier question", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]);
    game.press("next"); // reveal → leaderboard
    game.press("next"); // leaderboard → countdown of question 2
    game.advance(COUNTDOWN_MS);

    game.host({ kind: "skip", seen: { phase: "question", questionIndex: 0 } });

    expect(game.state.phase).toBe("question");
    expect(game.state.questionIndex).toBe(1);
  });

  it("tells the projector which question it is on, so presses can name it", () => {
    const game = new Harness();
    game.join("Ada");
    expect(game.hostView().questionIndex).toBe(-1);
    game.startAndOpenFirstQuestion();
    expect(game.hostView().questionIndex).toBe(0);
  });
});

describe("what students see before a question opens", () => {
  it("sends no answer texts to phones during the countdown, only the prompt", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    game.host({ kind: "start" });

    const countdown = game.playerView(ada);

    expect(countdown.phase).toBe("countdown");
    expect(countdown.question?.prompt).toContain("Centre");
    expect(countdown.question?.answers.every((a) => a.text === null)).toBe(true);
    game.advance(COUNTDOWN_MS);
    expect(game.playerView(ada).question?.answers[0]?.text).toBe("(2, −3)");
  });
});

describe("points behind the next player (rule 11)", () => {
  it("names the nearest player with a higher score, skipping players tied with you", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    const cy = game.join("Cy");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [0]); // right
    game.answer(bo, [1]); // wrong: 0
    game.answer(cy, [1]); // wrong: 0, tied with Bo but ranked below on join order

    const cyResult = game.playerView(cy).result!;
    const adaScore = game.playerView(ada).score;

    expect(cyResult.behind).toEqual({ nickname: "Ada", points: adaScore });
  });

  it("says nothing about being behind when everyone above is tied with you", () => {
    const game = new Harness();
    const ada = game.join("Ada");
    const bo = game.join("Bo");
    game.startAndOpenFirstQuestion();
    game.answer(ada, [1]);
    game.answer(bo, [1]);

    expect(game.playerView(bo).result!.behind).toBeNull();
  });
});
