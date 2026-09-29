import type { Puzzle } from "@/engine";

/** Relaxed mode multiplies every time limit and event duration by this. */
export const RELAXED_FACTOR = 2;

/** The puzzle as played in Relaxed mode. Port Math has no clock, so it is unchanged. */
export function relaxPuzzle<P extends Puzzle>(puzzle: P): P {
  switch (puzzle.format) {
    case "pip-flash":
      return { ...puzzle, timeLimitMs: puzzle.timeLimitMs * RELAXED_FACTOR };
    case "hand-tracker":
      return {
        ...puzzle,
        revealMs: puzzle.revealMs * RELAXED_FACTOR,
        eventDurationsMs: puzzle.eventDurationsMs.map((d) => d * RELAXED_FACTOR),
      };
    default:
      return puzzle;
  }
}
