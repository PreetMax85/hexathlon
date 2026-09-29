import type { Verdict } from "@/game/verdict";
import { Buoy } from "./glyphs";
import { Button } from "./ui";

interface Props {
  verdict: Verdict;
  /** Label of the continue button; omit to hide it (demo mode). */
  action?: string;
  onNext?: () => void;
  /** Pause before the next puzzle; only offered between puzzles. */
  onPause?: () => void;
  /** When set, the next puzzle starts by itself after this long; the button drains to show it. */
  glideMs?: number | null;
  /** Render in the flow instead of as a sticky bottom bar. */
  inline?: boolean;
}

/** After an answer: the buoy, the explanation and the next step. Calm either way. */
export function Feedback({ verdict, action, onNext, onPause, glideMs, inline }: Props) {
  const ok = verdict.correct;
  return (
    <div
      role="status"
      className={`anim-slide bg-deep ${
        inline
          ? "border-y border-ink p-3"
          : "sticky bottom-0 -mx-4 mt-1 border-t-2 border-ink px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]"
      }`}
    >
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2">
        <Buoy kind={ok ? "cone" : "can"} size={34} />
        <div className="min-w-0 flex-1">
          <div className={`font-bold ${ok ? "text-green" : "text-red"}`}>{verdict.title}</div>
          <div className="text-s leading-snug text-ink">{verdict.detail}</div>
        </div>
        {(onPause || (action && onNext)) && (
          <div className="flex shrink-0 gap-2">
            {onPause && (
              <Button variant="secondary" onClick={onPause} className="px-3" aria-label="Pause before the next puzzle">
                Pause
              </Button>
            )}
            {action && onNext && (
              <Button onClick={onNext} className="relative overflow-hidden px-4">
                {action}
                {glideMs != null && (
                  <span
                    aria-hidden
                    className="anim-glide absolute inset-x-0 bottom-0 h-1 origin-left bg-accent"
                    style={{ animationDuration: `${glideMs}ms` }}
                  />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
