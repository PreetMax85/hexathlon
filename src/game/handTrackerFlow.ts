import type { HandTrackerPuzzle } from "@/engine";

export type HandPhase =
  | { kind: "reveal" }
  | { kind: "events"; index: number }
  | { kind: "ask" };

/**
 * Phase at `elapsedMs` since the puzzle started: the starting hand shows for
 * `revealMs`, then one event per `secondsPerEvent`, then the question.
 */
export function handPhaseAt(puzzle: HandTrackerPuzzle, elapsedMs: number): HandPhase {
  if (elapsedMs < puzzle.revealMs) return { kind: "reveal" };
  const index = Math.floor((elapsedMs - puzzle.revealMs) / (puzzle.secondsPerEvent * 1000));
  return index < puzzle.events.length ? { kind: "events", index } : { kind: "ask" };
}

/** Total time before the question appears. */
export function handPlaybackMs(puzzle: HandTrackerPuzzle): number {
  return puzzle.revealMs + puzzle.events.length * puzzle.secondsPerEvent * 1000;
}
