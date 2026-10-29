import type { HostCommand, HostView, LobbyPlayer } from "@bitblitz/schema";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { spacedCode } from "../lib/format";
import { lobbyPillSize } from "../lib/stage";
import { SettingsPanel } from "./SettingsPanel";

// The lobby reads from the back of the room: a huge code, a QR code and a short link,
// and every nickname popping in as students join. Start lives in the control bar, so it
// stays reachable however many names fill the screen.

export function joinUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}?c=${code}`;
}

const PILL = {
  lg: "px-5 py-2 text-xl",
  md: "px-4 py-1.5 text-lg",
  sm: "px-3 py-1 text-base",
} as const;

export function Lobby({ view, code, command }: { view: HostView; code: string; command: (c: HostCommand) => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const url = joinUrl(code);
  const pill = PILL[lobbyPillSize(view.players.length)];

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  return (
    <section className="flex flex-1 flex-col gap-4 pt-2 lg:gap-6">
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto] lg:gap-6">
        <div className="bb-card min-w-0 p-5 text-center lg:p-6 lg:text-left">
          <p className="text-base font-semibold text-muted lg:text-lg">Join at</p>
          <p className="break-all text-xl font-bold text-primary sm:text-2xl lg:text-3xl">{url.replace(/^https?:\/\//, "")}</p>
          <p className="mt-3 text-base font-semibold text-muted lg:text-lg">Game code</p>
          <p className="bb-lobby-code font-extrabold tabular-nums" aria-label={`Game code ${code.split("").join(" ")}`}>
            {spacedCode(code)}
          </p>
          <p className="mt-2 text-muted [overflow-wrap:anywhere]">{view.title}</p>
        </div>
        {qr && (
          <div
            className="mx-auto w-40 rounded-3xl bg-white p-3 sm:w-56 lg:w-64 2xl:w-72"
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
        <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
          {showSettings ? "Hide settings" : "Settings"}
        </button>
      </div>

      {showSettings && <SettingsPanel settings={view.settings} command={command} />}

      {view.players.length === 0 ? (
        <p className="py-8 text-center text-2xl text-muted">Waiting for players…</p>
      ) : (
        <ul className="flex flex-wrap gap-2 lg:gap-3" aria-label="Players">
          <AnimatePresence>
            {view.players.map((player) => (
              <motion.li
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="max-w-full"
              >
                {selected === player.id ? (
                  <PlayerActions player={player} command={command} onDone={() => setSelected(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(player.id)}
                    className={`max-w-full truncate rounded-full font-bold ${pill} ${player.connected ? "bg-surface-raised" : "bg-surface text-muted line-through"}`}
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
  const [mode, setMode] = useState<"menu" | "rename" | "remove">("menu");
  const [name, setName] = useState(player.nickname);

  if (mode === "rename") {
    return (
      <form
        className="flex items-center gap-2 rounded-full bg-surface-raised p-1 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) command({ kind: "rename", playerId: player.id, nickname: name.trim() });
          onDone();
        }}
      >
        <label className="sr-only" htmlFor={`rename-${player.id}`}>
          New nickname for {player.nickname}
        </label>
        <input id={`rename-${player.id}`} className="w-36 bg-transparent text-lg font-bold outline-none" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus />
        <button type="submit" className="bb-btn bb-btn-primary bb-btn-sm">
          Save
        </button>
        <button type="button" className="bb-btn bb-btn-sm text-muted" onClick={onDone} aria-label="Cancel rename">
          ✕
        </button>
      </form>
    );
  }

  if (mode === "remove") {
    // Removing also bans the student's seat for this game, so it needs a second tap.
    return (
      <div className="flex items-center gap-2 rounded-full bg-surface-raised p-1 pl-4" role="group" aria-label={`Remove ${player.nickname}?`}>
        <span className="text-base font-semibold">Remove {player.nickname}?</span>
        <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => setMode("menu")}>
          Keep
        </button>
        <button
          type="button"
          className="bb-btn bb-btn-sm bb-btn-danger"
          onClick={() => {
            command({ kind: "kick", playerId: player.id });
            onDone();
          }}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-surface-raised p-1 pl-4" role="group" aria-label={`Manage ${player.nickname}`}>
      <span className="mr-2 max-w-40 truncate text-lg font-bold">{player.nickname}</span>
      <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={() => setMode("rename")}>
        Rename
      </button>
      <button type="button" className="bb-btn bb-btn-sm bb-btn-danger" onClick={() => setMode("remove")}>
        Remove
      </button>
      <button type="button" className="bb-btn bb-btn-sm text-muted" onClick={onDone} aria-label="Close">
        ✕
      </button>
    </div>
  );
}
