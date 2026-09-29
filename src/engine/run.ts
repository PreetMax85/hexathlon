import type { Format } from "./formats/common";
import { dailyItems, dailySeed, generate, rushSeeds, validate, type RushItem } from "./puzzles";

export const MODES = ["daily", "rush"] as const;
export type Mode = (typeof MODES)[number];

export function isMode(x: unknown): x is Mode {
  return typeof x === "string" && (MODES as readonly string[]).includes(x);
}

/** Longest a single puzzle may take before a submitted time is rejected. */
export const MAX_PUZZLE_MS = 10 * 60 * 1000;

/** The (tier, seed) puzzles of a run: 5 for Daily, 13 for Rush. */
export function runItems(mode: Mode, seed: number): RushItem[] {
  return mode === "daily" ? dailyItems(seed) : rushSeeds(seed);
}

/** Seed of today's Daily for a format. Daily runs use it directly. */
export function dailyRunSeed(format: Format, date: Date | string): number {
  return dailySeed(format, date);
}

export interface RunScore {
  /** Per-puzzle correctness. */
  marks: boolean[];
  correct: number;
  totalMs: number;
}

/**
 * Recompute a run from its seed. Returns null if the submission is malformed
 * (wrong length, or a time that is not a sane non-negative number). Shared by
 * the client and by the server, which never trusts a reported score.
 */
export function scoreRun(
  format: Format,
  mode: Mode,
  seed: number,
  answers: readonly unknown[],
  times: readonly unknown[],
): RunScore | null {
  const items = runItems(mode, seed);
  if (answers.length !== items.length || times.length !== items.length) return null;
  let totalMs = 0;
  const marks: boolean[] = [];
  for (let i = 0; i < items.length; i++) {
    const ms = times[i];
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0 || ms > MAX_PUZZLE_MS) return null;
    const puzzle = generate(format, items[i].tier, items[i].seed);
    marks.push(validate(puzzle, answers[i], ms));
    totalMs += Math.round(ms);
  }
  return { marks, correct: marks.filter(Boolean).length, totalMs };
}
