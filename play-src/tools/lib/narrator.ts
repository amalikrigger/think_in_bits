import { execFileSync } from "node:child_process";

// Text-to-speech for the narrated walkthrough. macOS uses its built-in `say` voice. Anywhere
// else, set BITBLITZ_PIPER to a command that runs Piper (https://github.com/rhasspy/piper),
// for example "/path/to/venv/bin/python -m piper", and BITBLITZ_PIPER_VOICE to a voice .onnx
// file. Both write one audio file per line; demo-mux.py places them on the video's timeline.

export type Narration = { file: string; ms: number };

const piper = process.env.BITBLITZ_PIPER;
const piperVoice = process.env.BITBLITZ_PIPER_VOICE;

export const narratorName = piper ? "Piper" : "macOS say";

/** Speaks `text` into `${fileBase}.aiff` (macOS) or `${fileBase}.wav` (Piper), and returns its length. */
export function narrate(text: string, fileBase: string, macVoice: string): Narration {
  if (piper) {
    if (!piperVoice) throw new Error("BITBLITZ_PIPER is set but BITBLITZ_PIPER_VOICE (a voice .onnx file) is not");
    const [command, ...args] = piper.split(" ").filter(Boolean);
    const file = `${fileBase}.wav`;
    execFileSync(command!, [...args, "-m", piperVoice, "-f", file], { input: text, stdio: ["pipe", "ignore", "ignore"] });
    return { file, ms: durationMs(file) };
  }
  const file = `${fileBase}.aiff`;
  execFileSync("say", ["-v", macVoice, "-r", "182", "-o", file, text]);
  return { file, ms: durationMs(file) };
}

function durationMs(file: string): number {
  const seconds = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return Number(seconds) * 1000;
}
