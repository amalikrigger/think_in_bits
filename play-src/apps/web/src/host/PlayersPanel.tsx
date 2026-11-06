import type { HostCommand, LobbyPlayer } from "@bitblitz/schema";
import { useEffect, useState } from "react";
import { PlayerActions } from "./PlayerActions";

// Rename or remove students once the game is running (the lobby has its own list). Opened
// from the control bar; the game keeps running underneath, so it reads as a small sheet
// over the projector rather than a new screen.

export function PlayersPanel({ players, command, onClose }: { players: LobbyPlayer[]; command: (c: HostCommand) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const sorted = [...players].sort((a, b) => a.nickname.localeCompare(b.nickname));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/60 p-4 pt-16" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="players-panel-title"
        className="bb-card flex max-h-[80vh] w-full max-w-2xl flex-col gap-4 overflow-hidden p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="players-panel-title" className="text-2xl font-bold">
            Players ({players.length})
          </h2>
          <button type="button" className="bb-btn bb-btn-sm bb-btn-quiet" onClick={onClose} aria-label="Close players">
            ✕
          </button>
        </div>
        <p className="text-muted">Tap a name to rename or remove that student. The game keeps running.</p>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xl text-muted">Nobody is in the game.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 overflow-y-auto" aria-label="Players in the game">
            {sorted.map((player) => (
              <li key={player.id} className="max-w-full">
                {selected === player.id ? (
                  <PlayerActions player={player} command={command} onDone={() => setSelected(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(player.id)}
                    className={`max-w-full truncate rounded-full px-4 py-1.5 text-lg font-bold ${player.connected ? "bg-surface-raised" : "bg-surface text-muted line-through"}`}
                    aria-label={`${player.nickname}${player.connected ? "" : " (offline)"}. Manage player`}
                  >
                    {player.nickname}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
