import { generate, runItems, scoreRun, validate, type Format, type Mode, type RunScore } from "@/engine";

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
  const items = runItems(mode, seed);
  return progress.answers.slice(0, items.length).map((answer, i) =>
    validate(generate(format, items[i].tier, items[i].seed), answer, progress.times[i]),
  );
}

export function finalScore(
  format: Format,
  mode: Mode,
  seed: number,
  progress: RunProgress,
): RunScore | null {
  return scoreRun(format, mode, seed, progress.answers, progress.times);
}
