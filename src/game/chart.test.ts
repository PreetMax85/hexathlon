import { describe, expect, it } from "vitest";
import { chartDate } from "./chart";
import { readTheme, THEME_KEY, toggleTheme } from "./theme";

describe("chart edition date", () => {
  it("reads like a chart's edition line", () => {
    expect(chartDate("2026-09-29")).toBe("29 Sep 2026");
    expect(chartDate("2027-01-05")).toBe("5 Jan 2027");
  });
});

describe("theme", () => {
  const kv = (v: string | null) => ({ getItem: () => v, setItem: () => undefined });

  it("follows the system until a palette is chosen, and survives junk", () => {
    expect(readTheme(kv(null), false)).toBe("day");
    expect(readTheme(kv(null), true)).toBe("dusk");
    expect(readTheme(kv("disco"), true)).toBe("dusk");
    expect(readTheme(kv("day"), true)).toBe("day");
    expect(readTheme(kv("dusk"), false)).toBe("dusk");
    expect(THEME_KEY).toBe("hexathlon:theme");
  });

  it("maps retired palettes onto the two that remain", () => {
    expect(readTheme(kv("night"), false)).toBe("dusk");
    expect(readTheme(kv("auto"), false)).toBe("day");
    expect(readTheme(kv("auto"), true)).toBe("dusk");
  });

  it("toggles day ↔ dusk", () => {
    expect(toggleTheme("day")).toBe("dusk");
    expect(toggleTheme("dusk")).toBe("day");
  });
});
