import { motion } from "motion/react";
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
  /** "projector-compact" keeps tiles short when an image shares the screen. */
  size?: "projector" | "projector-compact" | "device";
  multi?: boolean;
};

export function AnswerTile({ index, text, correct, selected, count, onPress, disabled, size: requested = "device", multi }: Props) {
  const style = tile(index);
  const compact = requested === "projector-compact";
  const size = compact ? "projector" : requested;
  const revealed = correct !== undefined;
  const dim = revealed && !correct;
  const label = `Answer ${index + 1}, ${style.colorName} ${style.shapeName}${text ? `: ${text}` : ""}${
    revealed ? (correct ? ", correct" : ", not correct") : ""
  }${selected ? ", selected" : ""}`;

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-xl bg-black/20 ${size === "projector" ? (compact ? "h-12 w-12 text-2xl" : "h-14 w-14 text-3xl lg:h-20 lg:w-20 lg:text-5xl") : "h-11 w-11 text-2xl"}`}
      >
        {style.shape}
      </span>
      {text !== null && (
        <span className={`min-w-0 flex-1 break-words text-left font-bold leading-tight ${size === "projector" ? (compact ? "text-2xl lg:text-3xl" : "text-2xl lg:text-5xl") : "text-lg"}`}>
          <MathText text={text} />
        </span>
      )}
      {revealed && (
        <span aria-hidden="true" className="ml-auto text-2xl font-extrabold">
          {correct ? "✓" : ""}
        </span>
      )}
      {count !== undefined && (
        <span
          className={`ml-auto rounded-full bg-black/25 px-3 py-1 font-extrabold tabular-nums ${size === "projector" ? "text-2xl lg:text-4xl" : "text-lg"}`}
          aria-label={`${count} picked this`}
        >
          {count}
        </span>
      )}
      {multi && selected && !revealed && (
        <span aria-hidden="true" className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-xl font-extrabold">
          ✓
        </span>
      )}
    </>
  );

  const className = `relative flex w-full items-center gap-3 rounded-2xl p-3 text-[#0a0a0a] transition-[opacity,transform,box-shadow] ${
    size === "projector" ? (compact ? "min-h-20 px-5" : "min-h-24 px-5 lg:min-h-36") : text === null ? "min-h-28 justify-center" : "min-h-20"
  } ${dim ? "opacity-30" : ""} ${selected ? "ring-4 ring-white" : ""} ${revealed && correct ? "bb-glow" : ""}`;

  const background = { background: style.color };

  if (!onPress) {
    return (
      <div className={className} style={background} role="listitem" aria-label={label}>
        {content}
      </div>
    );
  }
  return (
    <motion.button
      type="button"
      className={`${className} cursor-pointer disabled:cursor-not-allowed`}
      style={background}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={multi ? Boolean(selected) : undefined}
      whileTap={{ scale: 0.96 }}
    >
      {content}
    </motion.button>
  );
}
