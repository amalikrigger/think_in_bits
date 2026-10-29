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
  const [downloading, setDownloading] = useState(false);
  const review = [...(view.review ?? [])].filter((r) => !r.skipped).sort((a, b) => a.correctRate - b.correctRate);
  const nobody = !view.podium || view.podium.length === 0;

  async function download() {
    if (downloading) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadResults(game.code, game.hostKey);
    } catch {
      setDownloadError("Couldn't download the results.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-5 pt-2 lg:gap-8">
      <h1 className="text-center text-3xl font-extrabold lg:text-5xl">{view.phase === "ended" ? "Final results" : "And the winners are…"}</h1>
      {nobody ? <p className="text-center text-xl text-muted">No scores to show.</p> : <Podium entries={view.podium!} build={view.phase === "podium"} />}
      {view.teams && view.teams.length > 0 && (
        <div className="mx-auto">
          <TeamBoard teams={view.teams} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setShowReview((s) => !s)} aria-expanded={showReview}>
          {showReview ? "Hide answer review" : "Answer review"}
        </button>
        <button type="button" className="bb-btn bb-btn-ghost" onClick={download} disabled={downloading} aria-busy={downloading}>
          {downloading ? "Preparing…" : "Download results (CSV)"}
        </button>
      </div>
      {downloadError && (
        <p role="alert" className="text-center text-coral">
          {downloadError}
        </p>
      )}

      {showReview && (
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2 lg:gap-6">
          <section className="bb-card p-5 lg:p-6" aria-label="Answer review, most missed first">
            <h2 className="mb-4 text-xl font-bold">Most missed first</h2>
            {review.length === 0 && <p className="text-muted">No questions were played.</p>}
            <ol className="flex flex-col gap-3">
              {review.map((item) => (
                <li key={item.index}>
                  <div className="mb-1 flex justify-between gap-4 text-sm text-muted">
                    <span>Q{item.index + 1}</span>
                    <span>
                      {Math.round(item.correctRate * 100)}% correct · {Math.round(item.answeredRate * 100)}% answered
                    </span>
                  </div>
                  <p className="mb-2 font-semibold [overflow-wrap:anywhere]">
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
          <section className="bb-card p-5 lg:p-6" aria-label="Full standings">
            <h2 className="mb-4 text-xl font-bold">Standings</h2>
            <ol className="flex flex-col gap-1">
              {(view.leaderboard ?? []).map((entry) => (
                <li key={entry.playerId} className="flex justify-between gap-4 border-b border-white/5 py-1">
                  <span className="flex min-w-0 items-baseline">
                    <span className="mr-3 inline-block w-8 shrink-0 text-muted tabular-nums">{entry.rank}</span>
                    <span className="truncate">{entry.nickname}</span>
                    {entry.team && <span className="ml-2 shrink-0 text-sm text-muted">{entry.team}</span>}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatPoints(entry.score)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </section>
  );
}
