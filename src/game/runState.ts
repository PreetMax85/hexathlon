import { generate, minPuzzleMs, runItems, scoreRun, validate, type Format, type Mode, type Puzzle, type RunScore } from "@/engine";
import { RELAXED_FACTOR } from "./relaxed";

/** Answers and times collected so far in a run. */
export interface RunProgress {
  answers: unknown[];
  times: number[];
}

export interface ScoreOptions {
  /**
   * Relaxed mode: limits were doubled, so times are scaled back onto the
   * ranked clock before the shared scorer sees them. Local only; the server
   * never receives relaxed runs.
   */
  relaxed?: boolean;
  /** Quick-set length for an unranked short Rush. */
  length?: number;
}

export const emptyProgress: RunProgress = { answers: [], times: [] };

export function record(progress: RunProgress, answer: unknown, ms: number): RunProgress {
  return { answers: [...progress.answers, answer], times: [...progress.times, ms] };
}

/**
 * The time to record for an answer on `puzzle` (the ranked version, not the
 * relaxed one). A real tap can't beat the human floor, but a fast Skip can
 * land under it; round up so the scorer doesn't reject the whole run. In
 * Relaxed mode times are halved before scoring, so the floor is doubled here.
 */
export function recordedTime(puzzle: Puzzle, ms: number, relaxed: boolean): number {
  return Math.max(Math.round(ms), minPuzzleMs(puzzle) * (relaxed ? RELAXED_FACTOR : 1));
}

export function isFinished(mode: Mode, seed: number, progress: RunProgress, opts?: ScoreOptions): boolean {
  return progress.answers.length >= runItems(mode, seed, opts?.length).length;
}

const scale = (ms: number, opts?: ScoreOptions) => (opts?.relaxed ? ms / RELAXED_FACTOR : ms);

/** Marks so far (for the progress strip), recomputed from the seed. */
export function marksSoFar(
  format: Format,
  mode: Mode,
  seed: number,
  progress: RunProgress,
  opts?: ScoreOptions,
): boolean[] {
  const items = runItems(mode, seed, opts?.length);
  return progress.answers.slice(0, items.length).map((answer, i) =>
    validate(generate(format, items[i].tier, items[i].seed), answer, scale(progress.times[i], opts)),
  );
}

export function finalScore(
  format: Format,
  mode: Mode,
  seed: number,
  progress: RunProgress,
  opts?: ScoreOptions,
): RunScore | null {
  const score = scoreRun(format, mode, seed, progress.answers, progress.times.map((t) => scale(t, opts)), opts?.length);
  if (!score) return null;
  // Report the time actually spent, not the scaled one.
  return { ...score, totalMs: progress.times.reduce((a, t) => a + Math.round(t), 0) };
}
