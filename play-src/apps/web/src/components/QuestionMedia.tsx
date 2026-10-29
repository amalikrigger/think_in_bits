import type { Media } from "@bitblitz/schema";
import { useState } from "react";
import { mediaUrl } from "../lib/api";

// Images and code blocks in a question. On the projector (`large`) the image flexes to
// whatever height is left between the prompt and the tiles (see .bb-media-stage); on a
// phone it has a fixed cap and the page scrolls. A missing upload shows its alt text
// instead of the browser's broken-image icon.

export function QuestionMedia({ media, code, large = false }: { media: Media; code: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (media.type === "image") {
    if (failed) {
      return (
        <figure className={`mx-auto flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 text-center text-muted ${large ? "bb-media-stage" : "min-h-24"}`}>
          <figcaption className="text-lg">{media.alt}</figcaption>
        </figure>
      );
    }
    return (
      <div className={`mx-auto flex min-h-0 justify-center ${large ? "bb-media-stage" : "max-h-44"}`}>
        <img
          src={mediaUrl(code, media.src)}
          alt={media.alt}
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full max-h-full w-auto max-w-full rounded-2xl bg-white/5 object-contain"
        />
      </div>
    );
  }

  return (
    <figure className={`mx-auto flex min-h-0 w-full max-w-3xl flex-col ${large ? "bb-media-stage" : ""}`}>
      <figcaption className="mb-1 shrink-0 text-left text-xs font-semibold uppercase tracking-widest text-muted">{media.language}</figcaption>
      <pre
        className={`min-h-0 overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-left font-mono leading-relaxed text-ink ${large ? "bb-code-stage" : "text-sm"}`}
        tabIndex={0}
      >
        <code>{media.source}</code>
      </pre>
    </figure>
  );
}
