import { describe, expect, it } from "vitest";
import { compareToBest } from "./best";
import { introTiming, tierRamp } from "./meta";
import { readSettings, saveSettings } from "./settings";
import { saveResult, type KV, type LocalResult } from "./storage";
import { markDailyDay, readStreak, streakFrom, todayStatus } from "./today";
import { formatCountdown, untilNextDaily } from "./time";

function fakeKV(): KV {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const result = (correct: number, totalMs: number, extra: Partial<LocalResult> = {}): LocalResult => ({
  correct,
  total: 5,
  totalMs,
  marks: [],
  seed: 1,
  ...extra,
});

describe("streaks (days at sea)", () => {
  it("counts consecutive UTC days ending today", () => {
    expect(streakFrom(["2026-09-27", "2026-09-28", "2026-09-29"], "2026-09-29")).toBe(3);
  });

  it("stays alive until today's Daily is played", () => {
    expect(streakFrom(["2026-09-27", "2026-09-28"], "2026-09-29")).toBe(2);
  });

  it("breaks after a missed day, and crosses month ends", () => {
    expect(streakFrom(["2026-09-26", "2026-09-28"], "2026-09-29")).toBe(1);
    expect(streakFrom(["2026-09-25"], "2026-09-29")).toBe(0);
    expect(streakFrom(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2);
    expect(streakFrom([], "2026-09-29")).toBe(0);
  });

  it("is stored locally, once per day however many Dailies are finished", () => {
    const kv = fakeKV();
    markDailyDay(kv, "2026-09-28");
    markDailyDay(kv, "2026-09-29");
    markDailyDay(kv, "2026-09-29");
    expect(readStreak(kv, "2026-09-29")).toBe(2);
    expect(readStreak(fakeKV(), "2026-09-29")).toBe(0);
  });
});

describe("Today strip data", () => {
  it("lists the three Dailies, done or open, and the next one to play", () => {
    const kv = fakeKV();
    saveResult(kv, "port-math", "daily", "2026-09-29", result(4, 61_000));
    const t = todayStatus(kv, "2026-09-29");
    expect(t.dailies.map((d) => [d.format, d.result?.correct ?? null])).toEqual([
      ["pip-flash", null],
      ["port-math", 4],
      ["hand-tracker", null],
    ]);
    expect(t.nextOpen).toBe("pip-flash");
    expect(t.allDone).toBe(false);
  });

  it("is all done when every Daily is played", () => {
    const kv = fakeKV();
    for (const f of ["pip-flash", "port-math", "hand-tracker"] as const) {
      saveResult(kv, f, "daily", "2026-09-29", result(5, 1000));
    }
    expect(todayStatus(kv, "2026-09-29")).toMatchObject({ nextOpen: null, allDone: true });
  });

  it("counts down to the next Daily at 00:00 UTC", () => {
    expect(untilNextDaily(new Date("2026-09-29T18:47:30Z"))).toBe(5 * 3600_000 + 12 * 60_000 + 30_000);
    expect(formatCountdown(5 * 3600_000 + 12 * 60_000 + 30_000)).toBe("5h 13m");
    expect(formatCountdown(59_000)).toBe("1m");
    expect(formatCountdown(0)).toBe("0m");
  });
});

describe("Relaxed setting", () => {
  it("is off by default and remembered per player", () => {
    const kv = fakeKV();
    expect(readSettings(kv)).toEqual({ relaxed: false });
    saveSettings(kv, { relaxed: true });
    expect(readSettings(kv)).toEqual({ relaxed: true });
  });

  it("survives junk in storage", () => {
    const kv = fakeKV();
    kv.setItem("hexathlon:settings", "{not json");
    expect(readSettings(kv)).toEqual({ relaxed: false });
  });
});

describe("comparing a Rush to the local best", () => {
  it("reports the first run, a better one and a worse one", () => {
    expect(compareToBest(result(9, 60_000), null)).toEqual({ kind: "first" });
    expect(compareToBest(result(10, 70_000), result(9, 60_000))).toEqual({ kind: "better", correct: 1, ms: 10_000 });
    expect(compareToBest(result(9, 55_000), result(9, 60_000))).toEqual({ kind: "better", correct: 0, ms: -5_000 });
    expect(compareToBest(result(8, 50_000), result(9, 60_000))).toEqual({ kind: "worse", correct: -1, ms: -10_000 });
    expect(compareToBest(result(9, 60_000), result(9, 60_000))).toEqual({ kind: "equal", correct: 0, ms: 0 });
  });
});

describe("intro timing lines", () => {
  it("shows each tier's limit before play", () => {
    expect(introTiming("pip-flash", false)).toBe("Time limit per board: 7 s easy · 8 s medium · 10 s hard.");
    expect(introTiming("pip-flash", true)).toBe("Time limit per board: 14 s easy · 16 s medium · 20 s hard.");
  });

  it("explains why Port Math has no clock", () => {
    expect(introTiming("port-math", false)).toBe("No time limit. Your total time only breaks ties.");
  });

  it("gives Hand Tracker's preview and pace", () => {
    expect(introTiming("hand-tracker", false)).toBe(
      "3 s to memorise the hand, then 5 / 9 / 14 log lines, each shown about 3.0 / 2.7 / 2.5 s.",
    );
    expect(introTiming("hand-tracker", true)).toBe(
      "Memorise the hand, then 5 / 9 / 14 log lines, one per tap. Take your time.",
    );
  });
});

describe("tier ramp copy", () => {
  it("is derived from the run's own tiers", () => {
    expect(tierRamp("rush")).toBe("easy 1–4, medium 5–9, hard 10–13");
    expect(tierRamp("daily")).toBe("easy 1–2, medium 3–4, hard 5");
  });
});
