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

// ---------- spoken form, for screen readers ----------
// An answer tile is a button, and a button's accessible name is plain text: Chrome leaves
// KaTeX's MathML out of it. So tiles carry a spoken version of the quiz text. It covers what
// AS quizzes use (fractions, roots, powers, Greek letters, relations); anything else is read
// as its command name without the backslash, which is still better than raw TeX.

const SPOKEN_COMMANDS: Record<string, string> = {
  times: "times",
  cdot: "times",
  div: "divided by",
  pm: "plus or minus",
  le: "less than or equal to",
  leq: "less than or equal to",
  ge: "greater than or equal to",
  geq: "greater than or equal to",
  ne: "not equal to",
  neq: "not equal to",
  approx: "approximately",
  infty: "infinity",
};
const SPOKEN_SYMBOLS: Record<string, string> = { "=": "equals", "+": "plus", "-": "minus", "−": "minus", "<": "less than", ">": "greater than" };

/** Words for one TeX formula, e.g. "\frac{1}{2}" → "1 over 2". */
export function speakMath(tex: string): string {
  let s = tex.replace(/\\(displaystyle|left|right)|\\[,;!]/g, "");
  // Innermost first, so nested fractions and roots unwrap one layer per pass.
  for (let before = ""; before !== s; ) {
    before = s;
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, " $1 over $2 ").replace(/\\sqrt\{([^{}]*)\}/g, " square root of $1 ");
  }
  s = s
    .replace(/\^\{?\\circ\}?/g, " degrees ")
    .replace(/\^\{?2\}?(?![0-9])/g, " squared ")
    .replace(/\^\{?3\}?(?![0-9])/g, " cubed ")
    .replace(/\^\{([^{}]*)\}|\^(\S)/g, (_m, group: string | undefined, single: string | undefined) => ` to the power ${group ?? single} `)
    .replace(/_\{([^{}]*)\}|_(\S)/g, (_m, group: string | undefined, single: string | undefined) => ` sub ${group ?? single} `)
    .replace(/\\([a-zA-Z]+)/g, (_m, name: string) => ` ${SPOKEN_COMMANDS[name] ?? name} `)
    .replace(/[=+\-−<>]/g, (symbol) => ` ${SPOKEN_SYMBOLS[symbol]} `)
    .replace(/[{}]/g, "");
  return s
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+([),])/g, "$1")
    .trim();
}

/** Quiz text with every formula replaced by its spoken form; plain words and money stay as written. */
export const speakText = (source: string): string =>
  splitMath(source)
    .map((segment) => (segment.math ? speakMath(segment.text) : segment.text))
    .join("");
