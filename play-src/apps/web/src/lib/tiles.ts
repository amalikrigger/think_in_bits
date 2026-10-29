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
