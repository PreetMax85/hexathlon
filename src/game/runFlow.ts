import type { Format } from "@/engine";

/**
 * Between-puzzle flow of a run. The clock only runs in "puzzle"; the player
 * can pause only once a verdict shows, so pausing never buys study time.
 */
export type BetweenState = { phase: "puzzle" } | { phase: "verdict" } | { phase: "paused" };
export type BetweenEvent = "answer" | "pause" | "resume" | "next";

export const initialBetween: BetweenState = { phase: "puzzle" };

export function betweenPuzzles(state: BetweenState, event: BetweenEvent): BetweenState {
  switch (state.phase) {
    case "puzzle":
      return event === "answer" ? { phase: "verdict" } : state;
    case "verdict":
      if (event === "pause") return { phase: "paused" };
      if (event === "next") return { phase: "puzzle" };
      return state;
    case "paused":
      return event === "resume" ? { phase: "puzzle" } : state;
  }
}

/** Pip Flash's pause after a verdict: a right answer glides on, a miss stays a little longer. */
const GLIDE_MS = { right: 1200, wrong: 2400 } as const;
/** Each puzzle into a run adds this much, so the end of a long run eases off a touch. */
const GLIDE_STEP_MS = 120;

/**
 * How long a verdict shows before the next puzzle starts on its own, or null
 * to wait for Next. Pip Flash keeps its rhythm; the formats with more to read
 * wait for the player.
 */
export function advanceDelayMs(format: Format, correct: boolean, index: number): number | null {
  if (format !== "pip-flash") return null;
  return (correct ? GLIDE_MS.right : GLIDE_MS.wrong) + GLIDE_STEP_MS * index;
}
