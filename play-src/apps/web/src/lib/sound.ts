import type { Phase, QuizMusic } from "@bitblitz/schema";
import { useEffect, useRef } from "react";
import { mediaUrl } from "./api";

// Music slots. The quiz JSON names a file per slot (uploaded with the quiz); Amali supplies
// the real tracks later, so today every slot is a silent placeholder unless a file is named.
// Only the projector plays sound: thirty phones playing music at once helps nobody.

const SLOT_FOR_PHASE: Partial<Record<Phase, keyof QuizMusic>> = {
  lobby: "lobby",
  countdown: "question",
  question: "question",
  podium: "podium",
};

export function useSound(
  code: string,
  phase: Phase | null,
  music: QuizMusic | null,
  uploaded: readonly string[],
  soundOn: boolean,
  musicOn: boolean,
) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef<string | null>(null);

  useEffect(() => {
    const slot = phase ? SLOT_FOR_PHASE[phase] : undefined;
    const named = slot && music ? music[slot] : undefined;
    // A slot naming a file that was never uploaded is a placeholder: stay silent.
    const file = named && (/^https?:\/\//.test(named) || uploaded.includes(named)) ? named : undefined;
    const src = soundOn && musicOn && file ? mediaUrl(code, file) : null;
    if (src === current.current) return;
    audio.current?.pause();
    audio.current = null;
    current.current = src;
    if (!src) return;
    const element = new Audio(src);
    element.loop = slot !== "podium";
    element.volume = 0.5;
    // Browsers block autoplay until the teacher has clicked something; that's fine.
    element.play().catch(() => undefined);
    audio.current = element;
  }, [code, phase, music, uploaded, soundOn, musicOn]);

  useEffect(() => () => audio.current?.pause(), []);
}
