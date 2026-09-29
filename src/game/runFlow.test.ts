import { describe, expect, it } from "vitest";
import { generate, solve } from "@/engine";
import { handPhaseAtStep, runningCounts } from "./handTrackerFlow";
import { advanceDelayMs, betweenPuzzles, initialBetween } from "./runFlow";

describe("pause between puzzles only", () => {
  it("can't pause while a puzzle's clock runs", () => {
    expect(betweenPuzzles(initialBetween, "pause")).toEqual(initialBetween);
  });

  it("pauses on the verdict, which also stops the auto-advance", () => {
    const shown = betweenPuzzles(initialBetween, "answer");
    expect(shown).toEqual({ phase: "verdict" });
    const paused = betweenPuzzles(shown, "pause");
    expect(paused).toEqual({ phase: "paused" });
    expect(betweenPuzzles(paused, "next")).toEqual(paused);
    expect(betweenPuzzles(paused, "resume")).toEqual({ phase: "puzzle" });
  });

  it("moves on from the verdict to the next puzzle", () => {
    expect(betweenPuzzles({ phase: "verdict" }, "next")).toEqual({ phase: "puzzle" });
    // A second answer event while the verdict shows is ignored.
    expect(betweenPuzzles({ phase: "verdict" }, "answer")).toEqual({ phase: "verdict" });
  });
});

describe("Relaxed Hand Tracker: next event on tap", () => {
  it("steps reveal → each event → ask", () => {
    const p = generate("hand-tracker", "easy", 5);
    expect(handPhaseAtStep(p, 0)).toEqual({ kind: "reveal" });
    expect(handPhaseAtStep(p, 1)).toEqual({ kind: "events", index: 0 });
    expect(handPhaseAtStep(p, p.events.length)).toEqual({ kind: "events", index: p.events.length - 1 });
    expect(handPhaseAtStep(p, p.events.length + 1)).toEqual({ kind: "ask" });
  });
});

describe("Hand Tracker miss review", () => {
  it("shows the asked counts after every log line, ending on the true hand", () => {
    const p = generate("hand-tracker", "hard", 3);
    const rows = runningCounts(p);
    expect(rows).toHaveLength(p.events.length + 1);
    expect(rows[0].counts).toEqual(p.questions.map((r) => p.startHand[r]));
    expect(rows[0].changed.every((c) => !c)).toBe(true);
    const last = rows[rows.length - 1];
    expect(last.counts).toEqual(solve(p));
    // A line is marked changed exactly when an asked count moved on it.
    for (let i = 1; i < rows.length; i++) {
      rows[i].changed.forEach((c, q) => expect(c).toBe(rows[i].counts[q] !== rows[i - 1].counts[q]));
    }
  });
});

describe("moving on after a verdict", () => {
  it("waits for Next in Port Math and Hand Tracker", () => {
    expect(advanceDelayMs("port-math", true, 0)).toBeNull();
    expect(advanceDelayMs("hand-tracker", false, 4)).toBeNull();
  });

  it("glides on in Pip Flash, longer after a miss so the answer can be read", () => {
    const right = advanceDelayMs("pip-flash", true, 0)!;
    const wrong = advanceDelayMs("pip-flash", false, 0)!;
    expect(right).toBeGreaterThanOrEqual(1000);
    expect(wrong).toBeGreaterThan(right);
  });

  it("gives a little more breathing room with each puzzle of a run", () => {
    const first = advanceDelayMs("pip-flash", true, 0)!;
    const tenth = advanceDelayMs("pip-flash", true, 9)!;
    expect(tenth).toBeGreaterThan(first);
    expect(tenth - first).toBeLessThanOrEqual(1500);
  });
});
