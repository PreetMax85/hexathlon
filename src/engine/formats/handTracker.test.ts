import { describe, expect, it } from "vitest";
import { RESOURCES } from "../types";
import { TIERS } from "./common";
import {
  applyEvent,
  describeEvent,
  generateHandTracker,
  HAND_TRACKER_RULES,
  MAX_COUNT,
  replayHand,
  solveHandTracker,
  validateHandTracker,
} from "./handTracker";
import { BUILD_COSTS } from "./portMath";

const SEEDS = Array.from({ length: 500 }, (_, i) => i);

describe.each(TIERS)("hand tracker (%s)", (tier) => {
  const rules = HAND_TRACKER_RULES[tier];

  it("500 seeds: valid, within tier rules, reference right, perturbed wrong", () => {
    for (const seed of SEEDS) {
      const p = generateHandTracker(tier, seed);
      expect(p.events).toHaveLength(rules.events);
      expect(p.secondsPerEvent).toBe(rules.secondsPerEvent);
      expect(p.revealMs).toBe(3000);
      expect(p.questions).toHaveLength(rules.questions);
      expect(new Set(p.questions).size).toBe(rules.questions);

      // Counts never go negative; builds and trades were affordable when made.
      const hands = replayHand(p)!;
      expect(hands).not.toBeNull();
      p.events.forEach((e, i) => {
        const before = hands[i];
        if (e.type === "build") {
          for (const r of RESOURCES) {
            expect(before[r]).toBeGreaterThanOrEqual(BUILD_COSTS[e.build][r]);
          }
        }
        if (e.type === "trade") {
          expect(before[e.give]).toBeGreaterThanOrEqual(e.giveCount);
          expect([2, 3, 4]).toContain(e.giveCount);
          expect(e.give).not.toBe(e.get);
        }
        if (e.type === "you-steal") expect(before[e.resource]).toBeGreaterThanOrEqual(1);
      });
      for (const h of hands) {
        for (const r of RESOURCES) {
          expect(h[r]).toBeGreaterThanOrEqual(0);
          expect(h[r]).toBeLessThanOrEqual(MAX_COUNT);
        }
      }

      const answer = solveHandTracker(p);
      expect(validateHandTracker(p, answer)).toBe(true);

      const wrong = answer.map((n, i) => (i === 0 ? (n === 0 ? 1 : n - 1) : n));
      expect(validateHandTracker(p, wrong)).toBe(false);
      expect(validateHandTracker(p, answer.slice(0, -1))).toBe(false);
    }
  });
});

describe("hand tracker events", () => {
  it("describes events as game-log lines", () => {
    expect(
      describeEvent({
        type: "roll",
        roll: 8,
        rival: { resource: "wheat", count: 2 },
        you: { resource: "ore", count: 1 },
      }),
    ).toBe("Rolled 8 — Rival +2 wheat, You +1 ore");
    expect(describeEvent({ type: "trade", give: "sheep", giveCount: 3, get: "brick" })).toBe(
      "Rival traded 3 sheep → 1 brick",
    );
    expect(describeEvent({ type: "you-steal", resource: "ore" })).toBe(
      "You stole 1 ore from Rival",
    );
    expect(describeEvent({ type: "rival-steal", resource: "brick" })).toBe(
      "Rival stole 1 brick from you",
    );
    expect(describeEvent({ type: "build", build: "city" })).toBe("Rival built a city");
  });

  it("applyEvent refuses to go negative", () => {
    const hand = { wood: 0, brick: 1, sheep: 0, wheat: 0, ore: 0 };
    expect(applyEvent(hand, { type: "build", build: "road" })).toBeNull();
    expect(applyEvent(hand, { type: "you-steal", resource: "wood" })).toBeNull();
    expect(applyEvent(hand, { type: "you-steal", resource: "brick" })).toEqual({
      ...hand,
      brick: 0,
    });
  });

  it("uses every event type across seeds", () => {
    const types = new Set<string>();
    for (const seed of SEEDS.slice(0, 50)) {
      for (const e of generateHandTracker("hard", seed).events) types.add(e.type);
    }
    expect([...types].sort()).toEqual(["build", "rival-steal", "roll", "trade", "you-steal"]);
  });

  it("is deterministic", () => {
    expect(generateHandTracker("medium", 4)).toEqual(generateHandTracker("medium", 4));
  });

  it("rejects malformed answers", () => {
    const p = generateHandTracker("easy", 2);
    for (const bad of [undefined, 3, "3", [-1], [1.5], [20], [null], {}]) {
      expect(validateHandTracker(p, bad)).toBe(false);
    }
  });
});
