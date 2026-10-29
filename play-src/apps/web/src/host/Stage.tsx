import type { HostView } from "@bitblitz/schema";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { AnswerTile } from "../components/AnswerTile";
import { MathText } from "../components/MathText";
import { QuestionMedia } from "../components/QuestionMedia";
import { TimerRing } from "../components/TimerRing";
import { secondsLeft } from "../lib/countdown";
import { promptScale } from "../lib/stage";
import { useCountdown } from "../lib/useGameSocket";

// Countdown, open question and reveal on the projector. Answers appear only once the
// question opens, so the countdown is reading time for the prompt.
//
// Layout: prompt and timer at the top, tiles anchored at the bottom, and any image
// flexing to the space between. Type and tile sizes scale with the viewport (app.css),
// so a 1280×720 projector shows prompt, image, timer and six tiles with no scrolling.

const TYPE_HINT = { single: "Pick one", multi: "Select all that apply", true_false: "True or false?" } as const;

export function Stage({ view, code, answered }: { view: HostView; code: string; answered: { count: number; total: number } | null }) {
  const question = view.question;
  if (!question) return null;
  const { phase, reveal } = view;
  const showAnswers = phase !== "countdown";
  const compact = question.media !== null || question.answers.length > 4;
  // On the reveal the class has read the prompt; with an explanation on screen it steps
  // down a notch so prompt, six tiles and the "Why" still fit a 1280×720 projector.
  const scale = promptScale(question.prompt.length) * (phase === "reveal" && reveal?.explanation ? 0.85 : 1);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 pt-2 lg:gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-base font-semibold text-muted lg:text-lg">
        <span className="flex flex-wrap items-center gap-2">
          Question {question.index + 1} of {question.total}
          {question.points === "double" && <span className="rounded-full bg-violet/20 px-3 py-0.5 text-violet">Double points</span>}
          {question.points === "none" && <span className="rounded-full bg-white/10 px-3 py-0.5">Practice: no points</span>}
        </span>
        <span>{TYPE_HINT[question.type]}</span>
      </div>

      <div className="flex shrink-0 items-start gap-4 lg:gap-6">
        <h1 className="bb-stage-prompt min-w-0 flex-1 font-extrabold" style={{ "--bb-prompt-scale": scale } as CSSProperties}>
          <MathText text={question.prompt} />
        </h1>
        {phase === "question" && <TimerRing timer={view.timer} paused={view.paused} className="w-16 sm:w-20 lg:w-28 2xl:w-32" />}
      </div>

      {question.media && <QuestionMedia media={question.media} code={code} large />}

      {phase === "countdown" && <CountdownNumber view={view} />}

      {showAnswers && (
        <div role="list" className="mt-auto grid shrink-0 gap-2 sm:grid-cols-2 lg:gap-3">
          {question.answers.map((answer, i) => (
            <AnswerTile
              key={i}
              index={i}
              text={answer.text}
              size={compact ? "projector-compact" : "projector"}
              correct={reveal ? reveal.correct.includes(i) : undefined}
              count={reveal ? reveal.counts[i] : undefined}
            />
          ))}
        </div>
      )}

      {phase === "question" && answered && (
        <p className="shrink-0 text-center text-lg font-bold lg:text-2xl" aria-live="polite">
          <span className="text-primary">{answered.count}</span> / {answered.total} answered
          {view.paused && <span className="ml-4 text-coral">Paused</span>}
        </p>
      )}

      {phase === "reveal" && reveal?.explanation && (
        // Opacity only: a translate on the last in-flow element adds scrollable overflow
        // and makes a projector flash a scrollbar.
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bb-card shrink-0 border-primary/30 px-3 py-2.5 text-base [overflow-wrap:anywhere] xl:text-lg 2xl:p-4 2xl:text-2xl"
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
  const seconds = countdown ? Math.max(1, secondsLeft(countdown.msRemaining)) : 3;
  return (
    <div className="flex flex-1 items-center justify-center py-2" aria-live="assertive">
      <motion.span
        key={seconds}
        initial={reduced ? false : { scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="bb-glow flex h-28 w-28 items-center justify-center rounded-full bg-primary text-6xl font-extrabold text-[#0a0a0a] lg:h-40 lg:w-40 lg:text-8xl"
      >
        {seconds}
      </motion.span>
    </div>
  );
}
