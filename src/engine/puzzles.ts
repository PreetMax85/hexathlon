import type { Format, Tier } from "./formats/common";
import {
  generateHandTracker,
  solveHandTracker,
  validateHandTracker,
  type HandTrackerAnswer,
  type HandTrackerPuzzle,
} from "./formats/handTracker";
import {
  generatePipFlash,
  solvePipFlash,
  validatePipFlash,
  type PipFlashAnswer,
  type PipFlashPuzzle,
} from "./formats/pipFlash";
import {
  generatePortMath,
  solvePortMath,
  validatePortMath,
  type PortMathAnswer,
  type PortMathPuzzle,
} from "./formats/portMath";
import { mixSeed } from "./rng";

export type Puzzle = PipFlashPuzzle | PortMathPuzzle | HandTrackerPuzzle;
export type Answer = PipFlashAnswer | PortMathAnswer | HandTrackerAnswer;

export type PuzzleOf<F extends Format> = Extract<Puzzle, { format: F }>;
export type AnswerOf<F extends Format> = F extends "pip-flash"
  ? PipFlashAnswer
  : F extends "port-math"
    ? PortMathAnswer
    : HandTrackerAnswer;

/** Deterministic puzzle for (format, tier, seed). Client and server share this. */
export function generate<F extends Format>(format: F, tier: Tier, seed: number): PuzzleOf<F> {
  const s = seed >>> 0;
  switch (format) {
    case "pip-flash":
      return generatePipFlash(tier, s) as PuzzleOf<F>;
    case "port-math":
      return generatePortMath(tier, s) as PuzzleOf<F>;
    case "hand-tracker":
      return generateHandTracker(tier, s) as PuzzleOf<F>;
  }
  throw new Error(`unknown format: ${String(format)}`);
}

/**
 * True iff `answer` is correct. `answer` is untrusted input and may be any
 * JSON value. `elapsedMs` enforces Pip Flash's per-puzzle time limit.
 */
export function validate(puzzle: Puzzle, answer: unknown, elapsedMs?: number): boolean {
  switch (puzzle.format) {
    case "pip-flash":
      return validatePipFlash(puzzle, answer, elapsedMs);
    case "port-math":
      return validatePortMath(puzzle, answer);
    case "hand-tracker":
      return validateHandTracker(puzzle, answer);
  }
}

/** A reference correct answer. */
export function solve<P extends Puzzle>(puzzle: P): AnswerOf<P["format"]> {
  switch (puzzle.format) {
    case "pip-flash":
      return solvePipFlash(puzzle) as AnswerOf<P["format"]>;
    case "port-math":
      return solvePortMath(puzzle) as AnswerOf<P["format"]>;
    case "hand-tracker":
      return solveHandTracker(puzzle) as AnswerOf<P["format"]>;
  }
  throw new Error("unknown puzzle format");
}

export const RUSH_LENGTH = 13;

/** Rush tier ramp: puzzles 1–4 easy, 5–9 medium, 10–13 hard. */
export function rushTier(index: number): Tier {
  if (index < 4) return "easy";
  if (index < 9) return "medium";
  return "hard";
}

export interface RushItem {
  tier: Tier;
  seed: number;
}

/** The 13 (tier, seed) pairs of a Rush run. */
export function rushSeeds(seed: number): RushItem[] {
  return Array.from({ length: RUSH_LENGTH }, (_, i) => ({
    tier: rushTier(i),
    seed: mixSeed("rush", seed >>> 0, i),
  }));
}

/** Unranked quick-set lengths, played locally only. */
export const QUICK_SET_LENGTHS = [3, 5, 10] as const;

/** A run of `length` puzzles on the Rush ramp: the first ~30% easy, then ~40% medium, the rest hard. */
export function quickSetItems(seed: number, length: number): RushItem[] {
  const easy = Math.round(length * 0.3);
  const medium = Math.round(length * 0.7);
  return Array.from({ length }, (_, i) => ({
    tier: i < easy ? "easy" : i < medium ? "medium" : "hard",
    seed: mixSeed("quick-set", seed >>> 0, i),
  }));
}

/** Daily mini-run ramp: 2 easy, 2 medium, 1 hard. */
export const DAILY_TIERS: readonly Tier[] = ["easy", "easy", "medium", "medium", "hard"];

/** The 5 (tier, seed) pairs of a Daily run. */
export function dailyItems(seed: number): RushItem[] {
  return DAILY_TIERS.map((tier, i) => ({ tier, seed: mixSeed("daily-run", seed >>> 0, i) }));
}

/**
 * Version tag in the Daily seed. v1's Daily was one medium puzzle hashed with
 * "medium"; the new tag keeps v1.1 seeds from ever matching a stored v1 row.
 */
const DAILY_SEED_TAG = "mini-run-5";

/** UTC calendar date as YYYY-MM-DD. The day rolls over at 00:00 UTC. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Seed of the Daily run: hash(format, version tag, UTC date). */
export function dailySeed(format: Format, date: Date | string): number {
  const key = typeof date === "string" ? date : utcDateKey(date);
  if (!DATE_KEY.test(key)) throw new RangeError(`bad date key: ${key}`);
  return mixSeed("daily", format, DAILY_SEED_TAG, key);
}
