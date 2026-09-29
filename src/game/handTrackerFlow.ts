import { handTrackerPlaybackMs, type HandTrackerPuzzle } from "@/engine";

export type HandPhase =
  | { kind: "reveal" }
  | { kind: "events"; index: number }
  | { kind: "ask" };

/**
 * Phase at `elapsedMs` since the puzzle started: the starting hand shows for
 * `revealMs`, then each event for its own `eventDurationsMs`, then the question.
 */
export function handPhaseAt(puzzle: HandTrackerPuzzle, elapsedMs: number): HandPhase {
  if (elapsedMs < puzzle.revealMs) return { kind: "reveal" };
  let end = puzzle.revealMs;
  for (let index = 0; index < puzzle.events.length; index++) {
    end += puzzle.eventDurationsMs[index];
    if (elapsedMs < end) return { kind: "events", index };
  }
  return { kind: "ask" };
}

/** Total time before the question appears. */
export function handPlaybackMs(puzzle: HandTrackerPuzzle): number {
  return handTrackerPlaybackMs(puzzle);
}
