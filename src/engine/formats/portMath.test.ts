import { describe, expect, it } from "vitest";
import { RESOURCES, type ResourceCounts } from "../types";
import { TIERS } from "./common";
import {
  applyTrade,
  covers,
  generatePortMath,
  greedyTrades,
  optimalTrades,
  PORT_MATH_RULES,
  replayTrades,
  solvePortMath,
  targetCost,
  tradeRate,
  validatePortMath,
  type PortMathPuzzle,
} from "./portMath";

const SEEDS = Array.from({ length: 500 }, (_, i) => i);

/** Independent check: is the target reachable in at most `depth` trades? (plain DFS) */
function reachableWithin(p: PortMathPuzzle, hand: ResourceCounts, depth: number): boolean {
  if (covers(hand, targetCost(p.target))) return true;
  if (depth === 0) return false;
  for (const give of RESOURCES) {
    for (const get of RESOURCES) {
      const next = applyTrade(hand, p.ports, { give, get });
      if (next && reachableWithin(p, next, depth - 1)) return true;
    }
  }
  return false;
}

describe.each(TIERS)("port math (%s)", (tier) => {
  const rules = PORT_MATH_RULES[tier];

  it("500 seeds: valid, within tier rules, reference right, perturbed wrong", () => {
    for (const seed of SEEDS) {
      const p = generatePortMath(tier, seed);
      const need = targetCost(p.target);
      expect(p.target.length).toBeGreaterThan(0);
      expect(covers(p.hand, need)).toBe(false);
      for (const r of RESOURCES) expect(p.hand[r]).toBeLessThanOrEqual(19);

      const best = solvePortMath(p);
      expect(best.length).toBe(p.optimalTrades);
      expect(p.optimalTrades).toBeGreaterThanOrEqual(rules.minTrades);
      expect(p.optimalTrades).toBeLessThanOrEqual(rules.maxTrades);

      const greedy = greedyTrades(p.hand, p.ports, p.target);
      expect(p.optimalTrades).toBeLessThanOrEqual(greedy);
      if (rules.greedyMustFail) expect(greedy).toBeGreaterThan(p.optimalTrades);

      expect(validatePortMath(p, best)).toBe(true);
      expect(covers(replayTrades(p, best)!, need)).toBe(true);

      // Perturbations: one trade short, and an illegal trade swapped in.
      expect(validatePortMath(p, best.slice(0, -1))).toBe(false);
      const illegal = best.map((t, i) => (i === 0 ? { give: t.give, get: t.give } : t));
      expect(validatePortMath(p, illegal)).toBe(false);
    }
  });

  it("BFS optimum matches an independent depth-limited search (60 seeds)", () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const p = generatePortMath(tier, seed);
      expect(reachableWithin(p, p.hand, p.optimalTrades)).toBe(true);
      expect(reachableWithin(p, p.hand, p.optimalTrades - 1)).toBe(false);
    }
  });
});

describe("port math rules", () => {
  it("trade rates follow ports", () => {
    expect(tradeRate([], "wood")).toBe(4);
    expect(tradeRate(["generic"], "wood")).toBe(3);
    expect(tradeRate(["generic", "wood"], "wood")).toBe(2);
    expect(tradeRate(["sheep"], "wood")).toBe(4);
  });

  it("applyTrade rejects same-resource and unaffordable trades", () => {
    const hand = { wood: 3, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    expect(applyTrade(hand, [], { give: "wood", get: "ore" })).toBeNull();
    expect(applyTrade(hand, ["generic"], { give: "wood", get: "wood" })).toBeNull();
    expect(applyTrade(hand, ["generic"], { give: "wood", get: "ore" })).toEqual({
      wood: 0,
      brick: 0,
      sheep: 0,
      wheat: 0,
      ore: 1,
    });
  });

  it("BFS returns [] when already affordable and null when unreachable", () => {
    const hand = { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 };
    expect(optimalTrades(hand, [], ["road"])).toEqual([]);
    expect(optimalTrades(hand, [], ["city"])).toBeNull();
  });

  it("greedy gets stuck on a pile it cannot trade", () => {
    // Dev card needs sheep + wheat + ore; ore is missing. Wood (surplus 3,
    // 4:1) is the biggest pile but cannot pay; sheep (surplus 2, 2:1) can.
    const hand = { wood: 3, brick: 0, sheep: 3, wheat: 1, ore: 0 };
    expect(greedyTrades(hand, ["sheep"], ["dev"])).toBe(Infinity);
    expect(optimalTrades(hand, ["sheep"], ["dev"])).toEqual([{ give: "sheep", get: "ore" }]);
  });

  it("greedy is optimal when it finishes", () => {
    const hand = { wood: 4, brick: 0, sheep: 1, wheat: 1, ore: 0 };
    expect(greedyTrades(hand, [], ["dev"])).toBe(1);
  });

  it("is deterministic", () => {
    expect(generatePortMath("hard", 9)).toEqual(generatePortMath("hard", 9));
  });

  it("rejects malformed answers", () => {
    const p = generatePortMath("easy", 3);
    for (const bad of [undefined, null, "x", {}, [{ give: "gold", get: "ore" }], [1, 2]]) {
      expect(validatePortMath(p, bad)).toBe(false);
    }
  });
});
