import { describe, expect, it } from "vitest";
import { generate, runItems, RUSH_LENGTH, solve } from "@/engine";
import { emptyProgress, finalScore, marksSoFar, record, recordedTime } from "./runState";
import { beatAt, READY_MS } from "./beat";
import { relaxPuzzle, RELAXED_FACTOR } from "./relaxed";

describe("ready beat", () => {
  it("settles for 600 ms before the clock runs", () => {
    expect(READY_MS).toBe(600);
    expect(beatAt(0)).toEqual({ kind: "ready" });
    expect(beatAt(599)).toEqual({ kind: "ready" });
    expect(beatAt(600)).toEqual({ kind: "running", elapsed: 0 });
    expect(beatAt(2600)).toEqual({ kind: "running", elapsed: 2000 });
  });
});

describe("relaxed mode", () => {
  it("doubles the Pip Flash limit", () => {
    const p = generate("pip-flash", "hard", 4);
    expect(RELAXED_FACTOR).toBe(2);
    expect(relaxPuzzle(p).timeLimitMs).toBe(20_000);
  });

  it("doubles the Hand Tracker preview and every event", () => {
    const p = generate("hand-tracker", "easy", 4);
    const r = relaxPuzzle(p);
    expect(r.revealMs).toBe(6000);
    expect(r.eventDurationsMs).toEqual(p.eventDurationsMs.map((d) => d * 2));
    expect(r.events).toBe(p.events);
  });

  it("leaves untimed Port Math alone", () => {
    const p = generate("port-math", "easy", 4);
    expect(relaxPuzzle(p)).toEqual(p);
  });
});

describe("relaxed scoring (local only)", () => {
  const seed = 31;
  const items = runItems("rush", seed);
  const answers = items.map((it) => solve(generate("pip-flash", it.tier, it.seed)));

  it("counts a Pip Flash answer inside the doubled limit", () => {
    // 15 s beats nothing in a ranked run but is inside Relaxed's 14–20 s.
    let progress = emptyProgress;
    for (const a of answers) progress = record(progress, a, 13_000);
    expect(finalScore("pip-flash", "rush", seed, progress)?.correct).toBe(0);
    const relaxed = finalScore("pip-flash", "rush", seed, progress, { relaxed: true });
    expect(relaxed?.correct).toBe(RUSH_LENGTH);
    expect(relaxed?.totalMs).toBe(13_000 * RUSH_LENGTH);
    expect(marksSoFar("pip-flash", "rush", seed, record(emptyProgress, answers[0], 13_000), { relaxed: true })).toEqual([true]);
  });
});

describe("recorded answer time", () => {
  it("rounds up to the human floor, so a fast Skip can't sink an honest run", () => {
    const p = generate("port-math", "easy", 3);
    expect(recordedTime(p, 120.4, false)).toBe(300);
    expect(recordedTime(p, 1234.6, false)).toBe(1235);
  });

  it("scales the floor in Relaxed mode, so halving the time never lands under it", () => {
    const pip = generate("pip-flash", "easy", 3);
    expect(recordedTime(pip, 200, true)).toBe(600);
    const seed = 31;
    const items = runItems("rush", seed);
    let progress = emptyProgress;
    for (const it of items) {
      const puzzle = generate("pip-flash", it.tier, it.seed);
      progress = record(progress, solve(puzzle), recordedTime(puzzle, 150, true));
    }
    expect(finalScore("pip-flash", "rush", seed, progress, { relaxed: true })?.correct).toBe(RUSH_LENGTH);
  });
});
