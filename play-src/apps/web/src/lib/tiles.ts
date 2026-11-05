// Answer slots: every colour has its own shape, so colour is never the only cue.
export type TileStyle = { color: string; shape: string; shapeName: string; colorName: string };

export const TILES: TileStyle[] = [
  { color: "var(--bb-tile-1)", shape: "▲", shapeName: "triangle", colorName: "cyan" },
  { color: "var(--bb-tile-2)", shape: "◆", shapeName: "diamond", colorName: "coral" },
  { color: "var(--bb-tile-3)", shape: "●", shapeName: "circle", colorName: "teal" },
  { color: "var(--bb-tile-4)", shape: "■", shapeName: "square", colorName: "violet" },
  { color: "var(--bb-tile-5)", shape: "★", shapeName: "star", colorName: "amber" },
  { color: "var(--bb-tile-6)", shape: "⬢", shapeName: "hexagon", colorName: "pink" },
];

export const tile = (index: number): TileStyle => TILES[index % TILES.length]!;

// Teams are named after colours (the engine's TEAM_NAMES), so each team's dot must be its
// own colour wherever it ranks; colouring by rank once put a coral dot beside "Teal".
const EXTRA_TEAM_COLORS: Record<string, string> = { indigo: "#818cf8", lime: "#a3e635", rose: "#fb7185", sky: "#38bdf8" };

export function teamColor(team: string): string {
  const name = team.toLowerCase();
  return TILES.find((t) => t.colorName === name)?.color ?? EXTRA_TEAM_COLORS[name] ?? "var(--bb-text-muted)";
}
