import { REJECTION_TEXT, type HostCommand, type HostView, type ServerMessage } from "@bitblitz/schema";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { BrandBar, ConnectionBadge } from "../components/BrandBar";
import { Leaderboard } from "../components/Leaderboard";
import { preloadMath } from "../components/MathText";
import { CenteredCard, Screen } from "../components/Screen";
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

  const { status, view, send, reconnect, stopReason } = useGameSocket<HostView>({
    code: game.code,
    role: "host",
    hello: () => ({ type: "host_auth", key: game.hostKey }),
    onMessage,
  });

  const command = useCallback(
    (c: HostCommand) => {
      if (!send({ type: "command", command: c })) setNotice("Not connected to the game yet. Hold on…");
    },
    [send],
  );
  useSound(game.code, view?.phase ?? null, view?.music ?? null, uploaded, view?.settings.sound ?? false, view?.settings.music ?? false);

  useEffect(() => {
    void preloadMath();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (status === "stopped") {
    return (
      <Screen header={<BrandBar />}>
        <CenteredCard className="max-w-md text-center">
          <p className="mb-6 text-2xl font-bold">{stopReason}</p>
          <button type="button" className="bb-btn bb-btn-primary" onClick={onLeave}>
            Start a new game
          </button>
        </CenteredCard>
      </Screen>
    );
  }
  if (!view) {
    return (
      <Screen header={<BrandBar right={<ConnectionBadge status={status} />} />}>
        <CenteredCard className="max-w-md text-center">
          <p className="mb-2 text-xl font-semibold">Connecting to game {spacedCode(game.code)}…</p>
          {status === "reconnecting" && <p className="mb-4 text-muted">Can't reach the game server yet. We'll keep trying.</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" className="bb-btn bb-btn-ghost" onClick={reconnect}>
              Try again now
            </button>
            <button type="button" className="bb-btn bb-btn-quiet" onClick={onLeave}>
              Back to upload
            </button>
          </div>
        </CenteredCard>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <BrandBar
          compact
          right={
            <>
              <ConnectionBadge status={status} />
              {view.phase !== "lobby" && (
                <span className="hidden rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-bold sm:inline">
                  <span className="sr-only">Game code </span>
                  {spacedCode(game.code)}
                </span>
              )}
            </>
          }
        />
      }
      footer={<ControlBar view={view} command={command} onLeave={onLeave} />}
      mainClassName="px-4 sm:px-6"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${view.phase}-${view.question?.index ?? ""}`}
          className="flex min-h-0 flex-1 flex-col"
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
            <section className="flex flex-1 flex-col gap-4 pt-2 lg:gap-6">
              <h1 className="text-center text-3xl font-extrabold lg:text-5xl">Leaderboard</h1>
              <Leaderboard entries={view.leaderboard} teams={view.teams} />
            </section>
          )}
          {(view.phase === "podium" || view.phase === "ended") && <Results view={view} game={game} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.p
            role="status"
            className="fixed left-1/2 top-14 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-surface-raised px-5 py-2 text-center font-semibold shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </Screen>
  );
}

function ControlBar({ view, command, onLeave }: { view: HostView; command: (c: HostCommand) => void; onLeave: () => void }) {
  const [confirm, setConfirm] = useState<"end" | "cancel" | null>(null);
  const [more, setMore] = useState(false);
  const { phase, paused, settings } = view;
  const running = phase === "countdown" || phase === "question" || phase === "reveal" || phase === "leaderboard";
  const canStart = phase === "lobby" && view.players.length > 0;
  const nextLabel =
    phase === "lobby"
      ? "Start ▶"
      : phase === "question"
        ? "Reveal now →"
        : phase === "reveal"
          ? view.hasMoreQuestions
            ? "Next →"
            : "Podium →"
          : phase === "leaderboard"
            ? "Next question →"
            : phase === "podium"
              ? "Finish →"
              : null;
  const next = useCallback(() => command({ kind: phase === "lobby" ? "start" : "next" }), [command, phase]);

  // A confirmation that outlives the phase it was asked in would end the wrong thing.
  useEffect(() => setConfirm(null), [phase]);

  // Presentation clickers send → or Page Down; Space pauses. Ignored while typing. Space is
  // also ignored while a button has focus (it would fire that button too), but the arrow keys
  // still work there, because the last mouse click leaves focus on a button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((event.key === "ArrowRight" || event.key === "PageDown") && nextLabel && (phase !== "lobby" || canStart)) {
        event.preventDefault();
        next();
      } else if (event.key === " " && running && !target?.closest("button")) {
        event.preventDefault();
        command({ kind: paused ? "resume" : "pause" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, paused, running, nextLabel, canStart, next, command]);

  const secondary = `bb-btn bb-btn-sm bb-btn-quiet ${more ? "" : "hidden sm:inline-flex"}`;

  return (
    <nav aria-label="Teacher controls" className="bb-footer border-t border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
      <p className="sr-only">Keyboard: right arrow or Page Down advances, Space pauses and resumes.</p>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 pt-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {running && (
            <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => command({ kind: paused ? "resume" : "pause" })}>
              {paused ? "▶ Resume" : "❚❚ Pause"}
            </button>
          )}
          {(phase === "countdown" || phase === "question") && (
            <button type="button" className={secondary} onClick={() => command({ kind: "skip" })}>
              Skip
            </button>
          )}
          {phase !== "ended" && (
            <button type="button" className={secondary} aria-pressed={settings.locked} onClick={() => command({ kind: "lock", locked: !settings.locked })}>
              {settings.locked ? "🔒 Locked" : "🔓 Open"}
            </button>
          )}
          {running && (
            <button
              type="button"
              className={secondary}
              aria-pressed={settings.autoplay}
              onClick={() => command({ kind: "update_settings", patch: { autoplay: !settings.autoplay } })}
            >
              Autoplay {settings.autoplay ? "on" : "off"}
            </button>
          )}
          <button
            type="button"
            className={secondary}
            aria-pressed={settings.sound}
            aria-label={settings.sound ? "Sound on" : "Sound off"}
            onClick={() => command({ kind: "update_settings", patch: { sound: !settings.sound } })}
          >
            {settings.sound ? "🔊" : "🔇"}
          </button>
          {phase === "lobby" &&
            (confirm === "cancel" ? (
              <>
                <span className="text-sm text-muted">Cancel this game?</span>
                <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => setConfirm(null)}>
                  Keep it
                </button>
                <button
                  type="button"
                  className="bb-btn bb-btn-sm bb-btn-danger"
                  onClick={() => {
                    command({ kind: "end" });
                    onLeave();
                  }}
                >
                  Cancel game
                </button>
              </>
            ) : (
              <button type="button" className={secondary} onClick={() => setConfirm("cancel")}>
                Cancel game
              </button>
            ))}
          <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet sm:hidden" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {more ? "Less" : "More…"}
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {running &&
            (confirm === "end" ? (
              <>
                <span className="text-sm text-muted">End the game now?</span>
                <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => setConfirm(null)}>
                  Keep playing
                </button>
                <button
                  type="button"
                  className="bb-btn bb-btn-sm bb-btn-danger"
                  onClick={() => {
                    setConfirm(null);
                    command({ kind: "end" });
                  }}
                >
                  End
                </button>
              </>
            ) : (
              <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => setConfirm("end")}>
                End early
              </button>
            ))}
          {phase === "ended" && (
            <button type="button" className="bb-btn bb-btn-sm bb-btn-ghost" onClick={onLeave}>
              New game
            </button>
          )}
          {nextLabel && (
            <button type="button" className="bb-btn bb-btn-primary min-w-36" disabled={phase === "lobby" && !canStart} onClick={next}>
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
