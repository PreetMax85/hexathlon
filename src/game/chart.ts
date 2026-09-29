import { createRng, mixSeed } from "@/engine";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "2026-09-29" → "29 SEP 2026", the chart's edition line. */
export function chartDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export interface Sounding {
  x: number;
  y: number;
  /** Depth in metres; shallower close to the island. */
  depth: number;
}

/**
 * Seeded depth soundings scattered in the sea around a board, the way a chart
 * prints spot depths. `isLand` excludes points on or near the island.
 */
export function soundings(
  seed: number,
  box: { x: number; y: number; w: number; h: number },
  isLand: (x: number, y: number) => boolean,
  count = 26,
): Sounding[] {
  const rng = createRng(mixSeed(seed, "soundings"));
  const out: Sounding[] = [];
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const reach = Math.hypot(box.w, box.h) / 2;
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const x = box.x + rng.next() * box.w;
    const y = box.y + rng.next() * box.h;
    if (isLand(x, y)) continue;
    if (out.some((s) => Math.hypot(s.x - x, s.y - y) < box.w / 9)) continue;
    const off = Math.hypot(x - cx, y - cy) / reach;
    const depth = Math.max(1, Math.round(2 + off * off * 38 + rng.next() * 6));
    out.push({ x, y, depth });
  }
  return out;
}
