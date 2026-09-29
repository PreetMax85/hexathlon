import { describe, expect, it } from "vitest";
import { chartDate, soundings } from "./chart";
import { cycleTheme, readTheme, THEME_KEY } from "./theme";

describe("chart edition date", () => {
  it("reads like a chart's edition line", () => {
    expect(chartDate("2026-09-29")).toBe("29 SEP 2026");
    expect(chartDate("2027-01-05")).toBe("5 JAN 2027");
  });
});

describe("soundings", () => {
  const island = (x: number, y: number) => Math.hypot(x, y) < 5;
  const box = { x: -8, y: -8, w: 16, h: 16 };

  it("are the same for the same seed and differ between seeds", () => {
    expect(soundings(42, box, island)).toEqual(soundings(42, box, island));
    expect(soundings(43, box, island)).not.toEqual(soundings(42, box, island));
  });

  it("stay in the sea and inside the chart", () => {
    for (const s of soundings(7, box, island)) {
      expect(island(s.x, s.y)).toBe(false);
      expect(s.x).toBeGreaterThanOrEqual(box.x);
      expect(s.x).toBeLessThanOrEqual(box.x + box.w);
      expect(s.depth).toBeGreaterThan(0);
    }
  });

  it("get deeper away from the island", () => {
    const all = soundings(9, box, island, 60);
    const near = all.filter((s) => Math.hypot(s.x, s.y) < 6.2);
    const far = all.filter((s) => Math.hypot(s.x, s.y) > 8);
    const avg = (a: typeof all) => a.reduce((t, s) => t + s.depth, 0) / a.length;
    expect(avg(far)).toBeGreaterThan(avg(near));
  });
});

describe("theme", () => {
  it("defaults to the system palette and survives junk", () => {
    const kv = (v: string | null) => ({ getItem: () => v, setItem: () => undefined });
    expect(readTheme(kv(null))).toBe("auto");
    expect(readTheme(kv("dusk"))).toBe("dusk");
    expect(readTheme(kv("disco"))).toBe("auto");
    expect(THEME_KEY).toBe("hexathlon:theme");
  });

  it("cycles auto → day → dusk → night → auto", () => {
    expect(cycleTheme("auto")).toBe("day");
    expect(cycleTheme("day")).toBe("dusk");
    expect(cycleTheme("dusk")).toBe("night");
    expect(cycleTheme("night")).toBe("auto");
  });
});
