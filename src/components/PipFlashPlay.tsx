"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANDIDATE_LABELS, pipFlashRanking, type PipFlashAnswer, type PipFlashPuzzle } from "@/engine";
import { useReducedMotion } from "@/game/browser";
import { Board, type BoardReveal } from "./Board";
import { Buoy } from "./glyphs";
import { usePuzzleClock } from "./useClock";

/** Pip totals per corner, read below the plate so no label sits on a token. */
export function PipLegend({ reveal }: { reveal: BoardReveal }) {
  const order = reveal.totals.map((_, i) => i).sort((a, b) => reveal.totals[b] - reveal.totals[a]);
  return (
    <ul className="anim-pop flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-y border-hair py-1.5" aria-label="Pips per corner">
      {order.map((i) => (
        <li key={i} className="flex min-h-7 items-center gap-1 text-s">
          {i === reveal.best ? <Buoy kind="cone" size={20} /> : i === reveal.picked ? <Buoy kind="can" size={20} /> : null}
          <b>{CANDIDATE_LABELS[i]}</b>
          <span>{reveal.totals[i]} pips</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  puzzle: PipFlashPuzzle;
  /** Fired once, with the chosen candidate (null on timeout) and clock ms. */
  onAnswer: (answer: PipFlashAnswer, ms: number) => void;
  /** Untimed mode for the How-to-play demo. */
  untimed?: boolean;
}

export function PipFlashPlay({ puzzle, onAnswer, untimed = false }: Props) {
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
      onAnswer(index, timedOut ? limit : untimed ? clockMs() : Math.min(clockMs(), limit));
    },
    [clockMs, limit, onAnswer, untimed],
  );

  // Taps during the ready beat don't count: the clock hasn't started.
  const pick = (index: number) => {
    if (!ready) finish(index);
  };

  // Timeout counts as wrong.
  useEffect(() => {
    if (!untimed && !done && elapsed >= limit) finish(null, true);
  }, [elapsed, limit, done, untimed, finish]);

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
  const reveal = done
    ? { totals: ranking.totals, best: ranking.best, picked: picked.index }
    : undefined;
  const labels = CANDIDATE_LABELS.slice(0, puzzle.candidates.length);
  const reduced = useReducedMotion();
  // The clock stops on an answer, so this freezes at the time that was left.
  const leftMs = picked?.index === null ? 0 : Math.max(0, limit - elapsed);
  // Reduced motion: the arc steps down once a second instead of sweeping.
  const ring = untimed ? undefined : ready ? 1 : reduced ? Math.ceil(leftMs / 1000) / Math.ceil(limit / 1000) : leftMs / limit;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-bold">Which corner touches the most pips?</h2>
          <p className="text-s text-ink-2">
            Tap {labels[0]}–{labels[labels.length - 1]}. Desert counts 0.
          </p>
        </div>
        {!untimed && (
          <div
            className={`shrink-0 text-right ${leftMs < limit * 0.3 && !ready ? "text-red" : "text-ink"}`}
            role="timer"
            aria-label={ready ? "Ready" : `${Math.ceil(leftMs / 1000)} seconds left`}
          >
            <span className="label block text-ink-2">{ready ? "Steady" : "Time left"}</span>
            <span className="text-l font-bold condensed">{(leftMs / 1000).toFixed(1)}</span>
            <span className="text-s"> s</span>
          </div>
        )}
      </div>
      <Board
        board={puzzle.board}
        candidates={puzzle.candidates}
        onPick={pick}
        reveal={reveal}
        ring={ring}
        className="mx-auto w-full max-w-[36rem]"
        label="Board with lettered corners"
      />
      {reveal && <PipLegend reveal={reveal} />}
    </div>
  );
}
