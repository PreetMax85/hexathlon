import { describe, expect, it } from "vitest";
import { generate, minPuzzleMs, runItems, solve } from "@/engine";
import { dailyResubmission, finishRun } from "./finishRun";
import { emptyProgress, record } from "./runState";
import { readResult, type KV } from "./storage";
import { readStreak } from "./today";

function fakeKV(): KV {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function perfect(format: "pip-flash" | "port-math", mode: "daily" | "rush", seed: number, extraMs = 900, length?: number) {
  let p = emptyProgress;
  for (const it of runItems(mode, seed, length)) {
    const puzzle = generate(format, it.tier, it.seed);
    p = record(p, solve(puzzle), minPuzzleMs(puzzle) + extraMs);
  }
  return p;
}

const base = { playerId: "player-0001", challengeId: null, relaxed: false };

describe("finishRun", () => {
  it("stores a Daily locally, counts the day for the streak and builds the submission", () => {
    const kv = fakeKV();
    const progress = perfect("port-math", "daily", 5);
    const done = finishRun(kv, { ...base, format: "port-math", mode: "daily", seed: 5, dateKey: "2026-09-29", progress })!;
    expect(done.result).toMatchObject({ correct: 5, total: 5, seed: 5, synced: false });
    expect(readResult(kv, "port-math", "daily", "2026-09-29")?.correct).toBe(5);
    expect(readStreak(kv, "2026-09-29")).toBe(1);
    expect(done.comparison).toBeNull();
    expect(done.body).toEqual({
      playerId: "player-0001",
      format: "port-math",
      mode: "daily",
      seed: 5,
      answers: progress.answers,
      times: progress.times,
      challengeId: null,
    });
  });

  it("compares a Rush with the best stored before it, then keeps the better one", () => {
    const kv = fakeKV();
    const slow = finishRun(kv, { ...base, format: "pip-flash", mode: "rush", seed: 9, dateKey: null, progress: perfect("pip-flash", "rush", 9, 2000) })!;
    expect(slow.comparison).toEqual({ kind: "first" });
    const fast = finishRun(kv, { ...base, format: "pip-flash", mode: "rush", seed: 9, dateKey: null, progress: perfect("pip-flash", "rush", 9, 1000) })!;
    expect(fast.comparison).toEqual({ kind: "better", correct: 0, ms: -13_000 });
    expect(readResult(kv, "pip-flash", "rush", "best")?.totalMs).toBe(fast.result.totalMs);
  });

  it("keeps Relaxed runs local and unranked", () => {
    const kv = fakeKV();
    const done = finishRun(kv, { ...base, relaxed: true, format: "pip-flash", mode: "rush", seed: 9, dateKey: null, progress: perfect("pip-flash", "rush", 9) })!;
    expect(done.body).toBeNull();
    expect(done.comparison).toBeNull();
    expect(done.result.relaxed).toBe(true);
    expect(readResult(kv, "pip-flash", "rush", "best")).toBeNull();
  });

  it("keeps quick sets local and unranked, and remembers their length", () => {
    const kv = fakeKV();
    const done = finishRun(kv, { ...base, format: "pip-flash", mode: "rush", seed: 9, dateKey: null, length: 5, progress: perfect("pip-flash", "rush", 9, 900, 5) })!;
    expect(done.result).toMatchObject({ correct: 5, total: 5, quick: true });
    expect(done.body).toBeNull();
    expect(done.comparison).toBeNull();
    expect(readResult(kv, "pip-flash", "rush", "best")).toBeNull();
  });

  it("returns null for a run the scorer rejects", () => {
    expect(finishRun(fakeKV(), { ...base, format: "pip-flash", mode: "rush", seed: 9, dateKey: null, progress: emptyProgress })).toBeNull();
  });
});

describe("dailyResubmission", () => {
  const stored = { correct: 3, total: 5, totalMs: 9000, marks: [], seed: 77, answers: [1, 2], times: [300, 400] };

  it("rebuilds the submission for an unsent Daily", () => {
    expect(dailyResubmission("pip-flash", stored, "player-0001")).toEqual({
      playerId: "player-0001",
      format: "pip-flash",
      mode: "daily",
      seed: 77,
      answers: [1, 2],
      times: [300, 400],
    });
  });

  it("has nothing to send for a Relaxed Daily or one saved without answers", () => {
    expect(dailyResubmission("pip-flash", { ...stored, relaxed: true }, "player-0001")).toBeNull();
    expect(dailyResubmission("pip-flash", { ...stored, answers: undefined }, "player-0001")).toBeNull();
  });
});
