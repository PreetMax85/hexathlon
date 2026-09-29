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
