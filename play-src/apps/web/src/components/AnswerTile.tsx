import { motion } from "motion/react";
import { speakText } from "../lib/math";
import { tile } from "../lib/tiles";
import { MathText } from "./MathText";

type Props = {
  index: number;
  text: string | null;
  /** After the reveal: true marks a correct slot, false a wrong one. */
  correct?: boolean;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * "projector" tiles scale with the viewport (see .bb-tile-stage in app.css);
   * "projector-compact" keeps them short when an image shares the screen;
   * "device" is the phone size, "device-dense" for five or six answers on one phone screen.
   */
  size?: "projector" | "projector-compact" | "device" | "device-dense";
  multi?: boolean;
};

export function AnswerTile({ index, text, correct, selected, count, onPress, disabled, size = "device", multi }: Props) {
  const style = tile(index);
  const projector = size === "projector" || size === "projector-compact";
  const revealed = correct !== undefined;
  const dim = revealed && !correct;
  const shapesOnly = text === null;
  // Screen readers get the tile's name from hidden text: "Answer 1, cyan triangle:", the answer
  // in words (speakText: a button's name is plain text, and Chrome leaves KaTeX's MathML out
  // of it, so raw TeX or silence were the alternatives), then the tile's state.
  const spokenPrefix = `Answer ${index + 1}, ${style.colorName} ${style.shapeName}${shapesOnly ? "" : ": "}`;
  const spokenState = `${revealed ? (correct ? ", correct" : ", not correct") : ""}${selected ? ", selected" : ""}`;

  const shapeClass = projector
    ? "bb-tile-shape"
    : shapesOnly
      ? "h-16 w-16 text-4xl"
      : size === "device-dense"
        ? "h-9 w-9 text-lg"
        : "h-11 w-11 text-2xl";

  const content = (
    <>
      <span className="sr-only">{spokenPrefix}</span>
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-xl bg-black/20 ${shapeClass}`}>
        {style.shape}
      </span>
      {!shapesOnly && (
        <>
          <span
            aria-hidden="true"
            className={`min-w-0 flex-1 break-words text-left font-bold leading-tight ${projector ? "" : size === "device-dense" ? "text-base" : "text-lg"}`}
          >
            <MathText text={text} />
          </span>
          <span className="sr-only">{speakText(text)}</span>
        </>
      )}
      {revealed && correct && (
        <span aria-hidden="true" className={`ml-auto font-extrabold ${projector ? "bb-tile-count" : "text-2xl"}`}>
          ✓
        </span>
      )}
      {spokenState && <span className="sr-only">{spokenState}</span>}
      {count !== undefined && (
        <>
          <span
            aria-hidden="true"
            className={`${revealed && correct ? "" : "ml-auto"} rounded-full bg-black/25 px-3 py-1 font-extrabold tabular-nums ${projector ? "bb-tile-count" : "text-lg"}`}
          >
            {count}
          </span>
          <span className="sr-only">, {count} picked this</span>
        </>
      )}
      {multi && selected && !revealed && (
        <span aria-hidden="true" className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/30 text-xl font-extrabold">
          ✓
        </span>
      )}
    </>
  );

  const sizeClass = projector
    ? `bb-tile-stage ${size === "projector-compact" ? "bb-tile-stage-compact" : ""}`
    : shapesOnly
      ? "min-h-28 justify-center p-3"
      : size === "device-dense"
        ? "min-h-14 p-2.5"
        : "min-h-20 p-3";

  const className = `relative flex w-full items-center gap-3 rounded-2xl text-[#0a0a0a] transition-[opacity,transform,box-shadow] ${sizeClass} ${
    dim ? "opacity-40" : ""
  } ${selected ? "ring-4 ring-white" : ""} ${revealed && correct ? "bb-glow" : ""}`;

  const background = { background: style.color };

  if (!onPress) {
    return (
      <div className={className} style={background} role="listitem">
        {content}
      </div>
    );
  }
  return (
    <motion.button
      type="button"
      className={`${className} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
      style={background}
      onClick={onPress}
      disabled={disabled}
      aria-pressed={multi ? Boolean(selected) : undefined}
      whileTap={disabled ? undefined : { scale: 0.96 }}
    >
      {content}
    </motion.button>
  );
}
