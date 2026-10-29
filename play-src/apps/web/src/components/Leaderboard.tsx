import type { LeaderboardEntry, TeamEntry } from "@bitblitz/schema";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatPoints } from "../lib/format";
import { tile } from "../lib/tiles";

// The board first shows the previous order, then reorders with a spring so the class
// sees who climbed. Under reduced motion it simply appears in the new order.

export function Leaderboard({ entries, teams }: { entries: LeaderboardEntry[]; teams: TeamEntry[] | null }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(timer);
  }, [entries]);

  const ordered = settled
    ? entries
    : [...entries].sort((a, b) => (a.previousRank ?? 999) - (b.previousRank ?? 999) || a.rank - b.rank);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_auto]">
      <LayoutGroup>
        <ol className="flex flex-col gap-2" aria-label="Leaderboard">
          {ordered.map((entry) => {
            const climbed = entry.previousRank !== null && entry.previousRank > entry.rank;
            return (
              <motion.li
                layout
                key={entry.playerId}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className={`bb-card flex items-center gap-4 px-5 py-3 ${entry.rank === 1 ? "bb-glow border-primary/40" : ""}`}
              >
                <span className="w-10 text-2xl font-extrabold tabular-nums text-muted lg:text-3xl">{entry.rank}</span>
                <span className="min-w-0 flex-1 truncate text-2xl font-bold lg:text-3xl">{entry.nickname}</span>
                {climbed && settled && (
                  <span className="text-lg font-bold text-teal" aria-label={`up ${entry.previousRank! - entry.rank}`}>
                    ▲{entry.previousRank! - entry.rank}
                  </span>
                )}
                <span className="text-2xl font-extrabold tabular-nums text-primary lg:text-3xl">{formatPoints(entry.score)}</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
      {teams && teams.length > 0 && <TeamBoard teams={teams} />}
    </div>
  );
}

export function TeamBoard({ teams }: { teams: TeamEntry[] }) {
  return (
    <section aria-label="Teams" className="bb-card min-w-64 p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Teams</h3>
      <ol className="flex flex-col gap-2">
        {teams.map((team, i) => (
          <li key={team.team} className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ background: tile(i).color }} aria-hidden="true" />
            <span className="flex-1 text-xl font-bold">{team.team}</span>
            <span className="text-xl font-extrabold tabular-nums">{formatPoints(team.score)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
