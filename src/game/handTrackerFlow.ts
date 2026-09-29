import { describeEvent, replayHand, type HandTrackerPuzzle } from "@/engine";

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

export interface CountRow {
  /** The log line, or null for the starting hand. */
  line: string | null;
  /** Rival's count of each asked resource after this line. */
  counts: number[];
  /** Which asked counts this line moved. */
  changed: boolean[];
}

/**
 * The miss review: the starting hand, then every log line with the asked
 * counts after it, so a player can see exactly where they lost track.
 */
export function runningCounts(puzzle: HandTrackerPuzzle): CountRow[] {
  const hands = replayHand(puzzle) ?? [puzzle.startHand];
  return hands.map((hand, i) => {
    const counts = puzzle.questions.map((r) => hand[r]);
    const before = i === 0 ? counts : puzzle.questions.map((r) => hands[i - 1][r]);
    return {
      line: i === 0 ? null : describeEvent(puzzle.events[i - 1]),
      counts,
      changed: counts.map((c, q) => c !== before[q]),
    };
  });
}
