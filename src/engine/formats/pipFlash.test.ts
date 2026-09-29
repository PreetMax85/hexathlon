import { describe, expect, it } from "vitest";
import { generateBoard, vertexPips } from "../board";
import { TOPOLOGY } from "../topology";
import { TIERS } from "./common";
import {
  generatePipFlash,
  PIP_FLASH_RULES,
  solvePipFlash,
  validatePipFlash,
} from "./pipFlash";

const SEEDS = Array.from({ length: 500 }, (_, i) => i);

describe.each(TIERS)("pip flash (%s)", (tier) => {
  const rules = PIP_FLASH_RULES[tier];

  it("500 seeds: valid, within tier rules, reference right, perturbed wrong", () => {
    for (const seed of SEEDS) {
      const p = generatePipFlash(tier, seed);
      expect(p.board).toEqual(generateBoard(p.board.seed));
      expect(p.candidates).toHaveLength(rules.k);
      expect(new Set(p.candidates).size).toBe(rules.k);
      expect(p.timeLimitMs).toBe(rules.timeLimitMs);
      for (const v of p.candidates) {
        expect(TOPOLOGY.vertices[v].hexes.length).toBeGreaterThanOrEqual(2);
      }

      const totals = p.candidates.map((v) => vertexPips(p.board, v)).sort((a, b) => b - a);
      expect(totals[0] - totals[1]).toBeGreaterThanOrEqual(rules.minGap);

      const best = solvePipFlash(p);
      expect(vertexPips(p.board, p.candidates[best])).toBe(totals[0]);
      expect(validatePipFlash(p, best)).toBe(true);
      expect(validatePipFlash(p, best, rules.timeLimitMs)).toBe(true);

      expect(validatePipFlash(p, (best + 1) % rules.k)).toBe(false);
      expect(validatePipFlash(p, null)).toBe(false);
      expect(validatePipFlash(p, best, rules.timeLimitMs + 1)).toBe(false);
    }
  });
});

describe("pip flash", () => {
  it("is deterministic", () => {
    expect(generatePipFlash("hard", 77)).toEqual(generatePipFlash("hard", 77));
  });

  it("rejects malformed answers", () => {
    const p = generatePipFlash("easy", 1);
    for (const bad of [undefined, "0", -1, 1.5, 99, {}, [0]]) {
      expect(validatePipFlash(p, bad)).toBe(false);
    }
  });
});
