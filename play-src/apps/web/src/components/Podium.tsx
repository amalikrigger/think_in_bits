import confetti from "canvas-confetti";
import type { LeaderboardEntry } from "@bitblitz/schema";
import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { formatPoints } from "../lib/format";

// Builds 3rd → 2nd → 1st, then confetti. Confetti is skipped under reduced motion.

const PLACES = [
  { place: 2, height: "h-40 lg:h-56", color: "var(--tib-accent-animation)", delay: 1.2 },
  { place: 1, height: "h-56 lg:h-72", color: "var(--tib-primary-color)", delay: 2.2 },
  { place: 3, height: "h-28 lg:h-40", color: "var(--tib-accent-game)", delay: 0.3 },
];

export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || entries.length === 0) return;
    const timer = setTimeout(() => {
      void confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#00e5ff", "#ff6b6b", "#4ecdc4", "#a78bfa", "#ffd166"],
        disableForReducedMotion: true,
      });
    }, 2900);
    return () => clearTimeout(timer);
  }, [entries, reduced]);

  return (
    <ol className="mx-auto flex w-full max-w-4xl items-end justify-center gap-3 sm:gap-6" aria-label="Podium">
      {PLACES.map(({ place, height, color, delay }) => {
        const entry = entries[place - 1];
        if (!entry) return <li key={place} className="flex-1" aria-hidden="true" />;
        return (
          <motion.li
            key={place}
            className="flex flex-1 flex-col items-center gap-3"
            initial={reduced ? false : { opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : delay, type: "spring", stiffness: 140, damping: 16 }}
            aria-label={`${place === 1 ? "First" : place === 2 ? "Second" : "Third"}: ${entry.nickname}, ${entry.score} points`}
          >
            <span className="max-w-full truncate text-center text-xl font-extrabold sm:text-3xl">{entry.nickname}</span>
            <span className="text-lg font-bold tabular-nums text-muted sm:text-2xl">{formatPoints(entry.score)}</span>
            <div
              className={`flex w-full items-start justify-center rounded-t-3xl pt-4 ${height}`}
              style={{ background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 35%, #0a0a0a))`, boxShadow: `0 0 40px ${color}55` }}
            >
              <span className="text-5xl font-extrabold text-[#0a0a0a] lg:text-7xl" aria-hidden="true">
                {place}
              </span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
