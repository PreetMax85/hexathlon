import { describe, expect, it } from "vitest";
import { RESOURCES } from "../types";
import { TIERS } from "./common";
import {
  applyEvent,
  describeEvent,
  eventDurationMs,
  generateHandTracker,
  handTrackerPlaybackMs,
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
      expect(p.eventDurationsMs).toEqual(p.events.map((e) => eventDurationMs(e, tier)));
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

describe("hand tracker event timing (v1.1 game-feel brief)", () => {
  // durationMs = words × 60000 / wpm + update time; wpm 180 / 220 / 260.
  it("gives a rival build reading time plus 2 s to recall the cost", () => {
    // "Rival built a city": 4 words.
    expect(eventDurationMs({ type: "build", build: "city" }, "easy")).toBe(3333);
    expect(eventDurationMs({ type: "build", build: "city" }, "hard")).toBe(2923);
  });

  it("gives a You-only roll (a distractor) 0.5 s", () => {
    // "Rolled 8 — You +1 ore": 5 words, the dash is not a word.
    const e = { type: "roll", roll: 8, rival: null, you: { resource: "ore", count: 1 } } as const;
    expect(eventDurationMs(e, "medium")).toBe(1864);
  });

  it("gives a roll where the rival collects 1 s", () => {
    // "Rolled 8 — Rival +2 wheat, You +1 ore": 8 words.
    const e = {
      type: "roll",
      roll: 8,
      rival: { resource: "wheat", count: 2 },
      you: { resource: "ore", count: 1 },
    } as const;
    expect(eventDurationMs(e, "easy")).toBe(3667);
  });

  it("gives a rival trade 1.5 s and a steal 1 s", () => {
    // "Rival traded 4 wood → 1 ore": 6 words.
    expect(eventDurationMs({ type: "trade", give: "wood", giveCount: 4, get: "ore" }, "medium")).toBe(3136);
    // "You stole 1 sheep from Rival": 6 words, and the rival loses a card.
    expect(eventDurationMs({ type: "you-steal", resource: "sheep" }, "hard")).toBe(2385);
  });

  it("hard gets 20 events and 2 questions, not more speed", () => {
    expect(HAND_TRACKER_RULES.hard.events).toBe(20);
    expect(HAND_TRACKER_RULES.hard.questions).toBe(2);
  });

  it("averages roughly 3.5 / 3.0 / 2.6 s per event on easy / medium / hard", () => {
    const avg = (tier: (typeof TIERS)[number]) => {
      let sum = 0;
      let n = 0;
      for (const seed of SEEDS.slice(0, 200)) {
        const p = generateHandTracker(tier, seed);
        sum += p.eventDurationsMs.reduce((a, b) => a + b, 0);
        n += p.events.length;
      }
      return sum / n;
    };
    expect(avg("easy")).toBeGreaterThan(3000);
    expect(avg("easy")).toBeLessThan(4000);
    expect(avg("medium")).toBeGreaterThan(2600);
    expect(avg("medium")).toBeLessThan(3400);
    expect(avg("hard")).toBeGreaterThan(2200);
    expect(avg("hard")).toBeLessThan(3000);
  });

  it("playback is the preview plus every event", () => {
    const p = generateHandTracker("medium", 7);
    const events = p.eventDurationsMs.reduce((a, b) => a + b, 0);
    expect(handTrackerPlaybackMs(p)).toBe(3000 + events);
  });
});
