// Number settings are typed as free text and committed on blur or Enter, so a teacher can
// type "15" into a field whose minimum is 2 without the "1" being rejected on the way.

/** Commit a typed draft: blank or garbage keeps the old value; otherwise snap to the step and clamp. */
export function commitDraft(draft: string, fallback: number, min: number, max: number, step = 1): number {
  const text = draft.trim().replace(",", ".");
  if (text === "") return fallback;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return fallback;
  const snapped = step > 0 ? Math.round(parsed / step) * step : parsed;
  const clamped = Math.min(max, Math.max(min, snapped));
  // 0.1 + 0.2 style artefacts would otherwise show up with a 0.5 step.
  return Number(clamped.toFixed(6));
}

/** The −/+ buttons: one step in either direction, never past the range. */
export function stepValue(value: number, direction: -1 | 1, min: number, max: number, step = 1): number {
  return commitDraft(String(value + direction * step), value, min, max, step);
}
