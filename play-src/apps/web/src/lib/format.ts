export const formatPoints = (n: number): string => n.toLocaleString("en-GB");

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** Game codes read better on a projector as two groups: 482 913. */
export const spacedCode = (code: string): string => `${code.slice(0, 3)} ${code.slice(3)}`;

/** "1 player", "30 players". */
export const countOf = (n: number, noun: string): string => `${formatPoints(n)} ${noun}${n === 1 ? "" : "s"}`;
