import { useCountdown } from "../lib/useGameSocket";

// The question clock as a ring. Colour shifts to coral in the last 5 seconds; there is
// no flashing, only a steady colour change (accessibility rule: no flashing).

export function TimerRing({
  timer,
  paused,
  size = 120,
}: {
  timer: { msRemaining: number; totalMs: number } | null;
  paused: boolean;
  size?: number;
}) {
  const countdown = useCountdown(timer, paused);
  if (!countdown) return null;
  const seconds = Math.ceil(countdown.msRemaining / 1000);
  const stroke = Math.max(6, size / 14);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const urgent = seconds <= 5;
  const color = urgent ? "var(--bb-tile-2)" : "var(--bb-tile-1)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={paused ? `Paused with ${seconds} seconds left` : `${seconds} seconds left`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tib-surface-light)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - countdown.fraction)}
          style={{ filter: `drop-shadow(0 0 ${size / 12}px ${color})`, transition: "stroke 0.3s" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-extrabold tabular-nums"
        style={{ fontSize: size * 0.36, color }}
        aria-hidden="true"
      >
        {paused ? "❚❚" : seconds}
      </span>
    </div>
  );
}
