"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANDIDATE_LABELS, pipFlashRanking, type PipFlashAnswer, type PipFlashPuzzle } from "@/engine";
import { useReducedMotion } from "@/game/browser";
import { Board, type BoardReveal } from "./Board";
import { Buoy } from "./glyphs";
import { usePuzzleClock } from "./useClock";

/** The board runs to the screen's edges on a phone, and sits in the column on wider screens. */
export const BOARD_BLEED = "-mx-4 block w-[calc(100%+2rem)] max-w-none sm:mx-auto sm:w-full sm:max-w-[34rem] sm:rounded-lg";

/** Counts up from 0 to `to` once, so a reveal reads as pips being added; instant with reduced motion. */
function CountUp({ to }: { to: number }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 520);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [to, reduced]);
  return <>{reduced ? to : n}</>;
}

/**
 * One big button per corner, in thumb reach. After the answer they turn into
 * the reveal: each corner's pip total, the best one green, a wrong pick red.
 */
export function CornerButtons({
  count,
  onPick,
  reveal,
  disabled,
}: {
  count: number;
  onPick?: (index: number) => void;
  reveal?: BoardReveal;
  disabled?: boolean;
}) {
  return (
    <ul
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      aria-label={reveal ? "Pips per corner" : "Answer"}
    >
      {Array.from({ length: count }, (_, i) => {
        const best = reveal?.best === i;
        const wrong = reveal && reveal.picked === i && !best;
        const tone = best
          ? "border-green bg-deep text-green"
          : wrong
            ? "border-red bg-deep text-red"
            : reveal
              ? "border-hair text-ink-2"
              : "border-ink bg-deep text-ink active:bg-shoal-2";
        return (
          <li key={i}>
            <button
              type="button"
              disabled={!!reveal || disabled || !onPick}
              onClick={() => onPick?.(i)}
              aria-label={reveal ? `${CANDIDATE_LABELS[i]}: ${reveal.totals[i]} pips${best ? ", the most" : ""}${wrong ? ", your pick" : ""}` : `Corner ${CANDIDATE_LABELS[i]}`}
              className={`flex min-h-14 w-full flex-col items-center justify-center rounded-md border-2 font-extrabold ${tone}`}
            >
              <span className="flex items-center gap-1 text-l leading-none">
                {best && <Buoy kind="cone" size={18} />}
                {wrong && <Buoy kind="can" size={18} />}
                {CANDIDATE_LABELS[i]}
              </span>
              {reveal && (
                <span className="text-s font-semibold tabular-nums">
                  <CountUp to={reveal.totals[i]} /> pips
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The clock as a bar that drains left to right; red in the last 30%. */
function TimeBar({ fraction, ready, seconds }: { fraction: number; ready: boolean; seconds: number }) {
  const low = !ready && fraction < 0.3;
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={ready ? "Ready" : `${Math.ceil(seconds)} seconds left`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-hair">
        <div
          className={`h-full rounded-full ${low ? "bg-red" : "bg-accent"}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
      <span className={`w-14 text-right font-bold condensed ${low ? "text-red" : ""}`}>
        {ready ? "Steady" : `${seconds.toFixed(1)} s`}
      </span>
    </div>
  );
}

interface Props {
  puzzle: PipFlashPuzzle;
  /** Fired once, with the chosen candidate (null on timeout) and clock ms. */
  onAnswer: (answer: PipFlashAnswer, ms: number) => void;
}

export function PipFlashPlay({ puzzle, onAnswer }: Props) {
  const [picked, setPicked] = useState<{ index: number | null } | null>(null);
  const answered = useRef(false);
  const done = picked !== null;
  const { ready, elapsed, clockMs } = usePuzzleClock(done);
  const limit = puzzle.timeLimitMs;

  const finish = useCallback(
    (index: number | null, timedOut = false) => {
      if (answered.current) return;
      answered.current = true;
      setPicked({ index });
      onAnswer(index, timedOut ? limit : Math.min(clockMs(), limit));
    },
    [clockMs, limit, onAnswer],
  );

  // Taps during the ready beat don't count: the clock hasn't started.
  const pick = (index: number) => {
    if (!ready) finish(index);
  };

  // Timeout counts as wrong.
  useEffect(() => {
    if (!done && elapsed >= limit) finish(null, true);
  }, [elapsed, limit, done, finish]);

  // A–F keys for laptops.
  useEffect(() => {
    if (done || ready) return;
    const onKey = (e: KeyboardEvent) => {
      const i = CANDIDATE_LABELS.indexOf(e.key.toUpperCase() as (typeof CANDIDATE_LABELS)[number]);
      if (i >= 0 && i < puzzle.candidates.length) finish(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, ready, finish, puzzle.candidates.length]);

  const ranking = pipFlashRanking(puzzle.board, puzzle.candidates);
  const reveal = done ? { totals: ranking.totals, best: ranking.best, picked: picked.index } : undefined;
  const reduced = useReducedMotion();
  // The clock stops on an answer, so this freezes at the time that was left.
  const leftMs = picked?.index === null ? 0 : Math.max(0, limit - elapsed);
  // Reduced motion: the bar steps down once a second instead of draining.
  const fraction = ready ? 1 : reduced ? Math.ceil(leftMs / 1000) / Math.ceil(limit / 1000) : leftMs / limit;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-bold">Which corner touches the most pips?</h2>
      <TimeBar fraction={fraction} ready={ready} seconds={leftMs / 1000} />
      <Board
        board={puzzle.board}
        candidates={puzzle.candidates}
        onPick={pick}
        reveal={reveal}
        className={BOARD_BLEED}
        label="Board with lettered corners"
      />
      <CornerButtons count={puzzle.candidates.length} onPick={pick} reveal={reveal} disabled={ready} />
    </div>
  );
}
