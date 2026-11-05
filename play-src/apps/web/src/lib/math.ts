// Inline KaTeX between single dollar signs, like the math decks use. The split is pure and
// tested here; rendering (and the KaTeX download) lives in components/MathText.
//
// Quizzes also mention money, so a dollar sign only delimits math the way Pandoc reads it:
// an opening $ is followed by a non-space, a closing $ follows a non-space and is not
// followed by a digit, and \$ is always a literal dollar sign. "Costs $3 and $12" stays text.

export type MathSegment = { math: boolean; text: string };

export function splitMath(source: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let text = "";
  const flushText = () => {
    if (text) segments.push({ math: false, text });
    text = "";
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (char === "\\" && source[i + 1] === "$") {
      text += "$";
      i++;
      continue;
    }
    if (char === "$") {
      const close = closingDollar(source, i);
      if (close !== null) {
        flushText();
        segments.push({ math: true, text: source.slice(i + 1, close) });
        i = close;
        continue;
      }
    }
    text += char;
  }
  flushText();
  return segments;
}

/** Index of the $ closing a formula opened at `open`, or null when `open` is just a dollar sign. */
function closingDollar(source: string, open: number): number | null {
  if (!isVisible(source[open + 1])) return null;
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === "\\" && source[i + 1] === "$") {
      i++;
      continue;
    }
    if (source[i] !== "$") continue;
    // The first unescaped $ decides: either it closes this formula, or this $ was money.
    return isVisible(source[i - 1]) && !/[0-9]/.test(source[i + 1] ?? "") ? i : null;
  }
  return null;
}

const isVisible = (char: string | undefined): boolean => char !== undefined && !/\s/.test(char);

export const hasMath = (source: string): boolean => splitMath(source).some((segment) => segment.math);
