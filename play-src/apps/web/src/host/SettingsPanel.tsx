import type { HostCommand, QuizSettings, SettingsPatch } from "@bitblitz/schema";
import { useId, useState } from "react";
import { commitDraft, stepValue } from "../lib/number-field";

// Lobby settings, changeable while students join. Every change goes to the server,
// which validates it and pushes the new settings back in the next view.

type Toggle = { key: keyof QuizSettings; label: string; hint?: string };

const GROUPS: { title: string; toggles: Toggle[] }[] = [
  {
    title: "Pacing",
    toggles: [
      { key: "autoplay", label: "Autoplay", hint: "Reveal and leaderboard advance by themselves" },
      { key: "explanationSlide", label: "Show explanations after the reveal" },
    ],
  },
  {
    title: "Scoring",
    toggles: [
      { key: "fastestFinger", label: "Fastest-finger bonus", hint: "+100 / +60 / +30" },
      { key: "streaks", label: "Streak bonus", hint: "Up to +250" },
      { key: "multiPenalty", label: "Wrong multi-select picks cost points" },
    ],
  },
  {
    title: "Students",
    toggles: [
      { key: "showAnswersOnDevice", label: "Show answer text on devices", hint: "Off shows shapes only" },
      { key: "generatedNicknamesOnly", label: "Generated nicknames only" },
      { key: "profanityFilter", label: "Nickname filter" },
      { key: "lateJoin", label: "Allow late joining" },
    ],
  },
  {
    title: "Order",
    toggles: [
      { key: "shuffleQuestions", label: "Shuffle questions" },
      { key: "shuffleAnswers", label: "Shuffle answers" },
    ],
  },
  {
    title: "Sound",
    toggles: [
      { key: "sound", label: "Sound" },
      { key: "music", label: "Music", hint: "Plays only if the quiz names music files" },
    ],
  },
];

export function SettingsPanel({ settings, command }: { settings: QuizSettings; command: (c: HostCommand) => void }) {
  const patch = (p: SettingsPatch) => command({ kind: "update_settings", patch: p });
  const override = settings.timeLimitOverrideSec;

  return (
    <section aria-label="Game settings" className="bb-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
      {GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          {group.toggles.map((toggle) => (
            <Switch key={toggle.key} label={toggle.label} hint={toggle.hint} checked={Boolean(settings[toggle.key])} onChange={(value) => patch({ [toggle.key]: value })} />
          ))}
        </Group>
      ))}

      <Group title="Timing">
        <NumberField label="Reveal" unit="s" value={settings.revealSec} min={2} max={60} onChange={(v) => patch({ revealSec: v })} />
        <NumberField label="Leaderboard" unit="s" value={settings.leaderboardSec} min={2} max={60} onChange={(v) => patch({ leaderboardSec: v })} />
        <NumberField label="Leaderboard every N questions" value={settings.leaderboardEvery} min={1} max={50} onChange={(v) => patch({ leaderboardEvery: v })} />
        <Switch
          label="Same time limit for every question"
          hint="Off: each question keeps its own"
          checked={override !== null}
          onChange={(on) => patch({ timeLimitOverrideSec: on ? 20 : null })}
        />
        {override !== null && (
          <NumberField label="Seconds per question" unit="s" value={override} min={5} max={240} onChange={(v) => patch({ timeLimitOverrideSec: v })} />
        )}
      </Group>

      <Group title="Room">
        <NumberField label="Points multiplier" unit="×" value={settings.pointsMultiplier} min={0} max={5} step={0.5} onChange={(v) => patch({ pointsMultiplier: v })} />
        <NumberField label="Lobby capacity" value={settings.lobbyCapacity} min={1} max={300} onChange={(v) => patch({ lobbyCapacity: v })} />
        <Switch label="Teams" hint="Auto-balanced when the game starts" checked={settings.teams.enabled} onChange={(v) => patch({ teams: { ...settings.teams, enabled: v } })} />
        {settings.teams.enabled && (
          <>
            <NumberField label="Team size" value={settings.teams.size} min={2} max={10} onChange={(v) => patch({ teams: { ...settings.teams, size: v } })} />
            <Switch
              label="Team score is the sum (off: average)"
              checked={settings.teams.scoring === "sum"}
              onChange={(v) => patch({ teams: { ...settings.teams, scoring: v ? "sum" : "average" } })}
            />
          </>
        )}
      </Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-2xl bg-white/[0.03] p-4">
      <legend className="float-left mb-1 w-full text-sm font-bold uppercase tracking-widest text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-raised"}`}
      >
        <span className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

/**
 * A number setting typed as free text and committed on blur or Enter, with −/+ buttons
 * for touch. Committing is where the clamp happens; typing "15" into a field whose
 * minimum is 2 never has its "1" rejected on the way.
 */
function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = commitDraft(draft, value, min, max, step);
    setDraft(null);
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">
          {min}–{max}
          {unit ? ` ${unit}` : ""}
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="bb-btn bb-btn-quiet h-11 w-11 min-h-0 p-0 text-xl"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(stepValue(value, -1, min, max, step))}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="h-11 w-16 rounded-xl border-2 border-surface-raised bg-surface-alt text-center text-base font-bold focus:border-primary focus:outline-none"
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="bb-btn bb-btn-quiet h-11 w-11 min-h-0 p-0 text-xl"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(stepValue(value, 1, min, max, step))}
        >
          +
        </button>
      </div>
    </div>
  );
}
