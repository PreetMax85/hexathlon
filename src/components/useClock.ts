"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beatAt, READY_MS } from "@/game/beat";
import { CONFIRM_WINDOW_MS, pressConfirm } from "@/game/confirm";

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

/**
 * A puzzle's clock: a ready beat while the board settles, then running time.
 * `clockMs()` gives the exact time since the clock started, for answers; it
 * keeps counting while the tab is hidden, so leaving doesn't pause a run.
 */
export function usePuzzleClock(stopped: boolean) {
  const since = useElapsed(!stopped);
  const beat = beatAt(since);
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    shownAt.current = now();
  }, []);
  const clockMs = useCallback(() => Math.max(0, now() - (shownAt.current ?? now()) - READY_MS), []);
  return { ready: beat.kind === "ready", elapsed: beat.kind === "running" ? beat.elapsed : 0, clockMs };
}

/** Inline two-tap confirmation that disarms itself after a few seconds. */
export function useConfirm(onFire: () => void) {
  const [armedAt, setArmedAt] = useState<number | null>(null);
  useEffect(() => {
    if (armedAt === null) return;
    const id = window.setTimeout(() => setArmedAt(null), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [armedAt]);
  const press = () => {
    const r = pressConfirm(armedAt, now());
    setArmedAt(r.armedAt);
    if (r.fire) onFire();
  };
  return { armed: armedAt !== null, press, disarm: () => setArmedAt(null) };
}
