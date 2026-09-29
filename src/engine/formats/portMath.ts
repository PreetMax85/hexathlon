import type { PortKind } from "../board";
import { createRng, mixSeed, type Rng } from "../rng";
import { emptyCounts, RESOURCES, type Resource, type ResourceCounts } from "../types";
import type { Tier } from "./common";

export const BUILDS = ["road", "settlement", "city", "dev"] as const;
export type Build = (typeof BUILDS)[number];

export const BUILD_COSTS: Record<Build, ResourceCounts> = {
  road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
  city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
  dev: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 },
};

export const PORT_KINDS: readonly PortKind[] = ["generic", ...RESOURCES];

export interface PortMathTierRules {
  minTrades: number;
  maxTrades: number;
  /** Require the greedy strategy to be strictly worse than optimal. */
  greedyMustFail: boolean;
}

/**
 * Trade counts per tier. The ranges overlap so that, with a one-tap count as
 * the answer, the tier badge never gives the answer away.
 */
export const PORT_MATH_RULES: Record<Tier, PortMathTierRules> = {
  easy: { minTrades: 1, maxTrades: 2, greedyMustFail: false },
  medium: { minTrades: 2, maxTrades: 3, greedyMustFail: false },
  hard: { minTrades: 3, maxTrades: 5, greedyMustFail: true },
};

/** The counts a player can tap: one more than the hardest optimum, so 5 is never a sure thing. */
export const PORT_MATH_CHOICES = [1, 2, 3, 4, 5, 6] as const;

export interface PortMathPuzzle {
  format: "port-math";
  tier: Tier;
  seed: number;
  hand: ResourceCounts;
  /** Owned ports, in PORT_KINDS order. */
  ports: PortKind[];
  /** Builds to afford (a multiset), in BUILDS order. */
  target: Build[];
  /** Fewest maritime trades that cover the target. */
  optimalTrades: number;
}

export interface Trade {
  give: Resource;
  get: Resource;
}

/** The fewest trades the player thinks it takes. */
export type PortMathAnswer = number;

/** Cards given per trade: 2 with that resource's 2:1 port, 3 with a generic port, else 4. */
export function tradeRate(ports: readonly PortKind[], resource: Resource): number {
  if (ports.includes(resource)) return 2;
  if (ports.includes("generic")) return 3;
  return 4;
}

export function targetCost(target: readonly Build[]): ResourceCounts {
  const need = emptyCounts();
  for (const b of target) for (const r of RESOURCES) need[r] += BUILD_COSTS[b][r];
  return need;
}

export function covers(hand: ResourceCounts, need: ResourceCounts): boolean {
  return RESOURCES.every((r) => hand[r] >= need[r]);
}

/** Apply a trade, or return null if it is illegal. */
export function applyTrade(
  hand: ResourceCounts,
  ports: readonly PortKind[],
  trade: Trade,
): ResourceCounts | null {
  if (trade.give === trade.get) return null;
  const rate = tradeRate(ports, trade.give);
  if (hand[trade.give] < rate) return null;
  return { ...hand, [trade.give]: hand[trade.give] - rate, [trade.get]: hand[trade.get] + 1 };
}

// Hands pack into one integer, 6 bits per resource. Trades never raise the
// card total, so capping the total keeps every count in range.
const BITS = 6;
const MAX_SEARCH_CARDS = (1 << BITS) - 1;

function encode(hand: ResourceCounts): number {
  return RESOURCES.reduce((key, r, i) => key + hand[r] * 2 ** (BITS * i), 0);
}

function decode(key: number): ResourceCounts {
  const hand = emptyCounts();
  RESOURCES.forEach((r, i) => {
    hand[r] = Math.floor(key / 2 ** (BITS * i)) % 2 ** BITS;
  });
  return hand;
}

/**
 * Breadth-first search over hands. Returns a shortest trade sequence that
 * covers the target, or null if unreachable. Every trade lowers the card
 * total, so the search space is finite.
 */
export function optimalTrades(
  hand: ResourceCounts,
  ports: readonly PortKind[],
  target: readonly Build[],
): Trade[] | null {
  if (RESOURCES.reduce((n, r) => n + hand[r], 0) > MAX_SEARCH_CARDS) {
    throw new RangeError("hand too large for search");
  }
  const need = targetCost(target);
  const startKey = encode(hand);
  const parent = new Map<number, { from: number; trade: Trade } | null>([[startKey, null]]);
  const path = (key: number): Trade[] => {
    const trades: Trade[] = [];
    for (let step = parent.get(key); step; step = parent.get(step.from)) trades.push(step.trade);
    return trades.reverse();
  };
  if (covers(hand, need)) return [];

  let frontier = [startKey];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const key of frontier) {
      const current = decode(key);
      for (const give of RESOURCES) {
        for (const get of RESOURCES) {
          const after = applyTrade(current, ports, { give, get });
          if (!after) continue;
          const afterKey = encode(after);
          if (parent.has(afterKey)) continue;
          parent.set(afterKey, { from: key, trade: { give, get } });
          if (covers(after, need)) return path(afterKey);
          next.push(afterKey);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Naive baseline from SPEC §2.2: always trade the resource with the largest
 * surplus (cards beyond the target), at its best rate, for the most-missing
 * resource. Ties go to the cheaper rate, then resource order. If that pile
 * cannot pay for a trade the strategy is stuck and returns Infinity.
 */
export function greedyTrades(
  hand: ResourceCounts,
  ports: readonly PortKind[],
  target: readonly Build[],
): number {
  const need = targetCost(target);
  let current = { ...hand };
  let trades = 0;
  while (!covers(current, need)) {
    const surplus = (r: Resource) => current[r] - need[r];
    const give = RESOURCES.reduce((best, r) =>
      surplus(r) > surplus(best) ||
      (surplus(r) === surplus(best) && tradeRate(ports, r) < tradeRate(ports, best))
        ? r
        : best,
    );
    if (surplus(give) < tradeRate(ports, give)) return Infinity;
    const get = RESOURCES.reduce((best, r) => (surplus(r) < surplus(best) ? r : best));
    current = applyTrade(current, ports, { give, get })!;
    trades++;
  }
  return trades;
}

const TARGET_SIZE: Record<Tier, [number, number]> = {
  easy: [1, 1],
  medium: [1, 2],
  hard: [2, 2],
};

function randomPorts(rng: Rng, tier: Tier): PortKind[] {
  const count = rng.pick(tier === "hard" ? [1, 2, 2, 3] : [0, 1, 1, 2, 2, 3]);
  const chosen = new Set(rng.shuffle(PORT_KINDS).slice(0, count));
  return PORT_KINDS.filter((k) => chosen.has(k));
}

function randomTarget(rng: Rng, tier: Tier): Build[] {
  const [lo, hi] = TARGET_SIZE[tier];
  const size = rng.range(lo, hi);
  const picks = Array.from({ length: size }, () => rng.pick(BUILDS));
  return BUILDS.flatMap((b) => picks.filter((p) => p === b));
}

/**
 * Candidate hand built around a planned trade count: start from the target
 * cost, remove `trades` cards (the deficit), then give other resources enough
 * cards to pay for those trades plus some odd leftovers. The exact optimum
 * is still computed by search afterwards; this only makes hits likely.
 */
function randomHand(
  rng: Rng,
  ports: readonly PortKind[],
  target: readonly Build[],
  trades: number,
): ResourceCounts {
  const hand = targetCost(target);
  const deficit = new Set<Resource>();
  for (let i = 0; i < trades; i++) {
    const held = RESOURCES.filter((r) => hand[r] > 0);
    if (held.length === 0) break;
    const r = rng.pick(held);
    hand[r]--;
    deficit.add(r);
  }
  const payers = RESOURCES.filter((r) => !deficit.has(r));
  if (payers.length === 0) return hand;
  for (let i = 0; i < trades; i++) {
    const r = rng.pick(payers);
    hand[r] += tradeRate(ports, r);
  }
  const leftovers = rng.range(1, 3);
  for (let i = 0; i < leftovers; i++) {
    const r = rng.pick(payers);
    hand[r] += rng.range(1, tradeRate(ports, r) - 1);
  }
  return hand;
}

const MAX_ATTEMPTS = 50_000;
/** The bank holds 19 of each resource. */
const MAX_HAND_PER_RESOURCE = 19;

export function generatePortMath(tier: Tier, seed: number): PortMathPuzzle {
  const rules = PORT_MATH_RULES[tier];
  const rng = createRng(mixSeed(seed, "port-math", tier));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ports = randomPorts(rng, tier);
    const target = randomTarget(rng, tier);
    const hand = randomHand(rng, ports, target, rng.range(rules.minTrades, rules.maxTrades));
    if (RESOURCES.some((r) => hand[r] > MAX_HAND_PER_RESOURCE)) continue;
    // Greedy only trades surplus for missing cards, so when it finishes it
    // hits the lower bound and is optimal: skip the search in that case.
    if (rules.greedyMustFail && greedyTrades(hand, ports, target) < Infinity) continue;
    const best = optimalTrades(hand, ports, target);
    if (!best || best.length < rules.minTrades || best.length > rules.maxTrades) continue;
    if (rules.greedyMustFail && greedyTrades(hand, ports, target) <= best.length) continue;
    return {
      format: "port-math",
      tier,
      seed,
      hand,
      ports,
      target,
      optimalTrades: best.length,
    };
  }
  throw new Error(`port-math: no puzzle for ${tier}/${seed}`);
}

/** One fewest-trade route, for explaining the answer. */
export function portMathRoute(puzzle: PortMathPuzzle): Trade[] {
  const best = optimalTrades(puzzle.hand, puzzle.ports, puzzle.target);
  if (!best) throw new Error("port-math puzzle has no solution");
  return best;
}

export function solvePortMath(puzzle: PortMathPuzzle): PortMathAnswer {
  return puzzle.optimalTrades;
}

/** Final hand after a trade sequence, or null if any trade is illegal. */
export function replayTrades(
  puzzle: PortMathPuzzle,
  trades: readonly Trade[],
): ResourceCounts | null {
  let hand: ResourceCounts | null = { ...puzzle.hand };
  for (const t of trades) {
    hand = applyTrade(hand, puzzle.ports, t);
    if (!hand) return null;
  }
  return hand;
}

/** Correct iff the answer is the fewest trades that cover the target. */
export function validatePortMath(puzzle: PortMathPuzzle, answer: unknown): boolean {
  return typeof answer === "number" && answer === puzzle.optimalTrades;
}
