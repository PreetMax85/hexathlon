import { describe, expect, it } from "vitest";
import { FORMATS } from "./formats/common";
import { generate, RUSH_LENGTH, solve } from "./puzzles";
import { handTrackerPlaybackMs } from "./formats/handTracker";
import { minPuzzleMs, runItems, scoreRun } from "./run";

function perfect(format: (typeof FORMATS)[number], mode: "daily" | "rush", seed: number) {
  const items = runItems(mode, seed);
  return {
    answers: items.map((it) => solve(generate(format, it.tier, it.seed))) as unknown[],
    // A human-plausible time: 1 s on top of each puzzle's floor.
    times: items.map((it) => minPuzzleMs(generate(format, it.tier, it.seed)) + 1000),
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
      expect(score?.totalMs).toBe(times.reduce((a, b) => a + b, 0));
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

describe("minimum-time floor", () => {
  it("is 300 ms for Pip Flash and Port Math", () => {
    expect(minPuzzleMs(generate("pip-flash", "hard", 3))).toBe(300);
    expect(minPuzzleMs(generate("port-math", "easy", 3))).toBe(300);
  });

  it("is the preview plus playback for Hand Tracker", () => {
    const p = generate("hand-tracker", "medium", 3);
    expect(minPuzzleMs(p)).toBe(handTrackerPlaybackMs(p));
    expect(minPuzzleMs(p)).toBeGreaterThan(3000 + 12 * 1500);
  });

  for (const format of FORMATS) {
    it(`${format}: a scripted 0 ms run is rejected`, () => {
      for (const mode of ["rush", "daily"] as const) {
        const { answers } = perfect(format, mode, 77);
        expect(scoreRun(format, mode, 77, answers, answers.map(() => 0))).toBeNull();
      }
    });

    it(`${format}: one puzzle under its floor rejects the run`, () => {
      const { answers, times } = perfect(format, "rush", 77);
      const items = runItems("rush", 77);
      const floor = minPuzzleMs(generate(format, items[5].tier, items[5].seed));
      times[5] = floor - 1;
      expect(scoreRun(format, "rush", 77, answers, times)).toBeNull();
      times[5] = floor;
      expect(scoreRun(format, "rush", 77, answers, times)?.correct).toBe(RUSH_LENGTH);
    });
  }
});
