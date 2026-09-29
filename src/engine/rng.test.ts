import { describe, expect, it } from "vitest";
import { createRng, hashString, mixSeed } from "./rng";

describe("createRng", () => {
  it("is deterministic for a seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 100 }, () => a.next());
    const ys = Array.from({ length: 100 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it("differs across seeds", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("yields floats in [0, 1) and ints in range", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = rng.range(-3, 3);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(3);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("is roughly uniform", () => {
    const rng = createRng(123);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++) buckets[rng.int(10)]++;
    for (const b of buckets) {
      expect(b).toBeGreaterThan(9_500);
      expect(b).toBeLessThan(10_500);
    }
  });

  it("shuffle returns a permutation and leaves the input alone", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng(9).shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("rejects bad bounds", () => {
    expect(() => createRng(1).int(0)).toThrow(RangeError);
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});

describe("hashString / mixSeed", () => {
  it("is stable and unsigned 32-bit", () => {
    const h = hashString("hexathlon");
    expect(h).toBe(hashString("hexathlon"));
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it("separates nearby inputs", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) seen.add(mixSeed("s", i));
    expect(seen.size).toBe(10_000);
    expect(mixSeed(1, 2)).not.toBe(mixSeed(2, 1));
  });
});
