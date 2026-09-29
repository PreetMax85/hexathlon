"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PORT_MATH_CHOICES,
  RESOURCES,
  targetCost,
  tradeRate,
  type PortMathAnswer,
  type PortMathPuzzle,
} from "@/engine";
import { BUILD_LABEL, RESOURCE_META } from "@/game/meta";
import { Glyph } from "./glyphs";
import { usePuzzleClock } from "./useClock";

interface Props {
  puzzle: PortMathPuzzle;
  /** Fired once, with the tapped trade count. */
  onAnswer: (answer: PortMathAnswer, ms: number) => void;
}

/**
 * The hand, the build and the trade rates in one glance, then one tap: how
 * many trades does it take? No clock; time only breaks ties.
 */
export function PortMathPlay({ puzzle, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = useRef(false);
  const done = picked !== null;
  const { ready, clockMs } = usePuzzleClock(done);
  const need = targetCost(puzzle.target);

  const finish = useCallback(
    (n: number) => {
      if (answered.current || ready) return;
      answered.current = true;
      setPicked(n);
      onAnswer(n, clockMs());
    },
    [ready, onAnswer, clockMs],
  );

  // 1–6 keys for laptops.
  useEffect(() => {
    if (done || ready) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if ((PORT_MATH_CHOICES as readonly number[]).includes(n)) finish(n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, ready, finish]);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Build" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="label text-ink-2">Build</span>
        {puzzle.target.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-l font-extrabold">
            <Glyph name={b} size={24} />
            {BUILD_LABEL[b]}
          </span>
        ))}
      </section>

      <section aria-label="Your hand" className="grid grid-cols-5 gap-1.5">
        {RESOURCES.map((r) => {
          const rate = tradeRate(puzzle.ports, r);
          const short = need[r] > puzzle.hand[r];
          const meta = RESOURCE_META[r];
          return (
            <div key={r} className="flex flex-col items-center overflow-hidden rounded-md border border-hair bg-deep">
              <div className="flex w-full justify-center py-1.5" style={{ background: meta.fill, color: meta.glyph }}>
                <Glyph name={r} size={22} title={meta.label} />
              </div>
              <span className="pt-1 text-l font-extrabold leading-none" aria-label={`${meta.label}: have ${puzzle.hand[r]}`}>
                {puzzle.hand[r]}
              </span>
              <span className={`text-s ${need[r] === 0 ? "text-ink-2" : short ? "font-bold text-red" : "text-green"}`}>
                {need[r] === 0 ? "–" : `need ${need[r]}`}
              </span>
              <span
                className={`mb-1.5 mt-1 rounded-sm px-1.5 text-s font-bold ${rate < 4 ? "bg-accent text-on-accent" : "text-ink-2"}`}
                aria-label={`trades ${rate} for 1`}
              >
                {rate}:1
              </span>
            </div>
          );
        })}
      </section>

      <section aria-label="Answer" className="flex flex-col gap-2">
        <h2 className="font-bold">Fewest trades to build it?</h2>
        <div className="grid grid-cols-6 gap-2">
          {PORT_MATH_CHOICES.map((n) => {
            const right = done && n === puzzle.optimalTrades;
            const wrong = done && n === picked && !right;
            return (
              <button
                key={n}
                type="button"
                disabled={done || ready}
                onClick={() => finish(n)}
                className={`min-h-14 rounded-md border-2 text-l font-extrabold ${
                  right
                    ? "border-green text-green"
                    : wrong
                      ? "border-red text-red"
                      : done
                        ? "border-hair text-ink-2"
                        : "border-ink bg-deep active:bg-shoal-2"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-s text-ink-2">No clock. Time only breaks ties.</p>
      </section>
    </div>
  );
}
