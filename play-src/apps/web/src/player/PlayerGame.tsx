import type { JoinRejection, PlayerView, ServerMessage } from "@bitblitz/schema";
import { REJECTION_TEXT } from "../lib/rejection-text";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnswerTile } from "../components/AnswerTile";
import { BrandBar, ConnectionBadge } from "../components/BrandBar";
import { MathText, preloadMath } from "../components/MathText";
import { QuestionMedia } from "../components/QuestionMedia";
import { Screen } from "../components/Screen";
import { TimerRing } from "../components/TimerRing";
import { countOf, formatPoints, ordinal } from "../lib/format";
import { liveText } from "../lib/live-text";
import { answerColumns, PODIUM_BUILD_MS } from "../lib/stage";
import { playerSeat } from "../lib/storage";
import { useGameSocket } from "../lib/useGameSocket";
import { useViewport } from "../lib/useViewport";

// One-thumb phone screen. Tiles fill the lower part of the screen; single and
// true/false submit on tap, multi-select toggles and then submits from the footer.
// The chosen answer and the in-flight submission live here (not in the answer screen),
// so they survive re-renders, a reconnect, and the paused overlay coming and going.

type Pending = { index: number; choice: number[] };

export function PlayerGame({
  code,
  nickname,
  onRejected,
  onLeave,
}: {
  code: string;
  nickname: string;
  onRejected: (reason: JoinRejection) => void;
  onLeave: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  // Tiles lock the moment one is tapped, so a double tap can't submit twice; the lock
  // lifts if the server rejects the answer (too late, not accepting).
  const [pending, setPending] = useState<Pending | null>(null);
  const [picked, setPicked] = useState<Pending>({ index: -1, choice: [] });

  const onMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === "welcome") playerSeat.set(code, { token: message.token, nickname: message.nickname });
      if (message.type === "join_rejected") {
        playerSeat.set(code, null);
        onRejected(message.reason);
      }
      if (message.type === "kicked") playerSeat.set(code, null);
      if (message.type === "answer_ack") {
        if (!message.accepted) {
          setPending((current) => (current?.index === message.questionIndex ? null : current));
          setNotice(REJECTION_TEXT[message.reason]);
        }
      }
    },
    [code, onRejected],
  );

  const { status, view, send, stop, reconnect, stopReason } = useGameSocket<PlayerView>({
    code,
    role: "player",
    hello: () => {
      const seat = playerSeat.get(code);
      return seat ? { type: "resume", token: seat.token } : { type: "join", nickname };
    },
    onMessage,
  });

  useEffect(() => {
    if (view?.phase !== "ended") return;
    // A finished game is not resumed: a refresh, or opening the page next lesson, starts fresh.
    playerSeat.set(code, null);
    stop("The game has ended. Thanks for playing!");
  }, [view?.phase, stop, code]);

  // Download KaTeX while the lobby waits, so the first math prompt renders at once.
  useEffect(() => {
    void preloadMath();
  }, []);

  // An answer sent into a socket that then died never reached the server; once we are
  // reconnecting, let the resumed view decide whether the tiles are locked.
  useEffect(() => {
    if (status === "reconnecting") setPending(null);
  }, [status]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const question = view?.phase === "question" ? view.question : null;
  const choice = question && picked.index === question.index ? picked.choice : [];
  const locked = question !== null && (view!.answer !== null || pending?.index === question.index);

  function submit(answer: number[]) {
    if (!question || locked) return;
    const sent = send({ type: "answer", questionIndex: question.index, choice: answer });
    if (!sent) {
      setNotice("Not connected. Hold on, reconnecting…");
      return;
    }
    setPending({ index: question.index, choice: answer });
  }

  function pick(i: number) {
    if (!question) return;
    if (question.type !== "multi") return submit([i]);
    setPicked({ index: question.index, choice: choice.includes(i) ? choice.filter((x) => x !== i) : [...choice, i] });
  }

  const multiFooter =
    question && question.type === "multi" && !locked ? (
      <div className="bb-footer mx-auto w-full max-w-xl px-4 pt-2">
        <button type="button" className="bb-btn bb-btn-primary min-h-14 w-full text-lg" disabled={choice.length === 0 || view!.paused} onClick={() => submit(choice)}>
          Submit{choice.length > 0 ? ` (${choice.length})` : ""}
        </button>
      </div>
    ) : undefined;

  const gameOver = view !== null && (view.phase === "podium" || view.phase === "ended");
  const stoppedEarly = status === "stopped" && !gameOver;

  return (
    <Screen
      header={
        <BrandBar
          compact
          right={
            <>
              {/* Closing the socket after the final screen is the normal ending, not a lost connection. */}
              {!(gameOver && status === "stopped") && <ConnectionBadge status={status} />}
              {view && (
                <span className="max-w-28 truncate rounded-full bg-white/10 px-3 py-1 text-sm font-bold sm:max-w-40">
                  <span className="sr-only">You are </span>
                  {view.nickname}
                </span>
              )}
            </>
          }
        />
      }
      footer={multiFooter}
      mainClassName="mx-auto w-full max-w-xl px-4"
    >
      {stoppedEarly ? (
        <Message title={stopReason ?? "Disconnected"}>
          <button type="button" className="bb-btn bb-btn-primary mt-4" onClick={onLeave}>
            Join another game
          </button>
        </Message>
      ) : !view ? (
        <Message
          title={status === "reconnecting" ? "Reconnecting…" : "Joining…"}
          detail={status === "reconnecting" ? "Check your Wi-Fi. We'll keep trying." : undefined}
        >
          {status === "reconnecting" && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button type="button" className="bb-btn bb-btn-ghost" onClick={reconnect}>
                Try again now
              </button>
              <button type="button" className="bb-btn bb-btn-quiet" onClick={onLeave}>
                Different code
              </button>
            </div>
          )}
        </Message>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view.phase}-${view.question?.index ?? ""}`}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PhaseView view={view} code={code} locked={locked} choice={choice} sent={pending?.choice ?? null} onPick={pick} onLeave={onLeave} />
          </motion.div>
        </AnimatePresence>
      )}

      <p className="sr-only-live" aria-live="polite" aria-atomic="true">
        {liveText(view, status)}
      </p>

      {view?.paused && view.phase !== "lobby" && (
        <div role="status" className="fixed inset-x-4 top-14 z-20 mx-auto max-w-xl rounded-2xl bg-surface-raised p-4 text-center text-lg font-bold shadow-xl">
          ❚❚ Paused by the teacher
        </div>
      )}
      <AnimatePresence>
        {notice && (
          // Shown under the header, over the prompt rather than over the tiles a thumb is aiming at.
          <motion.p
            role="alert"
            className={`fixed inset-x-4 z-20 mx-auto max-w-xl rounded-2xl bg-coral p-4 text-center font-bold text-[#0a0a0a] shadow-xl ${view?.paused ? "top-36" : "top-14"}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </Screen>
  );
}

type PhaseProps = {
  view: PlayerView;
  code: string;
  locked: boolean;
  choice: number[];
  sent: number[] | null;
  onPick: (index: number) => void;
  onLeave: () => void;
};

function PhaseView(props: PhaseProps) {
  const { view } = props;
  switch (view.phase) {
    case "lobby":
      return (
        <Message title="You're in!" detail={`Look for ${view.nickname} on the big screen.`}>
          <p className="text-muted">
            {view.playerCount} player{view.playerCount === 1 ? "" : "s"} waiting
          </p>
          {view.team && <p className="mt-2 font-bold text-primary">Team {view.team}</p>}
          <p className="mt-6 text-sm text-muted">Keep this page open. If you lose Wi-Fi, you'll come straight back in.</p>
        </Message>
      );
    case "countdown":
      return (
        <Message title="Get ready!" detail={view.question ? `Question ${view.question.index + 1} of ${view.question.total}` : undefined}>
          {view.question && view.showAnswersOnDevice && (
            <p className="text-xl font-semibold [overflow-wrap:anywhere]">
              <MathText text={view.question.prompt} />
            </p>
          )}
        </Message>
      );
    case "question":
      return <AnswerScreen {...props} />;
    case "reveal":
    case "leaderboard":
      return <ResultScreen view={view} />;
    case "podium":
    case "ended":
      return <FinalScreen view={view} onLeave={props.onLeave} />;
  }
}

function AnswerScreen({ view, code, locked, choice, sent, onPick }: PhaseProps) {
  const question = view.question!;
  const { width } = useViewport();

  if (locked) {
    const answer = view.answer ?? sent ?? [];
    return (
      <Message title="Locked in!" detail="Waiting for everyone else…">
        <div className="flex justify-center gap-2" aria-label="Your answer">
          {answer.map((i) => (
            <span key={i} className="h-4 w-16 rounded-full" style={{ background: `var(--bb-tile-${(i % 6) + 1})` }} />
          ))}
        </div>
      </Message>
    );
  }

  const multi = question.type === "multi";
  const shapesOnly = !view.showAnswersOnDevice;
  const columns = answerColumns(question.answers.length, width, shapesOnly);
  const dense = question.answers.length >= 5 && columns === 1;
  return (
    <section className="flex flex-1 flex-col gap-3 pt-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-muted">
          {question.index + 1} / {question.total}
          {multi && " · select all that apply"}
        </span>
        <TimerRing timer={view.timer} paused={view.paused} className="w-14" />
      </div>
      {!shapesOnly && (
        // Long prompts step down a size so the tiles stay within a thumb's reach.
        <h1 className={`font-bold leading-snug [overflow-wrap:anywhere] ${question.prompt.length > 160 ? "text-base" : question.prompt.length > 90 ? "text-lg" : "text-xl"}`}>
          <MathText text={question.prompt} />
        </h1>
      )}
      {!shapesOnly && question.media && <QuestionMedia media={question.media} code={code} />}
      <div className={`mt-auto grid gap-3 ${columns === 2 ? "grid-cols-2" : ""}`} role="group" aria-label="Answers">
        {question.answers.map((answer, i) => (
          <AnswerTile
            key={i}
            index={i}
            text={answer.text}
            multi={multi}
            size={dense ? "device-dense" : "device"}
            selected={choice.includes(i)}
            disabled={view.paused}
            onPress={() => onPick(i)}
          />
        ))}
      </div>
    </section>
  );
}

const OUTCOME = {
  correct: { title: "Correct!", color: "var(--bb-good)", mark: "✓" },
  partial: { title: "Partly right", color: "var(--bb-tile-5)", mark: "½" },
  wrong: { title: "Not this time", color: "var(--bb-bad)", mark: "✕" },
  no_answer: { title: "Time's up", color: "var(--bb-text-muted)", mark: "✕" },
  skipped: { title: "Skipped", color: "var(--bb-text-muted)", mark: "–" },
} as const;

function ResultScreen({ view }: { view: PlayerView }) {
  const result = view.result;
  if (!result) return <Message title="Watch the screen" detail="You joined after this question opened." />;
  const outcome = OUTCOME[result.outcome];
  const parts = [`Speed ${formatPoints(result.points.speed)}`];
  if (result.points.first) parts.push(`First ${result.points.first}`);
  if (result.points.streak) parts.push(`Streak +${result.points.streak}`);

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
      <motion.div
        className="flex h-28 w-28 items-center justify-center rounded-full text-6xl font-extrabold text-[#0a0a0a]"
        style={{ background: outcome.color, boxShadow: `0 0 40px ${outcome.color}` }}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        aria-hidden="true"
      >
        {outcome.mark}
      </motion.div>
      <h1 className="text-4xl font-extrabold">{outcome.title}</h1>
      {result.points.total > 0 ? (
        <>
          <p className="text-5xl font-extrabold text-primary">+{formatPoints(result.points.total)}</p>
          <p className="text-lg text-muted">{parts.join(" · ")}</p>
        </>
      ) : (
        result.outcome === "correct" && <p className="text-lg text-muted">Practice question: no points</p>
      )}
      {result.streak >= 2 && <p className="font-bold text-amber">🔥 {result.streak} in a row</p>}
      <div className="bb-card mt-2 w-full p-5">
        <p className="text-2xl font-bold">You're in {ordinal(result.rank)}</p>
        <p className="text-muted">{formatPoints(result.score)} points</p>
        {result.behind && (
          <p className="mt-2 text-muted">
            {formatPoints(result.behind.points)} behind {result.behind.nickname}
          </p>
        )}
      </div>
    </section>
  );
}

function FinalScreen({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const reduced = useReducedMotion();
  // While the projector builds the podium, the phone points at it instead of spoiling it.
  const [revealed, setRevealed] = useState(view.phase === "ended" || Boolean(reduced));
  useEffect(() => {
    if (revealed) return;
    const timer = setTimeout(() => setRevealed(true), PODIUM_BUILD_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  const leave = (
    <button type="button" className="bb-btn bb-btn-ghost mt-4" onClick={onLeave}>
      Join another game
    </button>
  );
  if (!revealed) {
    return (
      <Message title="Look up at the podium!" detail="The winners are about to appear.">
        {leave}
      </Message>
    );
  }
  const top3 = view.rank !== null && view.rank <= 3;
  return (
    <Message title={view.rank ? `You finished ${ordinal(view.rank)}` : "Game over"} detail={`${formatPoints(view.score)} points`}>
      {top3 && (
        <p className="text-5xl" aria-hidden="true">
          {["🥇", "🥈", "🥉"][view.rank! - 1]}
        </p>
      )}
      <p className="text-muted">of {countOf(view.playerCount, "player")}.</p>
      {leave}
    </Message>
  );
}

function Message({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
      <h1 className="text-3xl font-extrabold [overflow-wrap:anywhere] sm:text-4xl">{title}</h1>
      {detail && <p className="text-xl text-muted">{detail}</p>}
      {children}
    </section>
  );
}
