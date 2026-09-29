import type { Verdict } from "@/game/verdict";
import { Button } from "./ui";

interface Props {
  verdict: Verdict;
  /** Label of the continue button; omit to hide it (demo mode). */
  action?: string;
  onNext?: () => void;
  /** True while a correct answer is about to auto-advance. */
  autoAdvance?: boolean;
  /** Render as a card in the flow instead of a sticky bottom bar. */
  inline?: boolean;
}

/** Bottom bar after an answer: ✓/✗, the explanation and the next step. */
export function Feedback({ verdict, action, onNext, autoAdvance, inline }: Props) {
  const ok = verdict.correct;
  return (
    <div
      role="status"
      className={`anim-slide ${
        inline
          ? "rounded-2xl border p-3"
          : "sticky bottom-0 -mx-4 mt-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      } ${ok ? "border-good/30 bg-good-bg" : "border-bad/30 bg-bad-bg"}`}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full text-xl font-black text-white"
          style={{ background: ok ? "#16a34a" : "#dc2626" }}
        >
          {ok ? "✓" : "✗"}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-extrabold ${ok ? "text-good" : "text-bad"}`}>{verdict.title}</div>
          <div className="text-sm leading-snug text-ink">{verdict.detail}</div>
        </div>
        {action && onNext && (
          <Button onClick={onNext} className="shrink-0 px-4">
            {action}
            {autoAdvance ? " →" : ""}
          </Button>
        )}
      </div>
    </div>
  );
}
