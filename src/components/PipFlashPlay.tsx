"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANDIDATE_LABELS, pipFlashRanking, type PipFlashAnswer, type PipFlashPuzzle } from "@/engine";
import { formatSeconds } from "@/game/time";
import { Board } from "./Board";
import { TimeBar } from "./ui";
import { useElapsed } from "./useClock";

interface Props {
  puzzle: PipFlashPuzzle;
  /** Fired once, with the chosen candidate (null on timeout) and elapsed ms. */
  onAnswer: (answer: PipFlashAnswer, ms: number) => void;
  /** Untimed mode for the How-to-play demo. */
  untimed?: boolean;
}

export function PipFlashPlay({ puzzle, onAnswer, untimed = false }: Props) {
  const [picked, setPicked] = useState<{ index: number | null } | null>(null);
  const start = useRef<number | null>(null);
  const answered = useRef(false);
  const done = picked !== null;
  const elapsed = useElapsed(!done && !untimed);
  const limit = puzzle.timeLimitMs;

  const finish = useCallback(
    (index: number | null) => {
      if (answered.current) return;
      answered.current = true;
      const spent = performance.now() - (start.current ?? performance.now());
      setPicked({ index });
      onAnswer(index, index === null ? limit : untimed ? spent : Math.min(spent, limit));
    },
    [limit, onAnswer, untimed],
  );

  useEffect(() => {
    start.current = performance.now();
  }, []);

  // Timeout counts as wrong.
  useEffect(() => {
    if (!untimed && !done && elapsed >= limit) finish(null);
  }, [elapsed, limit, done, untimed, finish]);

  // A–F keys for laptops.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const i = CANDIDATE_LABELS.indexOf(e.key.toUpperCase() as (typeof CANDIDATE_LABELS)[number]);
      if (i >= 0 && i < puzzle.candidates.length) finish(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, finish, puzzle.candidates.length]);

  const ranking = pipFlashRanking(puzzle.board, puzzle.candidates);
  const reveal = done
    ? { totals: ranking.totals, best: ranking.best, picked: picked.index }
    : undefined;
  const labels = CANDIDATE_LABELS.slice(0, puzzle.candidates.length);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-bold leading-tight">Which corner touches the most pips?</h2>
        <p className="text-sm text-muted">
          Add the dots on the hexes around each corner. Tap {labels[0]}–{labels[labels.length - 1]}. Desert counts 0.
        </p>
      </div>
      {!untimed && (
        <TimeBar
          fraction={1 - elapsed / limit}
          label={formatSeconds(Math.max(0, limit - elapsed))}
        />
      )}
      <Board
        board={puzzle.board}
        candidates={puzzle.candidates}
        onPick={finish}
        reveal={reveal}
        className="mx-auto w-full max-w-[34rem]"
        label="Board with lettered corners"
      />
    </div>
  );
}
