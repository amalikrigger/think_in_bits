import type { HostView } from "@bitblitz/schema";
import { useState } from "react";
import { MathText } from "../components/MathText";
import { Podium } from "../components/Podium";
import { TeamBoard } from "../components/Leaderboard";
import { downloadResults } from "../lib/api";
import { formatPoints } from "../lib/format";
import type { HostGame } from "../lib/storage";

// Podium for the class, then the teacher's review: which questions were missed most,
// the full standings, and a CSV with nicknames only.

export function Results({ view, game }: { view: HostView; game: HostGame }) {
  const [showReview, setShowReview] = useState(view.phase === "ended");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const review = [...(view.review ?? [])].filter((r) => !r.skipped).sort((a, b) => a.correctRate - b.correctRate);

  async function download() {
    setDownloadError(null);
    try {
      await downloadResults(game.code, game.hostKey);
    } catch {
      setDownloadError("Couldn't download the results.");
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-8 pt-2">
      <h1 className="text-center text-4xl font-extrabold lg:text-5xl">{view.phase === "ended" ? "Final results" : "And the winners are…"}</h1>
      {view.podium && <Podium entries={view.podium} />}
      {view.teams && <div className="mx-auto"><TeamBoard teams={view.teams} /></div>}

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setShowReview((s) => !s)} aria-expanded={showReview}>
          {showReview ? "Hide answer review" : "Answer review"}
        </button>
        <button type="button" className="bb-btn bb-btn-ghost" onClick={download}>
          Download results (CSV)
        </button>
      </div>
      {downloadError && <p role="alert" className="text-center text-coral">{downloadError}</p>}

      {showReview && (
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
          <section className="bb-card p-6" aria-label="Answer review, most missed first">
            <h2 className="mb-4 text-xl font-bold">Most missed first</h2>
            <ol className="flex flex-col gap-3">
              {review.map((item) => (
                <li key={item.index}>
                  <div className="mb-1 flex justify-between gap-4 text-sm text-muted">
                    <span>Q{item.index + 1}</span>
                    <span>
                      {Math.round(item.correctRate * 100)}% correct · {Math.round(item.answeredRate * 100)}% answered
                    </span>
                  </div>
                  <p className="mb-2 font-semibold">
                    <MathText text={item.prompt} />
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.correctRate * 100}%`, background: item.correctRate < 0.5 ? "var(--bb-bad)" : "var(--bb-good)" }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="bb-card p-6" aria-label="Full standings">
            <h2 className="mb-4 text-xl font-bold">Standings</h2>
            <ol className="flex flex-col gap-1">
              {(view.leaderboard ?? []).map((entry) => (
                <li key={entry.playerId} className="flex justify-between gap-4 border-b border-white/5 py-1">
                  <span>
                    <span className="mr-3 inline-block w-8 text-muted tabular-nums">{entry.rank}</span>
                    {entry.nickname}
                    {entry.team && <span className="ml-2 text-sm text-muted">{entry.team}</span>}
                  </span>
                  <span className="font-bold tabular-nums">{formatPoints(entry.score)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </section>
  );
}
