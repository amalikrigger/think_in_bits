import { useState, type FormEvent } from "react";
import { BrandBar } from "../components/BrandBar";
import { CenteredCard, Screen } from "../components/Screen";
import { hostLogin } from "../lib/api";

export function LoginScreen({ message, onLoggedIn }: { message?: string | null; onLoggedIn: (value: { token: string; expiresAt: number }) => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await hostLogin(passphrase);
    setBusy(false);
    if (result.ok) onLoggedIn({ token: result.token, expiresAt: result.expiresAt });
    else setError(result.message);
  }

  return (
    <Screen header={<BrandBar />}>
      <CenteredCard className="max-w-md">
        <form onSubmit={submit} className="bb-card w-full p-6 sm:p-8">
          <h1 className="mb-2 text-3xl font-extrabold">Host a game</h1>
          <p className="mb-6 text-muted">Enter the teacher passphrase to upload a quiz.</p>
          {message && (
            <p role="status" className="mb-4 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold">
              {message}
            </p>
          )}
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="passphrase" className="font-semibold">
              Passphrase
            </label>
            <button type="button" className="bb-btn bb-btn-sm text-sm text-muted underline" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
              {shown ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="passphrase"
            type={shown ? "text" : "password"}
            autoComplete="current-password"
            className="bb-input mb-4"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
            aria-describedby={error ? "login-error" : undefined}
          />
          {error && (
            <p id="login-error" role="alert" className="mb-4 font-semibold text-coral">
              {error}
            </p>
          )}
          <button type="submit" className="bb-btn bb-btn-primary w-full" disabled={busy || passphrase.length === 0}>
            {busy ? "Checking…" : "Log in"}
          </button>
        </form>
      </CenteredCard>
    </Screen>
  );
}
