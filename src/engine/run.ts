import type { Format } from "./formats/common";
import { handTrackerPlaybackMs } from "./formats/handTracker";
import { dailyItems, dailySeed, generate, quickSetItems, RUSH_LENGTH, rushSeeds, validate, type Puzzle, type RushItem } from "./puzzles";

export const MODES = ["daily", "rush"] as const;
export type Mode = (typeof MODES)[number];

export function isMode(x: unknown): x is Mode {
  return typeof x === "string" && (MODES as readonly string[]).includes(x);
}

/** Longest a single puzzle may take before a submitted time is rejected. */
export const MAX_PUZZLE_MS = 10 * 60 * 1000;

/** Fastest plausible human answer for a board or trade puzzle. */
export const MIN_ANSWER_MS = 300;

/**
 * Human floor for a puzzle's time. Anything faster is scripted: Hand Tracker
 * can't be answered before its preview and log have played out.
 */
export function minPuzzleMs(puzzle: Puzzle): number {
  return puzzle.format === "hand-tracker" ? handTrackerPlaybackMs(puzzle) : MIN_ANSWER_MS;
}

/**
 * The (tier, seed) puzzles of a run: 5 for Daily, 13 for Rush. A Rush of any
 * other `length` is an unranked quick set with its own seeds.
 */
export function runItems(mode: Mode, seed: number, length?: number): RushItem[] {
  if (mode === "daily") return dailyItems(seed);
  return length === undefined || length === RUSH_LENGTH ? rushSeeds(seed) : quickSetItems(seed, length);
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
 * (wrong length, or a time that is not a sane number) or any puzzle time is
 * under its human floor (`minPuzzleMs`). Shared by
 * the client and by the server, which never trusts a reported score.
 */
export function scoreRun(
  format: Format,
  mode: Mode,
  seed: number,
  answers: readonly unknown[],
  times: readonly unknown[],
  /** Quick-set length; the server never passes it, so it only scores ranked runs. */
  length?: number,
): RunScore | null {
  const items = runItems(mode, seed, length);
  if (answers.length !== items.length || times.length !== items.length) return null;
  let totalMs = 0;
  const marks: boolean[] = [];
  for (let i = 0; i < items.length; i++) {
    const ms = times[i];
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0 || ms > MAX_PUZZLE_MS) return null;
    const puzzle = generate(format, items[i].tier, items[i].seed);
    if (ms < minPuzzleMs(puzzle)) return null;
    marks.push(validate(puzzle, answers[i], ms));
    totalMs += Math.round(ms);
  }
  return { marks, correct: marks.filter(Boolean).length, totalMs };
}
