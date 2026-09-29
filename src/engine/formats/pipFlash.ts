import { generateBoard, vertexPips, type Board } from "../board";
import { createRng, mixSeed } from "../rng";
import { TOPOLOGY } from "../topology";
import type { Tier } from "./common";

export interface PipFlashTierRules {
  /** Number of candidate vertices. */
  k: number;
  /** Minimum pip gap between the best and second-best candidate. */
  minGap: number;
  timeLimitMs: number;
}

export const PIP_FLASH_RULES: Record<Tier, PipFlashTierRules> = {
  easy: { k: 3, minGap: 2, timeLimitMs: 6000 },
  medium: { k: 4, minGap: 1, timeLimitMs: 5000 },
  hard: { k: 6, minGap: 1, timeLimitMs: 4000 },
};

export const CANDIDATE_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

export interface PipFlashPuzzle {
  format: "pip-flash";
  tier: Tier;
  seed: number;
  board: Board;
  /** Candidate vertex ids; index i is labelled CANDIDATE_LABELS[i]. */
  candidates: number[];
  timeLimitMs: number;
}

/** Index of the chosen candidate, or null on timeout. */
export type PipFlashAnswer = number | null;

/** Vertices touching at least 2 land hexes. */
const ELIGIBLE = TOPOLOGY.vertices.filter((v) => v.hexes.length >= 2).map((v) => v.id);

const PICKS_PER_BOARD = 200;
const MAX_BOARDS = 100;

/**
 * Pick k pairwise non-adjacent eligible vertices (non-adjacent keeps the
 * A–F labels legible), or null if the random order runs out.
 */
function pickCandidates(order: number[], k: number): number[] | null {
  const chosen: number[] = [];
  for (const v of order) {
    if (chosen.some((c) => TOPOLOGY.vertices[c].neighbors.includes(v))) continue;
    chosen.push(v);
    if (chosen.length === k) return chosen;
  }
  return null;
}

/** Best and runner-up pip totals among candidates, plus the best index. */
export function pipFlashRanking(board: Board, candidates: readonly number[]) {
  const totals = candidates.map((v) => vertexPips(board, v));
  let best = 0;
  for (let i = 1; i < totals.length; i++) if (totals[i] > totals[best]) best = i;
  const second = Math.max(...totals.filter((_, i) => i !== best));
  const unique = totals.filter((t) => t === totals[best]).length === 1;
  return { totals, best, gap: totals[best] - second, unique };
}

export function generatePipFlash(tier: Tier, seed: number): PipFlashPuzzle {
  const rules = PIP_FLASH_RULES[tier];
  const rng = createRng(mixSeed(seed, "pip-flash", tier));
  for (let b = 0; b < MAX_BOARDS; b++) {
    const board = generateBoard(mixSeed(seed, "pip-flash-board", b));
    for (let i = 0; i < PICKS_PER_BOARD; i++) {
      const candidates = pickCandidates(rng.shuffle(ELIGIBLE), rules.k);
      if (!candidates) continue;
      const { unique, gap } = pipFlashRanking(board, candidates);
      if (unique && gap >= rules.minGap) {
        return {
          format: "pip-flash",
          tier,
          seed,
          board,
          candidates,
          timeLimitMs: rules.timeLimitMs,
        };
      }
    }
  }
  throw new Error(`pip-flash: no puzzle for ${tier}/${seed}`);
}

export function solvePipFlash(puzzle: PipFlashPuzzle): number {
  return pipFlashRanking(puzzle.board, puzzle.candidates).best;
}

/** Correct iff the best candidate was tapped within the time limit. */
export function validatePipFlash(
  puzzle: PipFlashPuzzle,
  answer: unknown,
  elapsedMs?: number,
): boolean {
  if (elapsedMs !== undefined && !(elapsedMs <= puzzle.timeLimitMs)) return false;
  return typeof answer === "number" && answer === solvePipFlash(puzzle);
}
