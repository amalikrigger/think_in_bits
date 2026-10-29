import { Quiz, type HostCommand, type HostView, type PlayerView, type QuizInput, type ServerMessage } from "@bitblitz/schema";
import { createGame, nextDeadline, step } from "./engine";
import { COUNTDOWN_MS, type EngineEvent, type GameState, type OutgoingMessage } from "./state";

// Drives the pure engine like the Durable Object does, with a fake clock, and keeps the
// full message log so tests can assert on what each role actually received.

export const sampleQuiz = (overrides: Partial<QuizInput> = {}): Quiz =>
  Quiz.parse({
    schemaVersion: 1,
    title: "Circles warm-up",
    questions: [
      {
        type: "single",
        prompt: "Centre of $(x-2)^2+(y+3)^2=25$?",
        answers: [{ text: "(2, −3)", correct: true }, { text: "(−2, 3)" }, { text: "(2, 3)" }, { text: "(−2, −3)" }],
        explanation: "Signs flip inside the brackets.",
      },
      { type: "true_false", prompt: "A tangent meets a circle at exactly one point.", correct: true, timeLimitSec: 10 },
      {
        type: "multi",
        prompt: "Which points lie on $x^2+y^2=25$?",
        points: "double",
        answers: [{ text: "(3, 4)", correct: true }, { text: "(5, 0)", correct: true }, { text: "(4, 4)" }, { text: "(1, 1)" }],
      },
    ],
    ...overrides,
  });

export type LoggedMessage = OutgoingMessage & { at: number };

export class Harness {
  state: GameState;
  now = 1_000_000;
  readonly log: LoggedMessage[] = [];
  private connectionSeq = 0;

  constructor(quiz: Quiz = sampleQuiz(), seed = 42) {
    this.state = createGame(quiz, { code: "123456", seed });
  }

  send(event: EngineEvent): OutgoingMessage[] {
    const { state, messages } = step(this.state, event, this.now);
    this.state = state;
    this.log.push(...messages.map((m) => ({ ...m, at: this.now })));
    return messages;
  }

  /** Moves the clock forward, delivering every timer that falls due on the way. */
  advance(ms: number): void {
    const target = this.now + ms;
    for (let deadline = nextDeadline(this.state); deadline !== null && deadline <= target; deadline = nextDeadline(this.state)) {
      this.now = Math.max(this.now, deadline);
      this.send({ type: "tick" });
    }
    this.now = target;
  }

  join(nickname: string): string {
    const connectionId = `c${++this.connectionSeq}`;
    const messages = this.send({ type: "join", connectionId, nickname, token: `token-${nickname}` });
    const welcome = messages.find((m) => m.message.type === "welcome")?.message;
    if (welcome?.type !== "welcome") throw new Error(`join failed for ${nickname}: ${JSON.stringify(messages[0]?.message)}`);
    return welcome.playerId;
  }

  joinResult(nickname: string, token = `token-${nickname}`): ServerMessage {
    const messages = this.send({ type: "join", connectionId: `c${++this.connectionSeq}`, nickname, token });
    return messages[0]!.message;
  }

  host(command: HostCommand): OutgoingMessage[] {
    return this.send({ type: "host_command", command });
  }

  /** Starts the game and runs the 3 s countdown so the first question is open. */
  startAndOpenFirstQuestion(): void {
    this.host({ kind: "start" });
    this.advance(COUNTDOWN_MS);
  }

  answer(playerId: string, choice: number[], questionIndex = this.state.questionIndex): ServerMessage | undefined {
    const messages = this.send({ type: "answer", playerId, questionIndex, choice });
    return messages.find((m) => m.message.type === "answer_ack")?.message;
  }

  playerView(playerId: string): PlayerView {
    const views = this.log.filter(
      (m) => m.to.kind === "player" && m.to.playerId === playerId && m.message.type === "view",
    );
    const last = views.at(-1)?.message;
    if (last?.type !== "view" || last.view.role !== "player") throw new Error(`no view for ${playerId}`);
    return last.view;
  }

  hostView(): HostView {
    const last = this.log.filter((m) => m.to.kind === "host" && m.message.type === "view").at(-1)?.message;
    if (last?.type !== "view" || last.view.role !== "host") throw new Error("no host view yet");
    return last.view;
  }

  messagesFor(kind: "host" | "player"): LoggedMessage[] {
    return this.log.filter((m) => (kind === "host" ? m.to.kind === "host" : m.to.kind !== "host"));
  }
}
