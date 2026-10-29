import type { HostCommand, HostView, LobbyPlayer } from "@bitblitz/schema";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { spacedCode } from "../lib/format";
import { SettingsPanel } from "./SettingsPanel";

// The lobby reads from the back of the room: a huge code, a QR code and a short link,
// and every nickname popping in as students join.

export function joinUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}?c=${code}`;
}

export function Lobby({ view, code, command }: { view: HostView; code: string; command: (c: HostCommand) => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const url = joinUrl(code);

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  return (
    <section className="flex flex-1 flex-col gap-6 pt-2">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="bb-card p-6 text-center lg:text-left">
          <p className="text-lg font-semibold text-muted">Join at</p>
          <p className="break-all text-2xl font-bold text-primary sm:text-3xl">{url.replace(/^https?:\/\//, "")}</p>
          <p className="mt-4 text-lg font-semibold text-muted">Game code</p>
          <p className="text-6xl font-extrabold tracking-wider tabular-nums sm:text-8xl lg:text-9xl" aria-label={`Game code ${code.split("").join(" ")}`}>
            {spacedCode(code)}
          </p>
          <p className="mt-2 text-muted">{view.title}</p>
        </div>
        {qr && (
          <div
            className="mx-auto w-48 rounded-3xl bg-white p-3 sm:w-64 lg:w-72"
            role="img"
            aria-label="QR code that opens the join page"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold" aria-live="polite">
          {view.players.length} player{view.players.length === 1 ? "" : "s"}
          {view.settings.locked && <span className="ml-3 text-base font-semibold text-coral">Room locked</span>}
        </h2>
        <div className="flex gap-2">
          <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
            Settings
          </button>
          <button type="button" className="bb-btn bb-btn-primary min-w-40 text-lg" disabled={view.players.length === 0} onClick={() => command({ kind: "start" })}>
            Start ▶
          </button>
        </div>
      </div>

      {showSettings && <SettingsPanel settings={view.settings} command={command} />}

      {view.players.length === 0 ? (
        <p className="py-10 text-center text-2xl text-muted">Waiting for players…</p>
      ) : (
        <ul className="flex flex-wrap gap-3" aria-label="Players">
          <AnimatePresence>
            {view.players.map((player) => (
              <motion.li
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                {selected === player.id ? (
                  <PlayerActions player={player} command={command} onDone={() => setSelected(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(player.id)}
                    className={`rounded-full px-5 py-2 text-xl font-bold ${player.connected ? "bg-surface-raised" : "bg-surface text-muted line-through"}`}
                    aria-label={`${player.nickname}${player.connected ? "" : " (offline)"}. Manage player`}
                  >
                    {player.nickname}
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function PlayerActions({ player, command, onDone }: { player: LobbyPlayer; command: (c: HostCommand) => void; onDone: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(player.nickname);

  if (renaming) {
    return (
      <form
        className="flex items-center gap-2 rounded-full bg-surface-raised p-1 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          command({ kind: "rename", playerId: player.id, nickname: name });
          onDone();
        }}
      >
        <label className="sr-only" htmlFor={`rename-${player.id}`}>
          New nickname for {player.nickname}
        </label>
        <input id={`rename-${player.id}`} className="w-40 bg-transparent text-lg font-bold outline-none" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus />
        <button type="submit" className="bb-btn bb-btn-primary min-h-9 px-4 text-sm">
          Save
        </button>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface-raised p-1 pl-4">
      <span className="mr-2 text-lg font-bold">{player.nickname}</span>
      <button type="button" className="bb-btn bb-btn-quiet min-h-9 px-3 text-sm" onClick={() => setRenaming(true)}>
        Rename
      </button>
      <button
        type="button"
        className="bb-btn min-h-9 bg-coral px-3 text-sm text-[#0a0a0a]"
        onClick={() => {
          command({ kind: "kick", playerId: player.id });
          onDone();
        }}
      >
        Remove
      </button>
      <button type="button" className="bb-btn min-h-9 px-3 text-sm text-muted" onClick={onDone} aria-label="Close">
        ✕
      </button>
    </div>
  );
}
