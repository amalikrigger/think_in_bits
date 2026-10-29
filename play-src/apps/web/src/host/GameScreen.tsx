import { REJECTION_TEXT, type HostCommand, type HostView, type ServerMessage } from "@bitblitz/schema";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { BrandBar, ConnectionBadge } from "../components/BrandBar";
import { Leaderboard } from "../components/Leaderboard";
import { spacedCode } from "../lib/format";
import { useSound } from "../lib/sound";
import type { HostGame } from "../lib/storage";
import { useGameSocket } from "../lib/useGameSocket";
import { Lobby } from "./Lobby";
import { Results } from "./Results";
import { Stage } from "./Stage";

// The projector screen. Everything shown comes from the server's HostView; this
// component only renders it and turns button presses into host commands.

export function GameScreen({ game, onLeave }: { game: HostGame; onLeave: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [answered, setAnswered] = useState<{ count: number; total: number } | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);

  const onMessage = useCallback((message: ServerMessage) => {
    if (message.type === "command_rejected") setNotice(REJECTION_TEXT[message.reason]);
    if (message.type === "media") setUploaded(message.names);
    if (message.type === "answer_progress") setAnswered({ count: message.count, total: message.total });
    if (message.type === "view" && message.view.role === "host") setAnswered(message.view.answered);
  }, []);

  const { status, view, send, stopReason } = useGameSocket<HostView>({
    code: game.code,
    role: "host",
    hello: () => ({ type: "host_auth", key: game.hostKey }),
    onMessage,
  });

  const command = useCallback((c: HostCommand) => send({ type: "command", command: c }), [send]);
  useSound(game.code, view?.phase ?? null, view?.music ?? null, uploaded, view?.settings.sound ?? false, view?.settings.music ?? false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (status === "stopped") {
    return (
      <Centered>
        <p className="mb-6 text-2xl font-bold">{stopReason}</p>
        <button type="button" className="bb-btn bb-btn-primary" onClick={onLeave}>
          Start a new game
        </button>
      </Centered>
    );
  }
  if (!view) return <Centered>Connecting to game {spacedCode(game.code)}…</Centered>;

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar
        compact
        right={
          <>
            <ConnectionBadge status={status} />
            {view.phase !== "lobby" && (
              <span className="hidden rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-bold sm:inline" aria-label={`Game code ${game.code}`}>
                {spacedCode(game.code)}
              </span>
            )}
          </>
        }
      />

      <main className="flex flex-1 flex-col px-4 pb-28 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view.phase}-${view.question?.index ?? ""}`}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {view.phase === "lobby" && <Lobby view={view} code={game.code} command={command} />}
            {(view.phase === "countdown" || view.phase === "question" || view.phase === "reveal") && (
              <Stage view={view} code={game.code} answered={answered} />
            )}
            {view.phase === "leaderboard" && view.leaderboard && (
              <section className="flex flex-1 flex-col gap-6 pt-4">
                <h1 className="text-center text-4xl font-extrabold lg:text-5xl">Leaderboard</h1>
                <Leaderboard entries={view.leaderboard} teams={view.teams} />
              </section>
            )}
            {(view.phase === "podium" || view.phase === "ended") && <Results view={view} game={game} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ControlBar view={view} command={command} onLeave={onLeave} />

      <AnimatePresence>
        {notice && (
          <motion.p
            role="status"
            className="fixed left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-surface-raised px-5 py-2 font-semibold shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlBar({ view, command, onLeave }: { view: HostView; command: (c: HostCommand) => void; onLeave: () => void }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { phase, paused, settings } = view;
  const running = phase === "countdown" || phase === "question" || phase === "reveal" || phase === "leaderboard";
  const nextLabel =
    phase === "question" ? "Reveal now" : phase === "reveal" ? (view.hasMoreQuestions ? "Next" : "Podium") : phase === "leaderboard" ? "Next question" : phase === "podium" ? "Finish" : null;

  return (
    <nav aria-label="Teacher controls" className="fixed inset-x-0 bottom-0 z-10 border-t border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {running && (
            <button type="button" className="bb-btn bb-btn-quiet" onClick={() => command({ kind: paused ? "resume" : "pause" })}>
              {paused ? "▶ Resume" : "❚❚ Pause"}
            </button>
          )}
          {(phase === "countdown" || phase === "question") && (
            <button type="button" className="bb-btn bb-btn-quiet" onClick={() => command({ kind: "skip" })}>
              Skip
            </button>
          )}
          {phase !== "ended" && (
            <button
              type="button"
              className="bb-btn bb-btn-quiet"
              aria-pressed={settings.locked}
              onClick={() => command({ kind: "lock", locked: !settings.locked })}
            >
              {settings.locked ? "🔒 Locked" : "🔓 Open"}
            </button>
          )}
          {running && (
            <button
              type="button"
              className="bb-btn bb-btn-quiet"
              aria-pressed={settings.autoplay}
              onClick={() => command({ kind: "update_settings", patch: { autoplay: !settings.autoplay } })}
            >
              Autoplay {settings.autoplay ? "on" : "off"}
            </button>
          )}
          <button
            type="button"
            className="bb-btn bb-btn-quiet"
            aria-pressed={settings.sound}
            aria-label={settings.sound ? "Sound on" : "Sound off"}
            onClick={() => command({ kind: "update_settings", patch: { sound: !settings.sound } })}
          >
            {settings.sound ? "🔊" : "🔇"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {phase !== "ended" && phase !== "lobby" && phase !== "podium" && (
            confirmEnd ? (
              <>
                <span className="text-sm text-muted">End the game now?</span>
                <button type="button" className="bb-btn bb-btn-quiet" onClick={() => setConfirmEnd(false)}>
                  Keep playing
                </button>
                <button type="button" className="bb-btn bb-btn-ghost" onClick={() => (setConfirmEnd(false), command({ kind: "end" }))}>
                  End
                </button>
              </>
            ) : (
              <button type="button" className="bb-btn bb-btn-quiet" onClick={() => setConfirmEnd(true)}>
                End early
              </button>
            )
          )}
          {phase === "ended" && (
            <button type="button" className="bb-btn bb-btn-ghost" onClick={onLeave}>
              New game
            </button>
          )}
          {nextLabel && (
            <button type="button" className="bb-btn bb-btn-primary min-w-36" onClick={() => command({ kind: "next" })}>
              {nextLabel} →
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center text-xl">{children}</div>;
}
