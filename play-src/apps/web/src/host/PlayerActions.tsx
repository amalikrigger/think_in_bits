import type { HostCommand, LobbyPlayer } from "@bitblitz/schema";
import { useState } from "react";

// Rename or remove one player. Used in the lobby and, during the game, in the Players panel:
// a late joiner whose name slips past the filter must be removable at any point.

export function PlayerActions({ player, command, onDone }: { player: LobbyPlayer; command: (c: HostCommand) => void; onDone: () => void }) {
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
