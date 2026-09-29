/** Settle time after a puzzle appears, before its clock starts. */
export const READY_MS = 600;

export type Beat = { kind: "ready" } | { kind: "running"; elapsed: number };

/**
 * Where a puzzle is `sinceShownMs` after it appeared: settling (board visible,
 * clock stopped, taps ignored), then running with `elapsed` on the clock.
 */
export function beatAt(sinceShownMs: number): Beat {
  return sinceShownMs < READY_MS ? { kind: "ready" } : { kind: "running", elapsed: sinceShownMs - READY_MS };
}
