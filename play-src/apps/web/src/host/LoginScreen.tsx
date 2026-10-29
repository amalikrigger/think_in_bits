import { useState, type FormEvent } from "react";
import { BrandBar } from "../components/BrandBar";
import { hostLogin } from "../lib/api";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (value: { token: string; expiresAt: number }) => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await hostLogin(passphrase);
    setBusy(false);
    if (result.ok) onLoggedIn({ token: result.token, expiresAt: result.expiresAt });
    else setError(result.message);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandBar />
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <form onSubmit={submit} className="bb-card w-full max-w-md p-8">
          <h1 className="mb-2 text-3xl font-extrabold">Host a game</h1>
          <p className="mb-6 text-muted">Enter the teacher passphrase to upload a quiz.</p>
          <label htmlFor="passphrase" className="mb-2 block font-semibold">
            Passphrase
          </label>
          <input
            id="passphrase"
            type="password"
            autoComplete="current-password"
            className="bb-input mb-4"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
          />
          {error && (
            <p role="alert" className="mb-4 font-semibold text-coral">
              {error}
            </p>
          )}
          <button type="submit" className="bb-btn bb-btn-primary w-full" disabled={busy || passphrase.length === 0}>
            {busy ? "Checking…" : "Log in"}
          </button>
        </form>
      </main>
    </div>
  );
}
