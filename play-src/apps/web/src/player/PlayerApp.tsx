import { REJECTION_TEXT } from "@bitblitz/schema";
import { useEffect, useState, type FormEvent } from "react";
import { BrandBar } from "../components/BrandBar";
import { fetchGameInfo, type GameInfo } from "../lib/api";
import { lastNickname, playerSeat } from "../lib/storage";
import { PlayerGame } from "./PlayerGame";

// Student flow: code → nickname → game. A saved seat skips straight back into the game,
// so a refresh, a lock screen or a Wi-Fi blip resumes with the same score.

type Step =
  | { kind: "code"; error?: string }
  | { kind: "nickname"; code: string; info: Extract<GameInfo, { exists: true }>; error?: string }
  | { kind: "playing"; code: string; nickname: string };

function initialStep(): Step {
  const code = new URLSearchParams(window.location.search).get("c");
  if (code && /^\d{6}$/.test(code)) {
    const seat = playerSeat.get(code);
    if (seat) return { kind: "playing", code, nickname: seat.nickname };
  }
  return { kind: "code" };
}

export function PlayerApp() {
  const [step, setStep] = useState<Step>(initialStep);
  const urlCode = new URLSearchParams(window.location.search).get("c");

  async function openGame(code: string) {
    const info = await fetchGameInfo(code).catch(() => ({ exists: false }) as const);
    if (!info.exists) return setStep({ kind: "code", error: `No game with code ${code}. Check the screen.` });
    if (playerSeat.get(code)) return setStep({ kind: "playing", code, nickname: playerSeat.get(code)!.nickname });
    if (!info.joinable) {
      const reason = info.locked ? REJECTION_TEXT.room_locked : info.phase === "podium" || info.phase === "ended" ? REJECTION_TEXT.game_over : REJECTION_TEXT.game_started;
      return setStep({ kind: "code", error: reason });
    }
    setStep({ kind: "nickname", code, info });
  }

  // A QR or link with ?c= skips typing the code.
  useEffect(() => {
    if (step.kind === "code" && !step.error && urlCode && /^\d{6}$/.test(urlCode)) void openGame(urlCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (step.kind === "playing") {
    return (
      <PlayerGame
        code={step.code}
        nickname={step.nickname}
        onRejected={async (reason) => {
          const info = await fetchGameInfo(step.code).catch(() => ({ exists: false }) as const);
          if (info.exists && info.joinable && reason !== "kicked") setStep({ kind: "nickname", code: step.code, info, error: REJECTION_TEXT[reason] });
          else setStep({ kind: "code", error: REJECTION_TEXT[reason] });
        }}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar />
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {step.kind === "code" ? (
          <CodeForm error={step.error} initial={urlCode ?? ""} onSubmit={openGame} />
        ) : (
          <NicknameForm
            title={step.info.title}
            generated={step.info.generatedNicknames}
            error={step.error}
            onSubmit={(nickname) => {
              lastNickname.set(nickname);
              setStep({ kind: "playing", code: step.code, nickname });
            }}
            onBack={() => setStep({ kind: "code" })}
          />
        )}
      </main>
    </div>
  );
}

function CodeForm({ error, initial, onSubmit }: { error?: string; initial: string; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState(initial.replace(/\D/g, "").slice(0, 6));
  const [busy, setBusy] = useState(false);
  const valid = /^\d{6}$/.test(code);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    await onSubmit(code);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="bb-card w-full max-w-sm p-6 text-center sm:p-8">
      <h1 className="mb-1 text-3xl font-extrabold">
        Bit<span className="text-primary">Blitz</span>
      </h1>
      <p className="mb-6 text-muted">Enter the game code on the screen</p>
      <label htmlFor="code" className="sr-only">
        Game code
      </label>
      <input
        id="code"
        className="bb-input mb-4 text-center font-mono text-4xl tracking-[0.3em]"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoFocus
        aria-describedby={error ? "code-error" : undefined}
      />
      {error && (
        <p id="code-error" role="alert" className="mb-4 font-semibold text-coral">
          {error}
        </p>
      )}
      <button type="submit" className="bb-btn bb-btn-primary w-full text-lg" disabled={!valid || busy}>
        {busy ? "Finding game…" : "Enter"}
      </button>
    </form>
  );
}

function NicknameForm({
  title,
  generated,
  error,
  onSubmit,
  onBack,
}: {
  title: string;
  generated: boolean;
  error?: string;
  onSubmit: (nickname: string) => void;
  onBack: () => void;
}) {
  const [nickname, setNickname] = useState(() => lastNickname.get() ?? "");
  const trimmed = nickname.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (generated || trimmed) onSubmit(generated ? "player" : trimmed);
      }}
      className="bb-card w-full max-w-sm p-6 text-center sm:p-8"
    >
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted">Joining</p>
      <h1 className="mb-6 text-2xl font-extrabold">{title}</h1>
      {generated ? (
        <p className="mb-6 text-muted">Your teacher has turned on generated nicknames. You'll get a fun one when you join.</p>
      ) : (
        <>
          <label htmlFor="nickname" className="mb-2 block text-left font-semibold">
            Nickname
          </label>
          <p className="mb-3 text-left text-sm text-muted">Not your real name. Keep it friendly.</p>
          <input
            id="nickname"
            className="bb-input mb-4"
            maxLength={20}
            autoComplete="off"
            autoCapitalize="words"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
          />
        </>
      )}
      {error && (
        <p role="alert" className="mb-4 font-semibold text-coral">
          {error}
        </p>
      )}
      <button type="submit" className="bb-btn bb-btn-primary mb-3 w-full text-lg" disabled={!generated && !trimmed}>
        Join game
      </button>
      <button type="button" className="text-sm text-muted underline" onClick={onBack}>
        Different code
      </button>
    </form>
  );
}
