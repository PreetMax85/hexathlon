import { describe, expect, it } from "vitest";
import { compareToBest } from "./best";
import { introTiming, tierRamp } from "./meta";
import { readSettings, saveSettings } from "./settings";
import { saveResult, type KV, type LocalResult } from "./storage";
import { coverBoard, isMilestone, markDailyDay, stampLine, readStreak, streakFrom, todayStatus } from "./today";
import { dailyItems, dailySeed, generate, runItems } from "@/engine";
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
    expect(introTiming("port-math", false)).toBe(
      "No time limit. A par of 15 / 20 / 30 s sets the pace; going over only costs the tiebreak.",
    );
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

describe("cover board", () => {
  it("is never a board the player will be scored on", () => {
    for (const date of ["2026-09-29", "2026-09-30", "2027-01-01"]) {
      const seed = dailySeed("pip-flash", date);
      const cover = coverBoard(seed);
      for (const it of dailyItems(seed)) expect(generate("pip-flash", it.tier, it.seed).board.hexes).not.toEqual(cover.hexes);
      for (const it of runItems("rush", seed)) expect(generate("pip-flash", it.tier, it.seed).board.hexes).not.toEqual(cover.hexes);
    }
  });

  it("is the same for everyone on the same seed", () => {
    expect(coverBoard(42)).toEqual(coverBoard(42));
    expect(coverBoard(43).hexes).not.toEqual(coverBoard(42).hexes);
  });
});

describe("result stamp and milestones", () => {
  it("names a clean run, a completed one and a rough one", () => {
    expect(stampLine(13, 13, "rush")).toBe("Clean passage");
    expect(stampLine(5, 5, "daily")).toBe("Clean passage");
    expect(stampLine(9, 13, "rush")).toBe("Passage complete");
    expect(stampLine(3, 5, "daily")).toBe("Daily done");
    expect(stampLine(2, 5, "daily")).toBe("Rough passage");
  });

  it("marks every fifth right answer in a row", () => {
    expect([1, 4, 5, 6, 10].map(isMilestone)).toEqual([false, false, true, false, true]);
  });
});
