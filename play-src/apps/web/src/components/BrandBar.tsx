import type { ReactNode } from "react";

// A compact version of the site header: the Think In Bits wordmark links home, BitBlitz
// is the product name. The full site nav would steal space from the game.
export function BrandBar({ right, compact = false }: { right?: ReactNode; compact?: boolean }) {
  return (
    <header className={`flex items-center justify-between gap-3 px-4 ${compact ? "py-2" : "py-3 sm:px-6"}`}>
      <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Think In Bits home">
        <img src="/images/logo-text.png" alt="Think In Bits" className="h-5 w-auto opacity-90 sm:h-6" />
      </a>
      <div className="flex items-center gap-3">
        <span className="text-lg font-extrabold tracking-tight sm:text-xl" aria-label="BitBlitz">
          Bit<span className="text-primary">Blitz</span>
        </span>
        {right}
      </div>
    </header>
  );
}

export function ConnectionBadge({ status }: { status: string }) {
  if (status === "open") return null;
  const label = status === "stopped" ? "Disconnected" : "Reconnecting…";
  return (
    <span role="status" className="rounded-full bg-coral/20 px-3 py-1 text-sm font-semibold text-coral">
      {label}
    </span>
  );
}
