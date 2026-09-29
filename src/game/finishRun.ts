import { runItems, type Format, type Mode } from "@/engine";
import type { SubmitBody } from "./api";
import { compareToBest, type BestComparison } from "./best";
import { finalScore, type RunProgress } from "./runState";
import { readResult, saveResult, saveRushBest, type KV, type LocalResult } from "./storage";
import { markDailyDay } from "./today";

export interface FinishInput {
  format: Format;
  mode: Mode;
  seed: number;
  /** UTC date of a Daily run, null for Rush. */
  dateKey: string | null;
  relaxed: boolean;
  progress: RunProgress;
  /** Empty until the player picks a nickname; the caller fills it in before sending. */
  playerId: string;
  challengeId: string | null;
}

export interface FinishedRun {
  result: LocalResult;
  /** Rush only: how this run compares to the best stored before it. */
  comparison: BestComparison | null;
  /** What to send to the server; null for Relaxed runs, which stay local. */
  body: SubmitBody | null;
  dateKey: string | null;
}

/**
 * Close a run: score it with the shared scorer, keep it locally (the Daily
 * slot and streak, or the Rush best), and build the server submission.
 * Returns null if the scorer rejects the run.
 */
export function finishRun(kv: KV, run: FinishInput): FinishedRun | null {
  const { format, mode, seed, dateKey, relaxed, progress } = run;
  const score = finalScore(format, mode, seed, progress, { relaxed });
  if (!score) return null;
  const result: LocalResult = {
    correct: score.correct,
    total: runItems(mode, seed).length,
    totalMs: score.totalMs,
    marks: score.marks,
    seed,
    answers: progress.answers,
    times: progress.times,
    synced: false,
    ...(relaxed ? { relaxed: true } : {}),
  };
  if (mode === "daily" && dateKey) {
    saveResult(kv, format, "daily", dateKey, result);
    markDailyDay(kv, dateKey);
  }
  let comparison: BestComparison | null = null;
  if (mode === "rush" && !relaxed) {
    comparison = compareToBest(result, readResult(kv, format, "rush", "best"));
    saveRushBest(kv, format, result);
  }
  const body: SubmitBody | null = relaxed
    ? null
    : {
        playerId: run.playerId,
        format,
        mode,
        seed,
        answers: progress.answers,
        times: progress.times,
        challengeId: run.challengeId,
      };
  return { result, comparison, body, dateKey };
}
