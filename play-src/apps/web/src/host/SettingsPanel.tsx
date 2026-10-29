import type { HostCommand, QuizSettings, SettingsPatch } from "@bitblitz/schema";
import { useId } from "react";

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

  return (
    <section aria-label="Game settings" className="bb-card grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-bold uppercase tracking-widest text-muted">{group.title}</legend>
          {group.toggles.map((toggle) => (
            <Switch
              key={toggle.key}
              label={toggle.label}
              hint={toggle.hint}
              checked={Boolean(settings[toggle.key])}
              onChange={(value) => patch({ [toggle.key]: value })}
            />
          ))}
        </fieldset>
      ))}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-bold uppercase tracking-widest text-muted">Timing</legend>
        <NumberField label="Reveal (s)" value={settings.revealSec} min={2} max={60} onChange={(v) => patch({ revealSec: v })} />
        <NumberField label="Leaderboard (s)" value={settings.leaderboardSec} min={2} max={60} onChange={(v) => patch({ leaderboardSec: v })} />
        <NumberField label="Leaderboard every N questions" value={settings.leaderboardEvery} min={1} max={50} onChange={(v) => patch({ leaderboardEvery: v })} />
        <NumberField
          label="Time limit for every question (s, 0 = per question)"
          value={settings.timeLimitOverrideSec ?? 0}
          min={0}
          max={240}
          onChange={(v) => patch({ timeLimitOverrideSec: v === 0 ? null : Math.max(5, v) })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-bold uppercase tracking-widest text-muted">Room</legend>
        <NumberField label="Points multiplier" value={settings.pointsMultiplier} min={0} max={5} step={0.5} onChange={(v) => patch({ pointsMultiplier: v })} />
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
      </fieldset>
    </section>
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
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        className="w-24 rounded-xl border-2 border-surface-raised bg-surface-alt px-3 py-2 text-right font-bold"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
      />
    </div>
  );
}
