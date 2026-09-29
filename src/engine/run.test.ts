import { describe, expect, it } from "vitest";
import { FORMATS } from "./formats/common";
import { generate, RUSH_LENGTH, solve } from "./puzzles";
import { runItems, scoreRun } from "./run";

function perfect(format: (typeof FORMATS)[number], mode: "daily" | "rush", seed: number) {
  const items = runItems(mode, seed);
  return {
    answers: items.map((it) => solve(generate(format, it.tier, it.seed))) as unknown[],
    times: items.map(() => 1000),
  };
}

describe("runItems", () => {
  it("has 13 puzzles for rush", () => {
    expect(runItems("rush", 5)).toHaveLength(RUSH_LENGTH);
  });

  it("makes the Daily a 5-puzzle mini-run: 2 easy, 2 medium, 1 hard", () => {
    const items = runItems("daily", 5);
    expect(items.map((it) => it.tier)).toEqual(["easy", "easy", "medium", "medium", "hard"]);
    expect(new Set(items.map((it) => it.seed)).size).toBe(5);
    expect(runItems("daily", 5)).toEqual(items);
    expect(runItems("daily", 6)).not.toEqual(items);
  });
});

describe("scoreRun", () => {
  for (const format of FORMATS) {
    it(`${format}: reference answers score full marks`, () => {
      const { answers, times } = perfect(format, "rush", 42);
      const score = scoreRun(format, "rush", 42, answers, times);
      expect(score?.correct).toBe(RUSH_LENGTH);
      expect(score?.totalMs).toBe(RUSH_LENGTH * 1000);
    });

    it(`${format}: a forged answer is marked wrong`, () => {
      const { answers, times } = perfect(format, "rush", 42);
      answers[3] = "forged";
      const score = scoreRun(format, "rush", 42, answers, times);
      expect(score?.marks[3]).toBe(false);
      expect(score?.correct).toBe(RUSH_LENGTH - 1);
    });
  }

  it("scores a daily run", () => {
    const { answers, times } = perfect("port-math", "daily", 9);
    expect(scoreRun("port-math", "daily", 9, answers, times)?.correct).toBe(5);
  });

  it("rejects wrong lengths and bad times", () => {
    const { answers, times } = perfect("pip-flash", "rush", 1);
    expect(scoreRun("pip-flash", "rush", 1, answers.slice(1), times)).toBeNull();
    expect(scoreRun("pip-flash", "rush", 1, answers, times.slice(1))).toBeNull();
    expect(scoreRun("pip-flash", "rush", 1, answers, times.map(() => -1))).toBeNull();
    expect(scoreRun("pip-flash", "rush", 1, answers, times.map(() => NaN))).toBeNull();
    expect(scoreRun("pip-flash", "rush", 1, answers, times.map(() => "1"))).toBeNull();
  });

  it("enforces the Pip Flash time limit server-side", () => {
    const { answers } = perfect("pip-flash", "rush", 1);
    const slow = answers.map(() => 60_000);
    expect(scoreRun("pip-flash", "rush", 1, answers, slow)?.correct).toBe(0);
  });
});
