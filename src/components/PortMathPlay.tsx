"use client";

import { useEffect, useRef, useState } from "react";
import {
  RESOURCES,
  targetCost,
  tradeRate,
  type PortMathAnswer,
  type PortMathPuzzle,
  type Resource,
} from "@/engine";
import { BUILD_EMOJI, BUILD_LABEL, RESOURCE_META } from "@/game/meta";
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
import { Button } from "./ui";

interface Props {
  puzzle: PortMathPuzzle;
  /** Fired once: the trades made, or null when the player skips. */
  onAnswer: (answer: PortMathAnswer | null, ms: number) => void;
}

function portLabel(kind: string) {
  return kind === "generic" ? "3:1 any" : `2:1 ${RESOURCE_META[kind as Resource].emoji} ${kind}`;
}

export function PortMathPlay({ puzzle, onAnswer }: Props) {
  const [state, setState] = useState<TradeState>(initialTrades);
  const [give, setGive] = useState<Resource | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef<number | null>(null);
  const answered = useRef(false);
  useEffect(() => {
    started.current = performance.now();
  }, []);

  const hand = currentHand(puzzle, state);
  const need = targetCost(puzzle.target);
  const missing = shortfall(puzzle, state);
  const ready = canBuild(puzzle, state);
  const trades = state.trades.length;

  const finish = (answer: PortMathAnswer | null) => {
    if (answered.current) return;
    answered.current = true;
    setDone(true);
    onAnswer(answer, performance.now() - (started.current ?? performance.now()));
  };

  const pickGive = (r: Resource) => {
    if (done || !canGive(puzzle, state, r)) return;
    setGive(give === r ? null : r);
  };
  const pickGet = (r: Resource) => {
    if (done || !give || give === r) return;
    setState(addTrade(puzzle, state, { give, get: r }));
    setGive(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold leading-tight">Afford the build in the fewest trades.</h2>
        <p className="text-sm text-muted">
          Trade cards with the bank, then press Build. Fewest trades wins; any best route counts.
        </p>
      </div>

      <section aria-label="Target" className="rounded-2xl border border-line bg-surface p-3">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Build</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {puzzle.target.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-semibold">
              <span aria-hidden>{BUILD_EMOJI[b]}</span>
              {BUILD_LABEL[b]}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="font-semibold">Your ports:</span>
          {puzzle.ports.length === 0 ? (
            <span>none (4:1 with the bank)</span>
          ) : (
            puzzle.ports.map((p) => (
              <span key={p} className="rounded-md bg-surface-2 px-2 py-0.5 font-semibold text-ink">
                {portLabel(p)}
              </span>
            ))
          )}
        </div>
      </section>

      <section aria-label="Hand" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-[minmax(0,1fr)_1.75rem_1.75rem_3.75rem] items-center gap-x-1.5 border-b border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          <span>{give ? `Trade away ${tradeRate(puzzle.ports, give)} ${give} for…` : "Resource"}</span>
          <span className="w-full text-center tracking-normal">Now</span>
          <span className="w-full text-center tracking-normal">Need</span>
          <span className="w-[3.75rem] text-center">{give ? "Get 1" : "Trade"}</span>
        </div>
        <ul>
          {RESOURCES.map((r) => {
            const rate = tradeRate(puzzle.ports, r);
            const giving = give === r;
            const lacking = missing[r] > 0;
            return (
              <li
                key={r}
                className={`grid grid-cols-[minmax(0,1fr)_1.75rem_1.75rem_3.75rem] items-center gap-x-1.5 border-b border-line px-3 py-1.5 last:border-b-0 ${giving ? "bg-brand/10" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <span aria-hidden className="text-xl">{RESOURCE_META[r].emoji}</span>
                  <span className="truncate">{RESOURCE_META[r].label}</span>
                </span>
                <span className="tabular w-full text-center text-lg font-bold">{hand[r]}</span>
                <span
                  className={`tabular w-full text-center text-lg font-bold ${need[r] === 0 ? "text-muted" : lacking ? "text-bad" : "text-good"}`}
                  aria-label={`need ${need[r]}`}
                >
                  {need[r] === 0 ? "–" : lacking ? `-${missing[r]}` : "✓"}
                </span>
                {give === null ? (
                  <button
                    type="button"
                    disabled={done || hand[r] < rate}
                    onClick={() => pickGive(r)}
                    aria-label={`Trade away ${rate} ${r}`}
                    className="min-h-11 w-[3.75rem] rounded-lg border border-line bg-surface-2 text-sm font-bold disabled:opacity-35 active:scale-95"
                  >
                    {rate} → 1
                  </button>
                ) : giving ? (
                  <button
                    type="button"
                    onClick={() => setGive(null)}
                    className="min-h-11 w-[3.75rem] rounded-lg bg-ink text-sm font-bold text-bg active:scale-95"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => pickGet(r)}
                    aria-label={`Get 1 ${r}`}
                    className="min-h-11 w-[3.75rem] rounded-lg bg-brand text-sm font-bold text-brand-ink active:scale-95"
                  >
                    + 1
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div aria-live="polite" className="text-sm">
          <span className="text-muted">Trades: </span>
          <span className="tabular text-lg font-bold">{trades}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="min-h-11 px-4"
            disabled={done || trades === 0}
            onClick={() => {
              setState(undoTrade(state));
              setGive(null);
            }}
          >
            Undo
          </Button>
          <Button variant="ghost" className="min-h-11 px-3" disabled={done} onClick={() => finish(null)}>
            Skip
          </Button>
        </div>
      </div>

      {trades > 0 && (
        <ol className="flex flex-wrap gap-2 text-sm text-muted" aria-label="Trades made">
          {state.trades.map((t, i) => (
            <li key={i} className="rounded-md bg-surface-2 px-2 py-1">
              {tradeText(puzzle, t)}
            </li>
          ))}
        </ol>
      )}

      <Button className="w-full" disabled={done || !ready} onClick={() => finish(state.trades)}>
        Build
      </Button>
    </div>
  );
}
