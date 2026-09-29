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

/**
 * What a screen reader hears once playback ends. Events aren't announced
 * live: at reading pace they would talk over each other.
 */
export function logSummary(puzzle: HandTrackerPuzzle, questionIndex: number): string {
  const n = puzzle.questions.length;
  const ask = `how many ${puzzle.questions[questionIndex]} does Rival hold?`;
  const question = n > 1 ? `Question ${questionIndex + 1} of ${n}: ${ask}` : ask[0].toUpperCase() + ask.slice(1);
  return `Log finished: ${puzzle.events.length} events. ${question} Choose 0 to 19, then confirm.`;
}

/** Relaxed mode's tap-paced playback: step 0 is the hand, then one event per tap. */
export function handPhaseAtStep(puzzle: HandTrackerPuzzle, step: number): HandPhase {
  if (step <= 0) return { kind: "reveal" };
  return step <= puzzle.events.length ? { kind: "events", index: step - 1 } : { kind: "ask" };
}
