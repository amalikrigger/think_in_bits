import {
  QuizSettings,
  type AnswerRejection,
  type CommandRejection,
  type HostCommand,
  type JoinRejection,
  type Quiz,
  type QuizSettings as Settings,
  type SettingsPatch,
} from "@bitblitz/schema";
import { checkNickname, generateNickname } from "./nicknames";
import { seededRandom, shuffled } from "./random";
import { oneWayLatencyMs, responseTimeMs, scoreQuestion } from "./scoring";
import {
  COUNTDOWN_MS,
  RTT_SAMPLES_KEPT,
  TEAM_NAMES,
  type EngineEvent,
  type GameState,
  type OutgoingMessage,
  type PlannedQuestion,
  type PlayerState,
  type StepResult,
} from "./state";
import { hostView, playerView, standings } from "./views";

// The pure game core: step(state, event, now) → { state, messages }.
// No I/O, no clock, no randomness beyond the seed. The Durable Object feeds it events and
// delivers its messages; the same core could run on a Pi on the classroom LAN.

export function createGame(quiz: Quiz, options: { code: string; seed: number }): GameState {
  return {
    code: options.code,
    seed: options.seed,
    quiz,
    settings: structuredClone(quiz.settings),
    phase: "lobby",
    plan: [],
    questionIndex: -1,
    players: {},
    nextJoinSeq: 0,
    bannedTokens: [],
    timer: null,
    paused: null,
    open: null,
    records: [],
  };
}

/** When the shell should deliver the next `tick`, or null if nothing is scheduled. */
export function nextDeadline(state: GameState): number | null {
  return state.paused ? null : (state.timer?.at ?? null);
}

export function step(previous: GameState, event: EngineEvent, now: number): StepResult {
  const game = new Step(structuredClone(previous), now);
  game.handle(event);
  return { state: game.state, messages: game.messages };
}

// Settings that make sense to change once the game is running.
const LIVE_SETTINGS = new Set<keyof Settings>([
  "autoplay",
  "revealSec",
  "leaderboardSec",
  "sound",
  "music",
  "locked",
  "leaderboardEvery",
  "explanationSlide",
]);

/** One step's mutable working copy; never escapes `step`. */
class Step {
  readonly messages: OutgoingMessage[] = [];

  constructor(
    readonly state: GameState,
    readonly now: number,
  ) {}

  handle(event: EngineEvent): void {
    switch (event.type) {
      case "join":
        return this.join(event.connectionId, event.nickname, event.token);
      case "resume":
        return this.resume(event.connectionId, event.token);
      case "disconnect":
        return this.disconnect(event.playerId);
      case "answer":
        return this.answer(event.playerId, event.questionIndex, event.choice);
      case "latency":
        return this.latency(event.playerId, event.rttMs);
      case "host_connected":
        this.send({ kind: "host" }, { type: "host_welcome", code: this.state.code });
        return this.sendHostView();
      case "host_command":
        return this.command(event.command);
      case "tick":
        return this.tick();
    }
  }

  // ---------- players ----------

  private join(connectionId: string, requestedNickname: string, token: string): void {
    const rejection = this.joinRejection();
    if (rejection) return this.rejectJoin(connectionId, rejection);

    const taken = this.activePlayers().map((p) => p.nickname);
    const joinSeq = this.state.nextJoinSeq;
    let nickname: string;
    if (this.state.settings.generatedNicknamesOnly) {
      nickname = generateNickname(this.state.seed, joinSeq, taken);
    } else {
      const check = checkNickname(requestedNickname, taken, this.state.settings.profanityFilter);
      if (!check.ok) return this.rejectJoin(connectionId, check.reason);
      nickname = check.nickname;
    }

    const player: PlayerState = {
      id: `p${joinSeq + 1}`,
      nickname,
      token,
      joinSeq,
      connected: true,
      score: 0,
      streak: 0,
      // A late joiner missed the questions already scored, so they carry the same time penalty
      // as any other miss; otherwise rule 9's tie-break would rank them above a player who tried.
      totalResponseMs: this.missedTimeMs(),
      correctCount: 0,
      rttSamplesMs: [],
      team: this.state.phase === "lobby" ? null : this.smallestTeam(),
      rank: null,
      previousRank: null,
    };
    this.state.players[player.id] = player;
    this.state.nextJoinSeq += 1;

    this.send({ kind: "connection", connectionId }, { type: "welcome", playerId: player.id, token, nickname });
    this.sendPlayerView(player.id);
    this.sendHostView();
    // Lobby screens show the head count, so everyone waiting hears about the newcomer.
    if (this.state.phase === "lobby") this.sendAllPlayerViews();
  }

  private joinRejection(): JoinRejection | null {
    const { phase, settings } = this.state;
    if (phase === "podium" || phase === "ended") return "game_over";
    if (phase !== "lobby" && !settings.lateJoin) return "game_started";
    if (settings.locked) return "room_locked";
    if (this.activePlayers().length >= settings.lobbyCapacity) return "room_full";
    return null;
  }

  private rejectJoin(connectionId: string, reason: JoinRejection): void {
    this.send({ kind: "connection", connectionId }, { type: "join_rejected", reason });
  }

  private resume(connectionId: string, token: string): void {
    if (this.state.bannedTokens.includes(token)) return this.rejectJoin(connectionId, "kicked");
    const player = this.activePlayers().find((p) => p.token === token);
    if (!player) return this.rejectJoin(connectionId, "unknown_token");
    player.connected = true;
    this.send({ kind: "connection", connectionId }, {
      type: "welcome",
      playerId: player.id,
      token,
      nickname: player.nickname,
    });
    this.sendPlayerView(player.id);
    this.sendHostView();
  }

  private disconnect(playerId: string): void {
    const player = this.state.players[playerId];
    if (!player) return;
    player.connected = false;
    this.sendHostView();
    // A dropped player no longer holds up "everyone has answered".
    if (this.state.phase === "question") this.closeIfEveryoneAnswered();
  }

  private latency(playerId: string, rttMs: number): void {
    const player = this.state.players[playerId];
    if (!player || !Number.isFinite(rttMs) || rttMs < 0) return;
    player.rttSamplesMs = [...player.rttSamplesMs, rttMs].slice(-RTT_SAMPLES_KEPT);
  }

  private answer(playerId: string, questionIndex: number, choice: number[]): void {
    const player = this.state.players[playerId];
    if (!player) return;
    const rejection = this.answerRejection(player, questionIndex, choice);
    if (rejection) {
      return this.send({ kind: "player", playerId }, { type: "answer_ack", questionIndex, accepted: false, reason: rejection });
    }

    const open = this.state.open!;
    const question = this.currentQuestion()!;
    const responseMs = responseTimeMs({
      openedAt: open.openedAt,
      receivedAt: this.now,
      oneWayLatencyMs: oneWayLatencyMs(player.rttSamplesMs),
    });
    if (responseMs > question.timeLimitMs) {
      return this.send({ kind: "player", playerId }, { type: "answer_ack", questionIndex, accepted: false, reason: "too_late" });
    }

    open.answers[playerId] = { choice: [...new Set(choice)].sort((a, b) => a - b), receivedAt: this.now, responseMs };
    this.send({ kind: "player", playerId }, { type: "answer_ack", questionIndex, accepted: true });
    this.sendPlayerView(playerId);
    const progress = this.answerProgress();
    this.send({ kind: "host" }, { type: "answer_progress", ...progress });
    this.closeIfEveryoneAnswered();
  }

  private answerRejection(player: PlayerState, questionIndex: number, choice: number[]): AnswerRejection | null {
    const { phase, open, paused } = this.state;
    const accepting = phase === "question" && open !== null && !paused && questionIndex === open.index;
    if (!accepting) {
      // An answer for a question that has already closed is "too late"; anything else
      // (lobby, countdown, paused, a future question) is simply "not accepting".
      const closed =
        questionIndex < this.state.questionIndex ||
        (questionIndex === this.state.questionIndex && ["reveal", "leaderboard", "podium", "ended"].includes(phase));
      return closed ? "too_late" : "not_accepting";
    }
    if (!open) return "not_accepting";
    if (open.answers[player.id]) return "already_answered";
    const question = this.currentQuestion()!;
    const unique = new Set(choice);
    const inRange = choice.every((i) => Number.isInteger(i) && i >= 0 && i < question.answers.length);
    const sizeOk = question.type === "multi" ? unique.size >= 1 : unique.size === 1;
    if (!inRange || !sizeOk) return "invalid_choice";
    return null;
  }

  // ---------- host ----------

  private command(command: HostCommand): void {
    const rejection = this.runCommand(command);
    if (rejection) this.send({ kind: "host" }, { type: "command_rejected", command: command.kind, reason: rejection });
  }

  private runCommand(command: HostCommand): CommandRejection | null {
    const { phase } = this.state;
    switch (command.kind) {
      case "start":
        if (phase !== "lobby") return "not_allowed_in_phase";
        return this.start();
      case "next":
        return this.next();
      case "reveal_now":
        if (phase !== "question") return "not_allowed_in_phase";
        this.closeQuestion();
        return null;
      case "skip":
        return this.skip();
      case "pause":
        return this.pause();
      case "resume":
        return this.resumeGame();
      case "end":
        return this.end();
      case "kick":
        return this.kick(command.playerId);
      case "rename":
        return this.rename(command.playerId, command.nickname);
      case "lock":
        this.state.settings.locked = command.locked;
        this.sendHostView();
        return null;
      case "update_settings":
        return this.updateSettings(command.patch);
    }
  }

  private start(): CommandRejection | null {
    if (this.activePlayers().length === 0) return "no_players";
    this.state.plan = buildPlan(this.state.quiz, this.state.settings, this.state.seed);
    if (this.state.settings.teams.enabled) this.assignTeams();
    this.beginCountdown(0);
    return null;
  }

  private next(): CommandRejection | null {
    switch (this.state.phase) {
      case "lobby":
        return this.start();
      case "question":
        this.closeQuestion();
        return null;
      case "reveal":
        this.afterReveal();
        return null;
      case "leaderboard":
        this.advanceToQuestion(this.state.questionIndex + 1);
        return null;
      case "podium":
        this.finish();
        return null;
      case "countdown":
      case "ended":
        return "not_allowed_in_phase";
    }
  }

  private skip(): CommandRejection | null {
    const { phase, questionIndex } = this.state;
    if (phase === "countdown" || phase === "question") {
      // A skipped question scores nothing and leaves streaks alone.
      this.state.records.push({ index: questionIndex, skipped: true, counts: [], results: {} });
      this.state.open = null;
      this.state.paused = null;
      this.advanceToQuestion(questionIndex + 1);
      return null;
    }
    if (phase === "reveal" || phase === "leaderboard") return this.next();
    return "not_allowed_in_phase";
  }

  private pause(): CommandRejection | null {
    const { phase, paused, timer } = this.state;
    if (paused || !["countdown", "question", "reveal", "leaderboard"].includes(phase)) return "not_allowed_in_phase";
    this.state.paused = { at: this.now, remainingMs: timer ? Math.max(0, timer.at - this.now) : null };
    this.broadcast();
    return null;
  }

  private resumeGame(): CommandRejection | null {
    const { paused, timer, open, phase } = this.state;
    if (!paused) return "not_allowed_in_phase";
    const pausedFor = this.now - paused.at;
    this.state.paused = null;
    if (phase === "reveal" || phase === "leaderboard") {
      // Autoplay may have been switched while paused: the waiting timer follows the current setting.
      if (!this.state.settings.autoplay) this.state.timer = null;
      else if (timer && paused.remainingMs !== null) this.state.timer = { ...timer, at: this.now + paused.remainingMs };
      else this.setAutoplayTimer();
    } else if (timer && paused.remainingMs !== null) {
      this.state.timer = { ...timer, at: this.now + paused.remainingMs };
    }
    if (open && phase === "question") open.openedAt += pausedFor;
    this.broadcast();
    return null;
  }

  private end(): CommandRejection | null {
    const { phase } = this.state;
    if (phase === "ended") return "not_allowed_in_phase";
    if (phase === "podium") {
      this.finish();
      return null;
    }
    // Ending early drops an unscored open question and goes to the podium if anything was scored.
    this.state.open = null;
    this.state.paused = null;
    if (this.state.records.some((r) => !r.skipped)) this.enterPodium();
    else this.finish();
    return null;
  }

  private kick(playerId: string): CommandRejection | null {
    const player = this.state.players[playerId];
    if (!player) return "unknown_player";
    this.send({ kind: "player", playerId }, { type: "kicked" });
    this.state.bannedTokens.push(player.token);
    delete this.state.players[playerId];
    if (this.state.open) delete this.state.open.answers[playerId];
    // Everyone's head count and rank can change, so every screen is refreshed.
    this.broadcast();
    if (this.state.phase === "question") this.closeIfEveryoneAnswered();
    return null;
  }

  private rename(playerId: string, requested: string): CommandRejection | null {
    const player = this.state.players[playerId];
    if (!player) return "unknown_player";
    // The teacher is trusted, so no profanity filter; the length, visibility and uniqueness rules still apply.
    const others = this.activePlayers().filter((p) => p.id !== playerId).map((p) => p.nickname);
    const check = checkNickname(requested, others, false);
    if (!check.ok) return check.reason === "nickname_taken" ? "nickname_taken" : "nickname_invalid";
    player.nickname = check.nickname;
    this.sendPlayerView(playerId);
    this.sendHostView();
    return null;
  }

  private updateSettings(patch: SettingsPatch): CommandRejection | null {
    const keys = Object.keys(patch) as (keyof Settings)[];
    if (this.state.phase !== "lobby" && keys.some((k) => !LIVE_SETTINGS.has(k))) return "not_allowed_in_phase";
    const merged = QuizSettings.safeParse({ ...this.state.settings, ...patch });
    if (!merged.success) return "invalid_settings";
    this.state.settings = merged.data;

    // Turning autoplay on or off mid-game starts or cancels the waiting timer.
    if ((this.state.phase === "reveal" || this.state.phase === "leaderboard") && !this.state.paused) {
      if (!merged.data.autoplay) this.state.timer = null;
      else if (!this.state.timer) this.setAutoplayTimer();
    }
    this.broadcast();
    return null;
  }

  // ---------- timers and phase transitions ----------

  private tick(): void {
    const deadline = nextDeadline(this.state);
    if (deadline === null || this.now < deadline) return;
    this.state.timer = null;
    switch (this.state.phase) {
      case "countdown":
        return this.openQuestion();
      case "question":
        return this.closeQuestion();
      case "reveal":
        return this.afterReveal();
      case "leaderboard":
        return this.advanceToQuestion(this.state.questionIndex + 1);
      default:
        return;
    }
  }

  private beginCountdown(index: number): void {
    this.state.phase = "countdown";
    this.state.questionIndex = index;
    this.state.open = null;
    // An explicit advance (Next, Skip) while paused ends the pause: a paused countdown would never fire.
    this.state.paused = null;
    this.state.timer = { at: this.now + COUNTDOWN_MS, totalMs: COUNTDOWN_MS };
    this.broadcast();
  }

  private openQuestion(): void {
    const question = this.currentQuestion()!;
    this.state.phase = "question";
    this.state.open = { index: this.state.questionIndex, openedAt: this.now, answers: {} };
    // Close a little after the limit so a player on slow Wi-Fi still gets their fair time.
    const grace = Math.max(0, ...this.activePlayers().map((p) => oneWayLatencyMs(p.rttSamplesMs)));
    this.state.timer = { at: this.now + question.timeLimitMs + grace, totalMs: question.timeLimitMs };
    this.broadcast();
  }

  private closeIfEveryoneAnswered(): void {
    const { count, total } = this.answerProgress();
    if (total > 0 && count >= total) this.closeQuestion();
  }

  private closeQuestion(): void {
    const open = this.state.open;
    const question = this.currentQuestion();
    if (!open || !question) return;

    const players = this.activePlayers();
    const previousRanks = new Map(players.map((p) => [p.id, p.rank]));
    const results = scoreQuestion({
      type: question.type,
      correct: question.correct,
      points: question.points,
      multiplier: this.state.settings.pointsMultiplier,
      timeLimitMs: question.timeLimitMs,
      fastestFinger: this.state.settings.fastestFinger,
      streaks: this.state.settings.streaks,
      multiPenalty: this.state.settings.multiPenalty,
      streaksBefore: Object.fromEntries(players.map((p) => [p.id, p.streak])),
      playerIds: players.map((p) => p.id),
      answers: Object.entries(open.answers).map(([playerId, a]) => ({
        playerId,
        choice: a.choice,
        responseMs: a.responseMs,
        receivedAt: a.receivedAt,
        joinSeq: this.state.players[playerId]?.joinSeq ?? Number.MAX_SAFE_INTEGER,
      })),
    });

    const counts = question.answers.map(() => 0);
    for (const answer of Object.values(open.answers)) for (const i of answer.choice) counts[i] = (counts[i] ?? 0) + 1;

    for (const player of players) {
      const result = results[player.id]!;
      const answer = open.answers[player.id];
      player.score += result.points.total;
      player.streak = result.streak;
      if (result.outcome === "correct") player.correctCount += 1;
      if (question.points !== "none") player.totalResponseMs += answer ? answer.responseMs : question.timeLimitMs;
    }
    standings(this.state).forEach((player, i) => {
      player.previousRank = previousRanks.get(player.id) ?? null;
      player.rank = i + 1;
    });

    this.state.records.push({ index: open.index, skipped: false, counts, results });
    this.state.phase = "reveal";
    this.state.paused = null;
    this.state.timer = null;
    if (this.state.settings.autoplay) this.setAutoplayTimer();
    this.broadcast();
  }

  private afterReveal(): void {
    const index = this.state.questionIndex;
    if (index + 1 >= this.state.plan.length) return this.enterPodium();
    const every = this.state.settings.leaderboardEvery;
    if ((index + 1) % every === 0) {
      this.state.phase = "leaderboard";
      this.state.paused = null;
      this.state.timer = null;
      if (this.state.settings.autoplay) this.setAutoplayTimer();
      return this.broadcast();
    }
    this.advanceToQuestion(index + 1);
  }

  private advanceToQuestion(index: number): void {
    if (index >= this.state.plan.length) {
      if (this.state.records.some((r) => !r.skipped)) return this.enterPodium();
      return this.finish();
    }
    this.beginCountdown(index);
  }

  private enterPodium(): void {
    this.state.phase = "podium";
    this.state.timer = null;
    this.state.paused = null;
    this.state.open = null;
    this.broadcast();
  }

  private finish(): void {
    this.state.phase = "ended";
    this.state.timer = null;
    this.state.paused = null;
    this.state.open = null;
    this.broadcast();
  }

  private setAutoplayTimer(): void {
    const seconds = this.state.phase === "leaderboard" ? this.state.settings.leaderboardSec : this.state.settings.revealSec;
    this.state.timer = { at: this.now + seconds * 1000, totalMs: seconds * 1000 };
  }

  // ---------- teams ----------

  private assignTeams(): void {
    const players = shuffled(
      this.activePlayers().sort((a, b) => a.joinSeq - b.joinSeq),
      seededRandom(this.state.seed ^ 0x7ea3),
    );
    const teamCount = Math.max(1, Math.min(TEAM_NAMES.length, Math.ceil(players.length / this.state.settings.teams.size)));
    players.forEach((player, i) => {
      player.team = TEAM_NAMES[i % teamCount]!;
    });
  }

  private smallestTeam(): string | null {
    if (!this.state.settings.teams.enabled || this.state.plan.length === 0) return null;
    const sizes = new Map<string, number>();
    for (const p of this.activePlayers()) if (p.team) sizes.set(p.team, (sizes.get(p.team) ?? 0) + 1);
    if (sizes.size === 0) return TEAM_NAMES[0]!;
    return [...sizes.entries()].sort((a, b) => a[1] - b[1] || TEAM_NAMES.indexOf(a[0]) - TEAM_NAMES.indexOf(b[0]))[0]![0];
  }

  // ---------- helpers ----------

  private activePlayers(): PlayerState[] {
    return Object.values(this.state.players);
  }

  private currentQuestion(): PlannedQuestion | undefined {
    return this.state.plan[this.state.questionIndex];
  }

  /** Total time a player who missed every scored question so far would have been charged. */
  private missedTimeMs(): number {
    let total = 0;
    for (const record of this.state.records) {
      const question = this.state.plan[record.index];
      if (!record.skipped && question && question.points !== "none") total += question.timeLimitMs;
    }
    return total;
  }

  private answerProgress(): { count: number; total: number } {
    const answers = this.state.open?.answers ?? {};
    const expected = this.activePlayers().filter((p) => p.connected || answers[p.id]);
    return { count: expected.filter((p) => answers[p.id]).length, total: expected.length };
  }

  private send(to: OutgoingMessage["to"], message: OutgoingMessage["message"]): void {
    this.messages.push({ to, message });
  }

  private sendHostView(): void {
    this.send({ kind: "host" }, { type: "view", view: hostView(this.state, this.now) });
  }

  private sendPlayerView(playerId: string): void {
    this.send({ kind: "player", playerId }, { type: "view", view: playerView(this.state, playerId, this.now) });
  }

  private sendAllPlayerViews(): void {
    for (const player of this.activePlayers()) if (player.connected) this.sendPlayerView(player.id);
  }

  private broadcast(): void {
    this.sendHostView();
    this.sendAllPlayerViews();
  }
}

/** Resolves defaults and applies shuffles; the answer key is only ever read from here. */
export function buildPlan(quiz: Quiz, settings: Settings, seed: number): PlannedQuestion[] {
  const random = seededRandom(seed);
  const order = quiz.questions.map((_, i) => i);
  const questionOrder = settings.shuffleQuestions ? shuffled(order, random) : order;

  return questionOrder.map((sourceIndex) => {
    const q = quiz.questions[sourceIndex]!;
    const timeLimitSec = settings.timeLimitOverrideSec ?? q.timeLimitSec ?? quiz.defaults.timeLimitSec;
    const common = {
      sourceIndex,
      type: q.type,
      prompt: q.prompt,
      media: q.media ?? null,
      timeLimitMs: timeLimitSec * 1000,
      points: q.points ?? quiz.defaults.points,
      explanation: q.explanation ?? null,
    };
    if (q.type === "true_false") {
      return { ...common, answers: ["True", "False"], correct: [q.correct ? 0 : 1] };
    }
    const slots = q.answers.map((_, i) => i);
    const answerOrder = settings.shuffleAnswers ? shuffled(slots, random) : slots;
    return {
      ...common,
      answers: answerOrder.map((i) => q.answers[i]!.text),
      correct: answerOrder.flatMap((i, slot) => (q.answers[i]!.correct ? [slot] : [])),
    };
  });
}
