// Inline KaTeX between single dollar signs, like the math decks use. The split is pure and
// tested here; rendering (and the KaTeX download) lives in components/MathText.

export type MathSegment = { math: boolean; text: string };

export function splitMath(source: string): MathSegment[] {
  const segments: MathSegment[] = [];
  const pattern = /\$([^$]+)\$/g;
  let last = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match.index > last) segments.push({ math: false, text: source.slice(last, match.index) });
    segments.push({ math: true, text: match[1]! });
    last = match.index + match[0].length;
  }
  if (last < source.length) segments.push({ math: false, text: source.slice(last) });
  return segments;
}

export const hasMath = (source: string): boolean => /\$[^$]+\$/.test(source);
