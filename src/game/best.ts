import type { LocalResult } from "./storage";

/** How a finished Rush compares to the best run stored before it. */
export type BestComparison =
  | { kind: "first" }
  | { kind: "better" | "worse" | "equal"; correct: number; ms: number };

/** More correct wins; equal correct → less time wins. Deltas are this run minus the best. */
export function compareToBest(run: LocalResult, best: LocalResult | null): BestComparison {
  if (!best) return { kind: "first" };
  const correct = run.correct - best.correct;
  const ms = run.totalMs - best.totalMs;
  const kind = correct > 0 || (correct === 0 && ms < 0) ? "better" : correct === 0 && ms === 0 ? "equal" : "worse";
  return { kind, correct, ms };
}
