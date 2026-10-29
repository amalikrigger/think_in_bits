import { Fragment, useEffect, useMemo, useState } from "react";
import { splitMath } from "../lib/math";

// Renders text with inline KaTeX between single dollar signs, like the math decks do.
// KaTeX is 270 KB of JavaScript that a student's phone only needs once a prompt contains
// math, so it is downloaded on demand (and preloaded while the lobby waits) instead of
// sitting in the join page's bundle. Plain segments stay React text (escaped); KaTeX output
// is its own escaped HTML.

type Katex = typeof import("katex").default;
let loaded: Katex | null = null;
let loading: Promise<Katex> | null = null;

/** Start the KaTeX download early (the lobby calls this) so the first question renders without a flash of TeX source. */
export function preloadMath(): Promise<Katex> {
  loading ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(([module]) => (loaded = module.default));
  return loading;
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => splitMath(text), [text]);
  const needsKatex = segments.some((segment) => segment.math);
  const [katex, setKatex] = useState<Katex | null>(loaded);

  useEffect(() => {
    if (!needsKatex || katex) return;
    let live = true;
    preloadMath()
      .then((module) => live && setKatex(module))
      .catch(() => undefined); // offline mid-game: the TeX source stays readable as text
    return () => {
      live = false;
    };
  }, [needsKatex, katex]);

  return (
    <span className={className}>
      {segments.map((segment, i) =>
        !segment.math ? (
          <Fragment key={i}>{segment.text}</Fragment>
        ) : katex ? (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              // Inline fractions shrink to script size, unreadable on a phone tile or from the back
              // of the room; display style keeps numerator and denominator at text size.
              __html: katex.renderToString(segment.text.includes("\\frac") ? `\\displaystyle ${segment.text}` : segment.text, {
                throwOnError: false,
                output: "htmlAndMathml",
              }),
            }}
          />
        ) : (
          <span key={i} className="font-mono">
            {segment.text}
          </span>
        ),
      )}
    </span>
  );
}
