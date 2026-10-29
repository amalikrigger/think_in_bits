import { isUrgent, secondsLeft, type TimerSnapshot } from "../lib/countdown";
import { useCountdown } from "../lib/useGameSocket";

// The question clock as a ring. It is sized by CSS (a width class) so the same component
// serves a phone and a projector, with the number scaling via container units. Colour
// shifts to coral in the last 5 seconds: a steady colour change, never a flash
// (accessibility rule: no flashing).

const RADIUS = 43;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TimerRing({ timer, paused, className = "w-16" }: { timer: TimerSnapshot | null; paused: boolean; className?: string }) {
  const countdown = useCountdown(timer, paused);
  if (!countdown) return null;
  const seconds = secondsLeft(countdown.msRemaining);
  const color = isUrgent(countdown.msRemaining) ? "var(--bb-tile-2)" : "var(--bb-tile-1)";

  return (
    <div
      className={`bb-ring relative aspect-square shrink-0 ${className}`}
      role="timer"
      aria-label={paused ? `Paused with ${seconds} seconds left` : `${seconds} seconds left`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--tib-surface-light)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - countdown.fraction)}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke 0.3s" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-extrabold tabular-nums" style={{ color }} aria-hidden="true">
        {paused ? "❚❚" : seconds}
      </span>
    </div>
  );
}
