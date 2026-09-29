import { runItems, scoreRun, type Format, type Mode, type RunScore } from "@/engine";

/** Answers and times collected so far in a run. */
export interface RunProgress {
  answers: unknown[];
  times: number[];
}

export const emptyProgress: RunProgress = { answers: [], times: [] };

export function record(progress: RunProgress, answer: unknown, ms: number): RunProgress {
  return { answers: [...progress.answers, answer], times: [...progress.times, ms] };
}

export function isFinished(mode: Mode, seed: number, progress: RunProgress): boolean {
  return progress.answers.length >= runItems(mode, seed).length;
}

/** Marks so far (for the progress strip), recomputed from the seed. */
export function marksSoFar(
  format: Format,
  mode: Mode,
  seed: number,
  progress: RunProgress,
): boolean[] {
  const n = progress.answers.length;
  const items = runItems(mode, seed);
  if (n === 0) return [];
  // Score a padded run so partial progress can reuse the shared scorer.
  const padded = [
    ...progress.answers,
    ...Array<unknown>(items.length - n).fill(null),
  ];
  const times = [...progress.times, ...Array<number>(items.length - n).fill(0)];
  return scoreRun(format, mode, seed, padded, times)?.marks.slice(0, n) ?? [];
}

export function finalScore(
  format: Format,
  mode: Mode,
  seed: number,
  progress: RunProgress,
): RunScore | null {
  return scoreRun(format, mode, seed, progress.answers, progress.times);
}
