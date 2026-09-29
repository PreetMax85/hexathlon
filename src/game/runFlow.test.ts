import { describe, expect, it } from "vitest";
import { generate } from "@/engine";
import { handPhaseAtStep } from "./handTrackerFlow";
import { betweenPuzzles, initialBetween } from "./runFlow";

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
