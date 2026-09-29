"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds since mount, refreshed each animation frame while `running`.
 * Returns a ref-free number for rendering; use `performance.now()` deltas in
 * handlers for exact answer times.
 */
export function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now() - elapsed;
    let frame = 0;
    const tick = () => {
      setElapsed(performance.now() - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `elapsed` is intentionally read once so resuming continues from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return elapsed;
}

/** Monotonic clock in ms. Call from event handlers and effects, not during render. */
export function now(): number {
  return performance.now();
}
