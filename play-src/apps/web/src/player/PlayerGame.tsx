import { REJECTION_TEXT, type JoinRejection, type PlayerView, type ServerMessage } from "@bitblitz/schema";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { AnswerTile } from "../components/AnswerTile";
import { BrandBar, ConnectionBadge } from "../components/BrandBar";
import { MathText } from "../components/MathText";
import { QuestionMedia } from "../components/QuestionMedia";
import { TimerRing } from "../components/TimerRing";
import { formatPoints, ordinal } from "../lib/format";
import { playerSeat } from "../lib/storage";
import { useGameSocket } from "../lib/useGameSocket";

// One-thumb phone screen. Tiles fill the lower part of the screen; single and
// true/false submit on tap, multi-select toggles and then submits.

export function PlayerGame({
  code,
  nickname,
  onRejected,
}: {
  code: string;
  nickname: string;
  onRejected: (reason: JoinRejection) => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  const onMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === "welcome") playerSeat.set(code, { token: message.token, nickname: message.nickname });
      if (message.type === "join_rejected") {
        playerSeat.set(code, null);
        onRejected(message.reason);
      }
      if (message.type === "kicked") playerSeat.set(code, null);
      if (message.type === "answer_ack" && !message.accepted) setNotice(REJECTION_TEXT[message.reason]);
    },
    [code, onRejected],
  );

  const { status, view, send, stop, stopReason } = useGameSocket<PlayerView>({
    code,
    role: "player",
    hello: () => {
      const seat = playerSeat.get(code);
      return seat ? { type: "resume", token: seat.token } : { type: "join", nickname };
    },
    onMessage,
  });

  useEffect(() => {
    if (view?.phase === "ended") stop("The game has ended. Thanks for playing!");
  }, [view?.phase, stop]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar
        compact
        right={
          <>
            <ConnectionBadge status={status} />
            {view && (
              <span className="max-w-32 truncate rounded-full bg-white/10 px-3 py-1 text-sm font-bold" aria-label={`You are ${view.nickname}`}>
                {view.nickname}
              </span>
            )}
          </>
        }
      />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-6">
        {status === "stopped" && !(view && (view.phase === "podium" || view.phase === "ended")) ? (
          <Message title={stopReason ?? "Disconnected"} />
        ) : !view ? (
          <Message title="Joining…" />
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
              <PhaseView view={view} code={code} send={(choice) => view.question && send({ type: "answer", questionIndex: view.question.index, choice })} />
            </motion.div>
          </AnimatePresence>
        )}
        {view?.paused && view.phase !== "lobby" && (
          <div role="status" className="fixed inset-x-4 top-16 z-20 rounded-2xl bg-surface-raised p-4 text-center text-lg font-bold shadow-xl">
            ❚❚ Paused by the teacher
          </div>
        )}
        <AnimatePresence>
          {notice && (
            <motion.p
              role="alert"
              className="fixed inset-x-4 bottom-6 z-20 rounded-2xl bg-coral p-4 text-center font-bold text-[#0a0a0a]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PhaseView({ view, code, send }: { view: PlayerView; code: string; send: (choice: number[]) => void }) {
  switch (view.phase) {
    case "lobby":
      return (
        <Message title="You're in!" detail={`Look for ${view.nickname} on the big screen.`}>
          <p className="text-muted">
            {view.playerCount} player{view.playerCount === 1 ? "" : "s"} waiting
          </p>
          {view.team && <p className="mt-2 font-bold text-primary">Team {view.team}</p>}
        </Message>
      );
    case "countdown":
      return (
        <Message title="Get ready!" detail={view.question ? `Question ${view.question.index + 1} of ${view.question.total}` : undefined}>
          {view.question && view.showAnswersOnDevice && (
            <p className="text-xl font-semibold">
              <MathText text={view.question.prompt} />
            </p>
          )}
        </Message>
      );
    case "question":
      return <AnswerScreen view={view} code={code} send={send} />;
    case "reveal":
    case "leaderboard":
      return <ResultScreen view={view} />;
    case "podium":
    case "ended":
      return <FinalScreen view={view} />;
  }
}

function AnswerScreen({ view, code, send }: { view: PlayerView; code: string; send: (choice: number[]) => void }) {
  const question = view.question!;
  const [picked, setPicked] = useState<number[]>([]);
  const locked = view.answer !== null;

  if (locked) {
    return (
      <Message title="Locked in!" detail="Waiting for everyone else…">
        <div className="flex justify-center gap-2" aria-label="Your answer">
          {view.answer!.map((i) => (
            <span key={i} className="h-4 w-16 rounded-full" style={{ background: `var(--bb-tile-${(i % 6) + 1})` }} />
          ))}
        </div>
      </Message>
    );
  }

  const multi = question.type === "multi";
  return (
    <section className="flex flex-1 flex-col gap-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-muted">
          {question.index + 1} / {question.total}
          {multi && " · select all that apply"}
        </span>
        <TimerRing timer={view.timer} paused={view.paused} size={64} />
      </div>
      {view.showAnswersOnDevice && (
        <h1 className="text-xl font-bold leading-snug">
          <MathText text={question.prompt} />
        </h1>
      )}
      {view.showAnswersOnDevice && question.media && <QuestionMedia media={question.media} code={code} />}
      <div className={`mt-auto grid gap-3 ${!view.showAnswersOnDevice ? "grid-cols-2" : ""}`}>
        {question.answers.map((answer, i) => (
          <AnswerTile
            key={i}
            index={i}
            text={answer.text}
            multi={multi}
            selected={picked.includes(i)}
            disabled={view.paused}
            onPress={() => (multi ? setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i])) : send([i]))}
          />
        ))}
      </div>
      {multi && (
        <button
          type="button"
          className="bb-btn bb-btn-primary sticky bottom-3 min-h-14 text-lg"
          disabled={picked.length === 0 || view.paused}
          onClick={() => send(picked)}
        >
          Submit {picked.length > 0 ? `(${picked.length})` : ""}
        </button>
      )}
    </section>
  );
}

const OUTCOME = {
  correct: { title: "Correct!", color: "var(--bb-good)" },
  partial: { title: "Partly right", color: "var(--bb-tile-5)" },
  wrong: { title: "Not this time", color: "var(--bb-bad)" },
  no_answer: { title: "Time's up", color: "var(--bb-text-muted)" },
  skipped: { title: "Skipped", color: "var(--bb-text-muted)" },
} as const;

function ResultScreen({ view }: { view: PlayerView }) {
  const result = view.result;
  if (!result) return <Message title="Watch the screen" detail="You joined after this question opened." />;
  const outcome = OUTCOME[result.outcome];
  const parts = [`Speed ${formatPoints(result.points.speed)}`];
  if (result.points.first) parts.push(`First ${result.points.first}`);
  if (result.points.streak) parts.push(`Streak +${result.points.streak}`);

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center" aria-live="polite">
      <motion.div
        className="flex h-28 w-28 items-center justify-center rounded-full text-6xl font-extrabold text-[#0a0a0a]"
        style={{ background: outcome.color, boxShadow: `0 0 40px ${outcome.color}` }}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        aria-hidden="true"
      >
        {result.outcome === "correct" ? "✓" : result.outcome === "partial" ? "½" : "✕"}
      </motion.div>
      <h1 className="text-4xl font-extrabold">{outcome.title}</h1>
      {result.points.total > 0 && (
        <>
          <p className="text-5xl font-extrabold text-primary">+{formatPoints(result.points.total)}</p>
          <p className="text-lg text-muted">{parts.join(" · ")}</p>
        </>
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

function FinalScreen({ view }: { view: PlayerView }) {
  const top3 = view.rank !== null && view.rank <= 3;
  return (
    <Message title={view.rank ? `You finished ${ordinal(view.rank)}` : "Game over"} detail={`${formatPoints(view.score)} points`}>
      {top3 && <p className="text-5xl" aria-hidden="true">{["🥇", "🥈", "🥉"][view.rank! - 1]}</p>}
      <p className="text-muted">of {view.playerCount} players. Look up at the podium!</p>
    </Message>
  );
}

function Message({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center" aria-live="polite">
      <h1 className="text-4xl font-extrabold">{title}</h1>
      {detail && <p className="text-xl text-muted">{detail}</p>}
      {children}
    </section>
  );
}
