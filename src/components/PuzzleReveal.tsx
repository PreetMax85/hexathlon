"use client";

import {
  CANDIDATE_LABELS,
  describeEvent,
  generate,
  pipFlashRanking,
  portMathRoute,
  replayHand,
  RESOURCES,
  type Format,
  type RushItem,
} from "@/engine";
import { RESOURCE_META } from "@/game/meta";
import { relaxPuzzle } from "@/game/relaxed";
import { tradeText, verdict } from "@/game/verdict";
import { Board } from "./Board";
import { BOARD_BLEED, CornerButtons } from "./PipFlashPlay";
import { Buoy, Glyph } from "./glyphs";

interface Props {
  format: Format;
  item: RushItem;
  index: number;
  answer: unknown;
  ms: number;
  relaxed?: boolean;
}

/** A finished puzzle replayed from its seed: what was asked, what was right, and why. */
export function PuzzleReveal({ format, item, index, answer, ms, relaxed }: Props) {
  const base = generate(format, item.tier, item.seed);
  const puzzle = relaxed ? relaxPuzzle(base) : base;
  const v = verdict(puzzle, answer, ms);
  return (
    <div className="anim-slide -mx-4 flex flex-col gap-3 border-y border-hair bg-deep px-4 py-3 sm:mx-0 sm:px-3">
      <div className="flex items-center gap-3">
        <Buoy kind={v.correct ? "cone" : "can"} size={30} />
        <div className="min-w-0">
          <div className="font-bold">
            Puzzle {index + 1} <span className="sea font-normal text-ink-2">({item.tier})</span>
            <span className={v.correct ? "text-green" : "text-red"}> · {v.title}</span>
          </div>
          <div className="text-s">{v.detail}</div>
        </div>
      </div>
      {puzzle.format === "pip-flash" && (() => {
        const ranking = pipFlashRanking(puzzle.board, puzzle.candidates);
        const picked = typeof answer === "number" ? answer : null;
        const reveal = { totals: ranking.totals, best: ranking.best, picked };
        return (
          <>
            <Board
              board={puzzle.board}
              candidates={puzzle.candidates}
              reveal={reveal}
              className={BOARD_BLEED}
              label={`Board of puzzle ${index + 1}: corner ${CANDIDATE_LABELS[ranking.best]} had the most pips`}
            />
            <CornerButtons count={puzzle.candidates.length} reveal={reveal} />
          </>
        );
      })()}
      {puzzle.format === "port-math" && (
        <ol className="sea flex flex-col gap-1 text-s">
          {portMathRoute(puzzle).map((t, i) => (
            <li key={i}>
              {i + 1}. {tradeText(puzzle, t)}
            </li>
          ))}
        </ol>
      )}
      {puzzle.format === "hand-tracker" && (() => {
        const hands = replayHand(puzzle);
        const final = hands ? hands[hands.length - 1] : puzzle.startHand;
        return (
          <>
            <ul className="grid grid-cols-5 border-y border-hair text-center">
              {RESOURCES.map((r) => (
                <li key={r} className={`flex flex-col items-center py-1.5 ${puzzle.questions.includes(r) ? "bg-shoal-2" : ""}`}>
                  <Glyph name={r} size={18} className="text-ink-2" />
                  <span className="font-bold">{final[r]}</span>
                  <span className="sr-only">{RESOURCE_META[r].label}</span>
                </li>
              ))}
            </ul>
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-s font-semibold text-accent">Read the whole log</summary>
              <ol className="flex list-decimal flex-col gap-1 pl-6 text-s">
                {puzzle.events.map((e, i) => (
                  <li key={i}>{describeEvent(e)}</li>
                ))}
              </ol>
            </details>
          </>
        );
      })()}
    </div>
  );
}
