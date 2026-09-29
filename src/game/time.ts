/** m:ss for a duration, e.g. 161000 → "2:41". Rounds to the nearest second. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Seconds with one decimal, e.g. 2340 → "2.3s". */
export function formatSeconds(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

/** Time until the next Daily, which opens at 00:00 UTC. */
export function untilNextDaily(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

/** Coarse countdown, rounded up to the minute: "5h 13m", "1m". */
export function formatCountdown(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
