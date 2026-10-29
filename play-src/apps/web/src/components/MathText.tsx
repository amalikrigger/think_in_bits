import katex from "katex";
import { Fragment, useMemo } from "react";

// Renders text with inline KaTeX between single dollar signs, like the math decks do.
// Plain segments stay React text (escaped); KaTeX output is its own escaped HTML.

type Segment = { math: boolean; text: string };

export function splitMath(source: string): Segment[] {
  const segments: Segment[] = [];
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

export function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => splitMath(text), [text]);
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.math ? (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(segment.text, { throwOnError: false, output: "htmlAndMathml" }),
            }}
          />
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </span>
  );
}
