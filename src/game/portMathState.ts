import {
  applyTrade,
  covers,
  targetCost,
  tradeRate,
  type PortMathPuzzle,
  type Resource,
  type ResourceCounts,
  type Trade,
} from "@/engine";

/** A player's in-progress trading. The hand is always derived by replaying trades. */
export interface TradeState {
  trades: Trade[];
}

export const initialTrades: TradeState = { trades: [] };

export function currentHand(puzzle: PortMathPuzzle, state: TradeState): ResourceCounts {
  let hand = puzzle.hand;
  for (const t of state.trades) {
    const next = applyTrade(hand, puzzle.ports, t);
    if (!next) throw new Error("illegal trade in state");
    hand = next;
  }
  return hand;
}

export function canGive(puzzle: PortMathPuzzle, state: TradeState, give: Resource): boolean {
  return currentHand(puzzle, state)[give] >= tradeRate(puzzle.ports, give);
}

/** Add a trade if legal; otherwise return the state unchanged. */
export function addTrade(puzzle: PortMathPuzzle, state: TradeState, trade: Trade): TradeState {
  const next = applyTrade(currentHand(puzzle, state), puzzle.ports, trade);
  return next ? { trades: [...state.trades, trade] } : state;
}

export function undoTrade(state: TradeState): TradeState {
  return { trades: state.trades.slice(0, -1) };
}

export function canBuild(puzzle: PortMathPuzzle, state: TradeState): boolean {
  return covers(currentHand(puzzle, state), targetCost(puzzle.target));
}

/** Per-resource shortfall against the target (0 when covered). */
export function shortfall(puzzle: PortMathPuzzle, state: TradeState): ResourceCounts {
  const hand = currentHand(puzzle, state);
  const need = targetCost(puzzle.target);
  const out = { ...need };
  for (const r of Object.keys(need) as Resource[]) out[r] = Math.max(0, need[r] - hand[r]);
  return out;
}
