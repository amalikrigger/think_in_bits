import type { LeaderboardEntry, TeamEntry } from "@bitblitz/schema";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { formatPoints } from "../lib/format";
import { boardSignature, hiddenPlayerCount, leaderboardRows } from "../lib/stage";
import { teamColor } from "../lib/tiles";
import { useViewport } from "../lib/useViewport";

// The board first shows the previous order, then reorders with a spring so the class
// sees who climbed. Under reduced motion it appears straight away in the new order.
// Only as many rows as fit the screen are shown: with sixty players the class needs the
// top of the table, not a scroll.

export function Leaderboard({
  entries,
  teams,
  classSize = entries.length,
}: {
  entries: LeaderboardEntry[];
  teams: TeamEntry[] | null;
  /** Everyone in the game; `entries` may be only the top of the table. */
  classSize?: number;
}) {
  const reduced = useReducedMotion();
  const { height } = useViewport();
  const limit = leaderboardRows(height);
  const [settled, setSettled] = useState(Boolean(reduced));
  const signature = boardSignature(entries);

  useEffect(() => {
    if (reduced) {
      setSettled(true);
      return;
    }
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(timer);
  }, [signature, reduced]);

  const ordered = (settled ? entries : [...entries].sort((a, b) => (a.previousRank ?? 999) - (b.previousRank ?? 999) || a.rank - b.rank)).slice(0, limit);
  const hidden = hiddenPlayerCount(classSize, ordered.length);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1fr_auto] lg:gap-6">
      <LayoutGroup>
        <ol className="flex flex-col gap-2" aria-label="Leaderboard">
          {ordered.map((entry) => {
            const climbed = entry.previousRank !== null && entry.previousRank > entry.rank;
            return (
              <motion.li
                layout
                key={entry.playerId}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className={`bb-card bb-lb-row flex items-center gap-3 lg:gap-4 ${entry.rank === 1 ? "bb-glow border-primary/40" : ""}`}
              >
                <span className="w-9 shrink-0 font-extrabold tabular-nums text-muted">{entry.rank}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{entry.nickname}</span>
                {climbed && settled && (
                  <span className="shrink-0 text-[0.7em] font-bold text-teal" aria-label={`up ${entry.previousRank! - entry.rank}`}>
                    ▲{entry.previousRank! - entry.rank}
                  </span>
                )}
                <span className="shrink-0 font-extrabold tabular-nums text-primary">{formatPoints(entry.score)}</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
      {hidden > 0 && (
        <p className="text-center text-muted lg:col-start-1">
          and {hidden} more player{hidden === 1 ? "" : "s"}
        </p>
      )}
      {teams && teams.length > 0 && (
        <div className="lg:col-start-2 lg:row-start-1">
          <TeamBoard teams={teams} />
        </div>
      )}
    </div>
  );
}

export function TeamBoard({ teams }: { teams: TeamEntry[] }) {
  return (
    <section aria-label="Teams" className="bb-card min-w-64 p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">Teams</h3>
      <ol className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.team} className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: teamColor(team.team) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-xl font-bold">{team.team}</span>
            <span className="text-xl font-extrabold tabular-nums">{formatPoints(team.score)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
