import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

// Text-to-speech for the narrated walkthrough. macOS uses its built-in `say` voice. Anywhere
// else, install Piper (`pip install piper-tts` in a venv, https://github.com/rhasspy/piper),
// set BITBLITZ_PIPER_PYTHON to that venv's python and BITBLITZ_PIPER_VOICE to a voice .onnx
// file. Each line becomes one audio file; demo-mux.py places them on the video's timeline.

export type Narration = { file: string; ms: number };

const piperPython = process.env.BITBLITZ_PIPER_PYTHON;
const piperVoice = process.env.BITBLITZ_PIPER_VOICE;

/** Speaks `text` into `${fileBase}.aiff` (macOS) or `${fileBase}.wav` (Piper), and returns its length. */
export async function narrate(text: string, fileBase: string, macVoice: string): Promise<Narration> {
  if (piperPython) {
    const file = `${fileBase}.wav`;
    await piper().speak(text, file);
    return { file, ms: durationMs(file) };
  }
  const file = `${fileBase}.aiff`;
  execFileSync("say", ["-v", macVoice, "-r", "182", "-o", file, text]);
  return { file, ms: durationMs(file) };
}

/** Stops the Piper process, if one was started. */
export function stopNarrator(): void {
  piperProcess?.child.stdin.end();
}

// One Piper process for the whole recording: loading the voice per line took about two
// seconds each time, while the game clocks on screen kept running.
let piperProcess: { child: ChildProcessWithoutNullStreams; speak: (text: string, file: string) => Promise<void> } | null = null;

function piper() {
  if (piperProcess) return piperProcess;
  if (!piperVoice) throw new Error("BITBLITZ_PIPER_PYTHON is set but BITBLITZ_PIPER_VOICE (a voice .onnx file) is not");
  const script = fileURLToPath(new URL("piper-speak.py", import.meta.url));
  const child = spawn(piperPython!, ["-I", script, piperVoice]);
  const waiting: (() => void)[] = [];
  let ready: () => void;
  const started = new Promise<void>((resolve) => (ready = resolve));
  createInterface({ input: child.stdout }).on("line", (line) => {
    const reply = JSON.parse(line) as { ready?: true; file?: string };
    if (reply.ready) ready();
    else waiting.shift()?.();
  });
  child.on("exit", (code) => {
    if (code !== 0) console.error(`Piper exited with code ${code}`);
  });
  const speak = async (text: string, file: string) => {
    await started;
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
      child.stdin.write(`${JSON.stringify({ text, file })}\n`);
    });
  };
  piperProcess = { child, speak };
  return piperProcess;
}

function durationMs(file: string): number {
  const seconds = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return Number(seconds) * 1000;
}
