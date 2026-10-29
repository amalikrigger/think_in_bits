import type { ReactNode } from "react";

// A compact version of the site header: the Think In Bits wordmark links home, BitBlitz
// is the product name. The full site nav would steal space from the game. The wordmark
// sits in a shrinkable column so a nickname and a "Reconnecting" badge never push the
// header wider than a 320 px phone.
export function BrandBar({ right, compact = false }: { right?: ReactNode; compact?: boolean }) {
  return (
    <header className={`grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 ${compact ? "py-2" : "py-3 sm:px-6"}`}>
      <a href="/" className="flex min-w-0 items-center" aria-label="Think In Bits home">
        <img src="/images/logo-text.png" alt="Think In Bits" className="h-auto max-h-5 w-auto max-w-full opacity-90 sm:max-h-6" decoding="async" />
      </a>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="shrink-0 text-lg font-extrabold tracking-tight sm:text-xl">
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
    <span role="status" className="shrink-0 rounded-full bg-coral/20 px-2.5 py-1 text-xs font-semibold text-coral sm:px-3 sm:text-sm">
      {label}
    </span>
  );
}
