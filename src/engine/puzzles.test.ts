import { describe, expect, it } from "vitest";
import { FORMATS, TIERS } from "./formats/common";
import {
  dailySeed,
  generate,
  RUSH_LENGTH,
  rushSeeds,
  solve,
  utcDateKey,
  validate,
} from "./puzzles";

describe("generate / validate / solve", () => {
  it.each(FORMATS)("%s: dispatches, is deterministic, and round-trips through JSON", (format) => {
    for (const tier of TIERS) {
      for (let seed = 0; seed < 20; seed++) {
        const p = generate(format, tier, seed);
        expect(p.format).toBe(format);
        expect(p.tier).toBe(tier);
        expect(p.seed).toBe(seed);
        expect(generate(format, tier, seed)).toEqual(p);
        // Answers arrive as JSON from the client.
        const answer = JSON.parse(JSON.stringify(solve(p)));
        expect(validate(p, answer)).toBe(true);
        expect(validate(p, undefined)).toBe(false);
        expect(validate(p, { forged: true })).toBe(false);
      }
    }
  });

  it("pip flash enforces its time limit via elapsedMs", () => {
    const p = generate("pip-flash", "easy", 1);
    expect(validate(p, solve(p), 6999)).toBe(true);
    expect(validate(p, solve(p), 7001)).toBe(false);
  });

  it("normalises seeds to uint32", () => {
    expect(generate("pip-flash", "easy", -1)).toEqual(generate("pip-flash", "easy", 2 ** 32 - 1));
  });
});

describe("rushSeeds", () => {
  it("gives 13 puzzles ramping easy → medium → hard", () => {
    const items = rushSeeds(123);
    expect(items).toHaveLength(RUSH_LENGTH);
    expect(items.map((i) => i.tier)).toEqual([
      ...Array(4).fill("easy"),
      ...Array(5).fill("medium"),
      ...Array(4).fill("hard"),
    ]);
    expect(new Set(items.map((i) => i.seed)).size).toBe(13);
    expect(rushSeeds(123)).toEqual(items);
    expect(rushSeeds(124)).not.toEqual(items);
  });
});

describe("dailySeed", () => {
  it("is the same all UTC day and changes at 00:00 UTC", () => {
    const early = new Date("2026-09-29T00:00:00Z");
    const late = new Date("2026-09-29T23:59:59.999Z");
    const next = new Date("2026-09-30T00:00:00Z");
    expect(dailySeed("port-math", early)).toBe(dailySeed("port-math", late));
    expect(dailySeed("port-math", early)).toBe(dailySeed("port-math", "2026-09-29"));
    expect(dailySeed("port-math", next)).not.toBe(dailySeed("port-math", early));
    expect(utcDateKey(new Date("2026-09-29T23:30:00-05:00"))).toBe("2026-09-30");
  });

  it("differs per format", () => {
    const seeds = FORMATS.map((f) => dailySeed(f, "2026-01-01"));
    expect(new Set(seeds).size).toBe(3);
  });

  it("rejects malformed date keys", () => {
    expect(() => dailySeed("pip-flash", "2026-1-1")).toThrow(RangeError);
  });
});
