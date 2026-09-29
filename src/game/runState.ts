import { generate, runItems, scoreRun, validate, type Format, type Mode, type RunScore } from "@/engine";
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
}

export const emptyProgress: RunProgress = { answers: [], times: [] };

export function record(progress: RunProgress, answer: unknown, ms: number): RunProgress {
  return { answers: [...progress.answers, answer], times: [...progress.times, ms] };
}

export function isFinished(mode: Mode, seed: number, progress: RunProgress): boolean {
  return progress.answers.length >= runItems(mode, seed).length;
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
  const items = runItems(mode, seed);
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
  const score = scoreRun(format, mode, seed, progress.answers, progress.times.map((t) => scale(t, opts)));
  if (!score) return null;
  // Report the time actually spent, not the scaled one.
  return { ...score, totalMs: progress.times.reduce((a, t) => a + Math.round(t), 0) };
}
