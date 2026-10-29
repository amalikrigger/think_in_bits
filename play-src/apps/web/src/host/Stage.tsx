import type { HostView } from "@bitblitz/schema";
import { motion, useReducedMotion } from "motion/react";
import { AnswerTile } from "../components/AnswerTile";
import { MathText } from "../components/MathText";
import { QuestionMedia } from "../components/QuestionMedia";
import { TimerRing } from "../components/TimerRing";
import { useCountdown } from "../lib/useGameSocket";

// Countdown, open question and reveal on the projector. Answers appear only once the
// question opens, so the countdown is reading time for the prompt.

const TYPE_HINT = { single: "Pick one", multi: "Select all that apply", true_false: "True or false?" } as const;

export function Stage({ view, code, answered }: { view: HostView; code: string; answered: { count: number; total: number } | null }) {
  const question = view.question;
  if (!question) return null;
  const { phase, reveal } = view;
  const showAnswers = phase !== "countdown";

  return (
    <section className="flex flex-1 flex-col gap-5 pt-2">
      <div className="flex items-center justify-between gap-4 text-lg font-semibold text-muted">
        <span>
          Question {question.index + 1} of {question.total}
          {question.points === "double" && <span className="ml-3 rounded-full bg-violet/20 px-3 py-0.5 text-violet">Double points</span>}
          {question.points === "none" && <span className="ml-3 rounded-full bg-white/10 px-3 py-0.5">Practice: no points</span>}
        </span>
        <span>{TYPE_HINT[question.type]}</span>
      </div>

      <div className="flex items-start gap-6">
        <h1 className="flex-1 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
          <MathText text={question.prompt} />
        </h1>
        {phase === "question" && <TimerRing timer={view.timer} paused={view.paused} size={130} />}
      </div>

      {question.media && <QuestionMedia media={question.media} code={code} large />}

      {phase === "countdown" && <CountdownNumber view={view} />}

      {showAnswers && (
        <div role="list" className={`grid flex-1 content-start gap-4 ${question.answers.length > 2 ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
          {question.answers.map((answer, i) => (
            <AnswerTile
              key={i}
              index={i}
              text={answer.text}
              size="projector"
              correct={reveal ? reveal.correct.includes(i) : undefined}
              count={reveal ? reveal.counts[i] : undefined}
            />
          ))}
        </div>
      )}

      {phase === "question" && answered && (
        <p className="text-center text-2xl font-bold" aria-live="polite">
          <span className="text-primary">{answered.count}</span> / {answered.total} answered
          {view.paused && <span className="ml-4 text-coral">Paused</span>}
        </p>
      )}

      {phase === "reveal" && reveal?.explanation && (
        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bb-card border-primary/30 p-5 text-xl lg:text-2xl"
        >
          <span className="mr-2 font-bold text-primary">Why:</span>
          <MathText text={reveal.explanation} />
        </motion.aside>
      )}
    </section>
  );
}

function CountdownNumber({ view }: { view: HostView }) {
  const countdown = useCountdown(view.timer, view.paused);
  const reduced = useReducedMotion();
  const seconds = countdown ? Math.max(1, Math.ceil(countdown.msRemaining / 1000)) : 3;
  return (
    <div className="flex flex-1 items-center justify-center" aria-live="assertive">
      <motion.span
        key={seconds}
        initial={reduced ? false : { scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex h-40 w-40 items-center justify-center rounded-full bg-primary text-8xl font-extrabold text-[#0a0a0a] bb-glow"
      >
        {seconds}
      </motion.span>
    </div>
  );
}
