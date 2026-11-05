import { formatProblems, validateQuizText, type Quiz, type QuizProblem } from "@bitblitz/schema";
import { useMemo, useState, type DragEvent } from "react";
import { BrandBar } from "../components/BrandBar";
import { MathText } from "../components/MathText";
import { Screen } from "../components/Screen";
import { createGame, uploadMedia } from "../lib/api";
import type { HostGame } from "../lib/storage";
import { tile } from "../lib/tiles";

// Upload is the only authoring path: Claude writes the JSON, the teacher drops it here,
// sees plain-language problems or a full preview, attaches any images, and creates the game.

const samples = import.meta.glob<string>("../../../../samples/*.json", { eager: true, query: "?raw", import: "default" });

type Loaded = { name: string; text: string } | null;

export function UploadScreen({
  token,
  onCreated,
  onLoggedOut,
}: {
  token: string;
  onCreated: (game: HostGame) => void;
  onLoggedOut: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; problems?: QuizProblem[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  // The game exists but some images didn't make it: say so before opening it, otherwise the
  // message would vanish the moment the lobby appears.
  const [created, setCreated] = useState<{ game: HostGame; failed: string[] } | null>(null);

  const validation = useMemo(() => (loaded ? validateQuizText(loaded.text) : null), [loaded]);
  const quiz = validation?.ok ? validation.quiz : null;
  const neededImages = useMemo(() => (quiz ? localImages(quiz) : []), [quiz]);
  const missingImages = neededImages.filter((name) => !images.some((f) => f.name === name));

  async function readFile(file: File) {
    setServerError(null);
    setCreated(null);
    setLoaded({ name: file.name, text: await file.text() });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const files = [...event.dataTransfer.files];
    const json = files.find((f) => f.name.endsWith(".json"));
    if (json) void readFile(json);
    const pictures = files.filter((f) => f.type.startsWith("image/"));
    if (pictures.length) setImages((current) => mergeFiles(current, pictures));
  }

  async function create() {
    if (!loaded || !quiz || busy) return;
    setBusy(true);
    setServerError(null);
    const result = await createGame(token, JSON.parse(loaded.text));
    if (!result.ok) {
      setBusy(false);
      if (result.loggedOut) return onLoggedOut();
      return setServerError({ message: result.message, problems: result.problems });
    }
    const game = { code: result.code, hostKey: result.hostKey };
    const uploads = await Promise.all(images.map(async (file) => ({ name: file.name, ok: await uploadMedia(game.code, game.hostKey, file) })));
    setBusy(false);
    const failed = uploads.filter((u) => !u.ok).map((u) => u.name);
    if (failed.length === 0) return onCreated(game);
    setCreated({ game, failed });
  }

  return (
    <Screen header={<BrandBar />} mainClassName="mx-auto w-full max-w-4xl px-4">
      <h1 className="mb-1 mt-2 text-3xl font-extrabold sm:text-4xl">Upload a quiz</h1>
      <p className="mb-6 text-muted">
        A BitBlitz quiz is a JSON file. Ask Claude to make one from a lesson with the <code>bitblitz-quiz</code> skill.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Moving over a child fires dragleave on the parent; only a real exit ends the highlight.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className={`bb-card flex flex-col items-center gap-4 border-2 border-dashed p-6 text-center sm:p-8 ${dragging ? "border-primary bb-glow" : "border-white/15"}`}
      >
        <p className="text-lg font-semibold">Drop a quiz .json (and its images) here</p>
        <div className="flex flex-wrap justify-center gap-3">
          <label className="bb-btn bb-btn-primary">
            Choose file
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </label>
          <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setPasting((p) => !p)} aria-expanded={pasting}>
            {pasting ? "Hide paste box" : "Paste JSON"}
          </button>
        </div>
        {Object.keys(samples).length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">Or try a practice sample:</span>
            {Object.entries(samples).map(([path, text]) => {
              const name = path.split("/").pop()!;
              return (
                <button
                  key={path}
                  type="button"
                  className="bb-btn bb-btn-quiet bb-btn-sm"
                  onClick={() => {
                    setServerError(null);
                    setCreated(null);
                    setLoaded({ name, text });
                  }}
                >
                  {name.replace(/\.json$/, "")}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pasting && (
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="paste" className="font-semibold">
            Quiz JSON
          </label>
          <textarea id="paste" className="bb-input min-h-48 py-3 font-mono text-sm" value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} />
          <button
            type="button"
            className="bb-btn bb-btn-primary self-start"
            onClick={() => {
              setServerError(null);
              setCreated(null);
              setLoaded({ name: "pasted quiz", text: pasted });
            }}
            disabled={!pasted.trim()}
          >
            Check it
          </button>
        </div>
      )}

      {validation && !validation.ok && (
        <section role="alert" className="bb-card mt-6 border-coral/40 p-6">
          <h2 className="mb-3 text-xl font-bold text-coral">
            {loaded?.name}: {validation.problems.length} problem{validation.problems.length === 1 ? "" : "s"} to fix
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            {formatProblems(validation.problems).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {quiz && (
        <section className="mt-6 flex flex-col gap-4">
          <div className="bb-card flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold [overflow-wrap:anywhere]">{quiz.title}</h2>
              <p className="text-muted">
                {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
                {quiz.description ? ` · ${quiz.description}` : ""}
              </p>
            </div>
            <button type="button" className="bb-btn bb-btn-primary" onClick={create} disabled={busy || created !== null} aria-busy={busy}>
              {busy ? "Creating…" : "Create game"}
            </button>
          </div>

          {created && (
            <div role="alert" className="bb-card border-coral/40 p-6">
              <p className="font-bold text-coral">
                The game was created, but {created.failed.length === 1 ? "this image" : "these images"} failed to upload: {created.failed.join(", ")}. Images must be PNG, JPEG, GIF, WebP or SVG, up to 1 MB each.
              </p>
              <p className="mt-1 text-muted">Those questions will show their alt text instead.</p>
              <button type="button" className="bb-btn bb-btn-primary mt-4" onClick={() => onCreated(created.game)}>
                Open the game anyway
              </button>
            </div>
          )}

          {neededImages.length > 0 && (
            <div className="bb-card p-6">
              <h3 className="mb-2 text-lg font-bold">Images this quiz uses</h3>
              <ul className="mb-3 flex flex-wrap gap-2">
                {neededImages.map((name) => (
                  <li key={name} className={`rounded-full px-3 py-1 text-sm font-semibold ${missingImages.includes(name) ? "bg-coral/20 text-coral" : "bg-teal/20 text-teal"}`}>
                    {missingImages.includes(name) ? "missing" : "✓"} {name}
                  </li>
                ))}
              </ul>
              <label className="bb-btn bb-btn-ghost">
                Attach images
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  multiple
                  className="sr-only"
                  onChange={(e) => setImages((current) => mergeFiles(current, [...(e.target.files ?? [])]))}
                />
              </label>
              {missingImages.length > 0 && <p className="mt-2 text-sm text-muted">You can still create the game; missing images show their alt text.</p>}
            </div>
          )}

          {serverError && (
            <div role="alert" className="bb-card border-coral/40 p-6 text-coral">
              <p className="font-bold">{serverError.message}</p>
              {serverError.problems && (
                <ul className="mt-2 list-disc pl-6">
                  {formatProblems(serverError.problems).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ol className="flex flex-col gap-3" aria-label="Preview (only you see the answers)">
            {quiz.questions.map((question, i) => (
              <li key={i} className="bb-card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
                  <span className="text-ink">Q{i + 1}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">{TYPE_LABEL[question.type]}</span>
                  <span>{question.timeLimitSec ?? quiz.defaults.timeLimitSec}s</span>
                  {(question.points ?? quiz.defaults.points) !== "standard" && (
                    <span className="rounded-full bg-violet/20 px-2 py-0.5 text-violet">{question.points ?? quiz.defaults.points} points</span>
                  )}
                  {question.media && <span>· {question.media.type}</span>}
                </div>
                <p className="mb-3 text-lg font-semibold [overflow-wrap:anywhere]">
                  <MathText text={question.prompt} />
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {(question.type === "true_false"
                    ? [
                        { text: "True", correct: question.correct },
                        { text: "False", correct: !question.correct },
                      ]
                    : question.answers
                  ).map((answer, j) => (
                    <li key={j} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${answer.correct ? "bg-teal/15 font-bold" : "bg-white/5"}`}>
                      <span aria-hidden="true" style={{ color: tile(j).color }}>
                        {tile(j).shape}
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        <MathText text={answer.text} />
                      </span>
                      {answer.correct && <span className="ml-auto shrink-0 text-teal">✓ correct</span>}
                    </li>
                  ))}
                </ul>
                {question.explanation && (
                  <p className="mt-3 text-sm text-muted">
                    Explanation: <MathText text={question.explanation} />
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </Screen>
  );
}

const TYPE_LABEL = { single: "Single choice", multi: "Multi-select", true_false: "True / false" } as const;

function localImages(quiz: Quiz): string[] {
  const names = quiz.questions.flatMap((q) => (q.media?.type === "image" && !/^https?:\/\//.test(q.media.src) ? [q.media.src] : []));
  return [...new Set(names)];
}

function mergeFiles(current: File[], added: File[]): File[] {
  const byName = new Map(current.map((f) => [f.name, f]));
  for (const file of added) byName.set(file.name, file);
  return [...byName.values()];
}
