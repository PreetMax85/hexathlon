"use client";

import { useRef, useState } from "react";
import {
  RESOURCES,
  targetCost,
  tradeRate,
  type PortMathAnswer,
  type PortMathPuzzle,
  type Resource,
} from "@/engine";
import { BUILD_LABEL, RESOURCE_META } from "@/game/meta";
import {
  addTrade,
  canBuild,
  canGive,
  currentHand,
  initialTrades,
  shortfall,
  undoTrade,
  type TradeState,
} from "@/game/portMathState";
import { tradeText } from "@/game/verdict";
import { Glyph } from "./glyphs";
import { Button } from "./ui";
import { useConfirm, usePuzzleClock } from "./useClock";

interface Props {
  puzzle: PortMathPuzzle;
  /** Fired once: the trades made, or null when the player skips. */
  onAnswer: (answer: PortMathAnswer | null, ms: number) => void;
}

export function PortMathPlay({ puzzle, onAnswer }: Props) {
  const [state, setState] = useState<TradeState>(initialTrades);
  const [give, setGive] = useState<Resource | null>(null);
  const [done, setDone] = useState(false);
  const answered = useRef(false);
  const { ready, clockMs } = usePuzzleClock(done);
  const locked = done || ready;

  const hand = currentHand(puzzle, state);
  const need = targetCost(puzzle.target);
  const missing = shortfall(puzzle, state);
  const trades = state.trades.length;

  const finish = (answer: PortMathAnswer | null) => {
    if (answered.current) return;
    answered.current = true;
    setDone(true);
    onAnswer(answer, clockMs());
  };
  const skip = useConfirm(() => finish(null));

  const pickGive = (r: Resource) => {
    if (locked || !canGive(puzzle, state, r)) return;
    setGive(give === r ? null : r);
  };
  const pickGet = (r: Resource) => {
    if (locked || !give || give === r) return;
    setState(addTrade(puzzle, state, { give, get: r }));
    setGive(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-bold">Afford the build in the fewest trades.</h2>
        <p className="text-s text-ink-2">Any fewest-trade route counts. No clock: time only breaks ties.</p>
      </div>

      <section aria-label="Target and ports" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-y border-ink py-3">
        <span className="label pt-1 text-ink-2">Build</span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {puzzle.target.map((b, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 font-bold">
              <Glyph name={b} size={20} />
              {BUILD_LABEL[b]}
            </li>
          ))}
        </ul>
        <span className="label pt-0.5 text-ink-2">Ports</span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-s">
          {puzzle.ports.length === 0 ? (
            <li className="sea text-ink-2">None: 4:1 with the bank</li>
          ) : (
            puzzle.ports.map((p) => (
              <li key={p} className="sea inline-flex items-center gap-1 font-bold text-accent">
                {p === "generic" ? (
                  "3:1 any"
                ) : (
                  <>
                    2:1 <Glyph name={p as Resource} size={16} /> {p}
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section aria-label="Hand">
        <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.75rem_4.25rem] items-end gap-x-2 border-b border-ink pb-1 text-ink-2">
          <span className="label min-w-0 truncate">
            {give ? `Give ${tradeRate(puzzle.ports, give)} ${give} for` : "Card"}
          </span>
          <span className="label text-center">Have</span>
          <span className="label text-center">Short</span>
          <span className="label text-center">{give ? "Get 1" : "Trade"}</span>
        </div>
        <ul>
          {RESOURCES.map((r) => {
            const rate = tradeRate(puzzle.ports, r);
            const giving = give === r;
            const lacking = missing[r] > 0;
            return (
              <li
                key={r}
                className={`grid min-h-12 grid-cols-[minmax(0,1fr)_2.5rem_2.75rem_4.25rem] items-center gap-x-2 border-b border-hair ${giving ? "bg-shoal-2" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <Glyph name={r} size={20} className="shrink-0 text-ink-2" />
                  <span className="truncate">{RESOURCE_META[r].label}</span>
                </span>
                <span className="text-center font-bold">{hand[r]}</span>
                <span
                  className={`text-center font-bold ${need[r] === 0 ? "text-ink-2" : lacking ? "text-red" : "text-green"}`}
                  aria-label={need[r] === 0 ? "not needed" : lacking ? `short ${missing[r]}` : "covered"}
                >
                  {need[r] === 0 ? "·" : lacking ? `−${missing[r]}` : "ok"}
                </span>
                {give === null ? (
                  <button
                    type="button"
                    disabled={locked || hand[r] < rate}
                    onClick={() => pickGive(r)}
                    aria-label={`Trade away ${rate} ${r}`}
                    className="min-h-11 w-full bg-deep text-s font-bold ring-1 ring-inset ring-ink disabled:hatch disabled:bg-transparent disabled:text-ink-2 disabled:ring-hair"
                  >
                    <span className="btn-label">give {rate}</span>
                  </button>
                ) : giving ? (
                  <button
                    type="button"
                    onClick={() => setGive(null)}
                    className="min-h-11 w-full bg-ink text-s font-bold text-paper"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => pickGet(r)}
                    aria-label={`Get 1 ${r}`}
                    className="min-h-11 w-full bg-accent text-s font-bold text-on-accent"
                  >
                    get 1
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex min-h-11 items-center justify-between gap-3">
        <p aria-live="polite">
          <span className="label text-ink-2">Trades </span>
          <span className="text-l font-bold condensed">{trades}</span>
        </p>
        <Button
          variant="secondary"
          className="min-h-11 px-4"
          disabled={locked || trades === 0}
          onClick={() => {
            setState(undoTrade(state));
            setGive(null);
            skip.disarm();
          }}
        >
          Undo
        </Button>
      </div>

      {trades > 0 && (
        <ol className="sea flex flex-wrap gap-x-3 gap-y-1 text-s text-ink-2" aria-label="Trades made">
          {state.trades.map((t, i) => (
            <li key={i}>
              {i + 1}. {tradeText(puzzle, t)}
            </li>
          ))}
        </ol>
      )}

      <Button className="w-full" disabled={locked || !canBuild(puzzle, state)} onClick={() => finish(state.trades)}>
        Build
      </Button>
      {/* Skip sits apart from Undo and asks once more before it counts as wrong. */}
      <div className="flex justify-center">
        <Button variant="ghost" className="min-h-11 px-3" disabled={locked} onClick={skip.press}>
          {skip.armed ? "Skip this puzzle? Tap again" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
