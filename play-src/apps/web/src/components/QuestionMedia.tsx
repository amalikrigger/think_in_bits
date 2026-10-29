import type { Media } from "@bitblitz/schema";
import { mediaUrl } from "../lib/api";

export function QuestionMedia({ media, code, large = false }: { media: Media; code: string; large?: boolean }) {
  if (media.type === "image") {
    return (
      <img
        src={mediaUrl(code, media.src)}
        alt={media.alt}
        className={`mx-auto rounded-2xl bg-white/5 object-contain ${large ? "max-h-[30vh]" : "max-h-48"}`}
      />
    );
  }
  return (
    <figure className="mx-auto w-full max-w-3xl">
      <figcaption className="mb-1 text-left text-xs font-semibold uppercase tracking-widest text-muted">{media.language}</figcaption>
      <pre className={`overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-left font-mono leading-relaxed text-ink ${large ? "text-xl" : "text-sm"}`}>
        <code>{media.source}</code>
      </pre>
    </figure>
  );
}
