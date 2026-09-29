import { describe, expect, it } from "vitest";
import {
  generate,
  generatePortMath,
  solve,
  generateHandTracker,
  replayTrades,
  covers,
  targetCost,
  runItems,
  type PortMathPuzzle,
} from "@/engine";
import { handPhaseAt, handPlaybackMs } from "./handTrackerFlow";
import { PAD_VALUES } from "./numberPad";
import {
  addTrade,
  canBuild,
  canGive,
  currentHand,
  initialTrades,
  shortfall,
  undoTrade,
} from "./portMathState";
import { emptyProgress, finalScore, isFinished, marksSoFar, record } from "./runState";
import { marksStrip, shareText } from "./share";
import {
  cleanNickname,
  isBetter,
  readPlayer,
  readResult,
  saveResult,
  saveRushBest,
  savePlayer,
  type KV,
  type LocalResult,
} from "./storage";
import { call, challengeUrl, createChallenge, ensurePlayer, fetchDaily } from "./api";
import { formatClock, formatSeconds } from "./time";
import { verdict } from "./verdict";

function fakeKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("time and share", () => {
  it("formats clocks and seconds", () => {
    expect(formatClock(161_000)).toBe("2:41");
    expect(formatClock(5_400)).toBe("0:05");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatSeconds(2340)).toBe("2.3s");
  });

  it("builds the SPEC share text", () => {
    expect(
      shareText({ format: "port-math", mode: "rush", correct: 11, total: 13, totalMs: 161_000 }),
    ).toBe("Hexathlon Rush · Port Math 11/13 · 2:41");
    expect(marksStrip([true, false])).toBe("✅❌");
  });

  it("never mentions the protected words", () => {
    const text = shareText({ format: "pip-flash", mode: "daily", correct: 1, total: 1, totalMs: 1 });
    expect(text).not.toMatch(/catan|settlers/i);
  });
});

describe("storage", () => {
  it("cleans nicknames", () => {
    expect(cleanNickname("  a   b  ")).toBe("a b");
    expect(cleanNickname("x".repeat(50))).toHaveLength(20);
  });

  it("saves a player once and keeps the id when renaming", () => {
    const kv = fakeKV();
    expect(readPlayer(kv)).toBeNull();
    expect(savePlayer(kv, "   ")).toBeNull();
    const a = savePlayer(kv, "Ada");
    const b = savePlayer(kv, "Grace");
    expect(readPlayer(kv)).toEqual(b);
    expect(b?.id).toBe(a?.id);
  });

  it("survives corrupt or throwing storage", () => {
    const kv = fakeKV();
    kv.data.set("hexathlon:player", "{oops");
    expect(readPlayer(kv)).toBeNull();
    const throwing: KV = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readPlayer(throwing)).toBeNull();
    expect(savePlayer(throwing, "Ada")?.nickname).toBe("Ada");
  });

  it("keeps the better rush run", () => {
    const kv = fakeKV();
    const r = (correct: number, totalMs: number): LocalResult => ({
      correct,
      total: 13,
      totalMs,
      marks: [],
      seed: 1,
    });
    expect(isBetter(r(5, 1), null)).toBe(true);
    expect(saveRushBest(kv, "pip-flash", r(8, 50_000))).toBe(true);
    expect(saveRushBest(kv, "pip-flash", r(7, 10_000))).toBe(false);
    expect(saveRushBest(kv, "pip-flash", r(8, 40_000))).toBe(true);
    expect(saveRushBest(kv, "pip-flash", r(8, 45_000))).toBe(false);
    expect(readResult(kv, "pip-flash", "rush", "best")?.totalMs).toBe(40_000);
    saveResult(kv, "pip-flash", "daily", "2026-01-01", r(1, 1));
    expect(readResult(kv, "pip-flash", "daily", "2026-01-01")?.correct).toBe(1);
    expect(readResult(kv, "pip-flash", "daily", "2026-01-02")).toBeNull();
  });
});

describe("port math trade state", () => {
  function puzzleWithTrades(): PortMathPuzzle {
    for (let seed = 0; seed < 200; seed++) {
      const p = generatePortMath("medium", seed);
      if (p.optimalTrades === 3) return p;
    }
    throw new Error("none");
  }

  it("replays the reference solution to a buildable hand", () => {
    const puzzle = puzzleWithTrades();
    let state = initialTrades;
    expect(canBuild(puzzle, state)).toBe(false);
    for (const t of solve(puzzle)) {
      expect(canGive(puzzle, state, t.give)).toBe(true);
      state = addTrade(puzzle, state, t);
    }
    expect(state.trades).toHaveLength(puzzle.optimalTrades);
    expect(canBuild(puzzle, state)).toBe(true);
    expect(Object.values(shortfall(puzzle, state)).every((n) => n === 0)).toBe(true);
  });

  it("ignores illegal trades and supports undo", () => {
    const puzzle = puzzleWithTrades();
    const broke = (["wood", "brick", "sheep", "wheat", "ore"] as const).find(
      (r) => !canGive(puzzle, initialTrades, r),
    );
    if (broke) {
      const other = broke === "wood" ? "brick" : "wood";
      expect(addTrade(puzzle, initialTrades, { give: broke, get: other })).toBe(initialTrades);
    }
    const first = solve(puzzle)[0];
    const s1 = addTrade(puzzle, initialTrades, first);
    expect(s1.trades).toHaveLength(1);
    expect(currentHand(puzzle, undoTrade(s1))).toEqual(puzzle.hand);
    expect(undoTrade(initialTrades).trades).toEqual([]);
  });
});

describe("hand tracker flow", () => {
  it("walks reveal → events → ask on time", () => {
    const p = generateHandTracker("easy", 3);
    expect(handPhaseAt(p, 0)).toEqual({ kind: "reveal" });
    expect(handPhaseAt(p, p.revealMs - 1)).toEqual({ kind: "reveal" });
    expect(handPhaseAt(p, p.revealMs)).toEqual({ kind: "events", index: 0 });
    expect(handPhaseAt(p, p.revealMs + p.eventDurationsMs[0])).toEqual({
      kind: "events",
      index: 1,
    });
    expect(handPhaseAt(p, handPlaybackMs(p) - 1)).toEqual({
      kind: "events",
      index: p.events.length - 1,
    });
    expect(handPhaseAt(p, handPlaybackMs(p))).toEqual({ kind: "ask" });
  });

  it("number pad covers 0..19", () => {
    expect(PAD_VALUES[0]).toBe(0);
    expect(PAD_VALUES.at(-1)).toBe(19);
    expect(PAD_VALUES).toHaveLength(20);
  });
});

describe("run state", () => {
  it("tracks progress and scores it with the shared scorer", () => {
    const seed = 77;
    const items = runItems("rush", seed);
    let progress = emptyProgress;
    expect(marksSoFar("hand-tracker", "rush", seed, progress)).toEqual([]);
    items.slice(0, 3).forEach((it, i) => {
      const answer = i === 1 ? [99] : solve(generate("hand-tracker", it.tier, it.seed));
      progress = record(progress, answer, 90_000);
    });
    expect(marksSoFar("hand-tracker", "rush", seed, progress)).toEqual([true, false, true]);
    expect(isFinished("rush", seed, progress)).toBe(false);
    items.slice(3).forEach((it) => {
      progress = record(progress, solve(generate("hand-tracker", it.tier, it.seed)), 90_000);
    });
    expect(isFinished("rush", seed, progress)).toBe(true);
    expect(finalScore("hand-tracker", "rush", seed, progress)?.correct).toBe(12);
  });
});

describe("verdict", () => {
  it("explains each format", () => {
    for (const format of ["pip-flash", "port-math", "hand-tracker"] as const) {
      const puzzle = generate(format, "medium", 5);
      const good = verdict(puzzle, solve(puzzle), 1000);
      expect(good.correct).toBe(true);
      expect(good.title).toBe("Correct");
      const bad = verdict(puzzle, null, 1000);
      expect(bad.correct).toBe(false);
      expect(bad.detail.length).toBeGreaterThan(5);
    }
  });

  it("flags a Pip Flash timeout", () => {
    const puzzle = generate("pip-flash", "easy", 2);
    expect(verdict(puzzle, solve(puzzle), 60_000).title).toBe("Time's up");
  });

  it("flags a covered-but-suboptimal Port Math answer", () => {
    const resources = ["wood", "brick", "sheep", "wheat", "ore"] as const;
    let found = false;
    for (let seed = 0; seed < 100 && !found; seed++) {
      const puzzle = generate("port-math", "easy", seed);
      const need = targetCost(puzzle.target);
      for (const give of resources) {
        for (const get of resources) {
          if (give === get || found) continue;
          const padded = [{ give, get }, ...solve(puzzle)];
          const end = replayTrades(puzzle, padded);
          if (end && covers(end, need)) {
            found = true;
            expect(verdict(puzzle, padded, 1).title).toBe("Too many trades");
          }
        }
      }
    }
    expect(found).toBe(true);
  });
});

describe("api client", () => {
  const reply = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("returns data on success and sends JSON", async () => {
    let seen: { url: string; init?: RequestInit } | null = null;
    const f = (async (url: string, init?: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ id: "abc" }), { status: 201 });
    }) as unknown as typeof fetch;
    const res = await createChallenge({ playerId: "p".repeat(8), format: "port-math", seed: 3 }, f);
    expect(res).toEqual({ ok: true, data: { id: "abc" } });
    expect(seen!.url).toBe("/api/challenges");
    expect(JSON.parse(seen!.init!.body as string)).toMatchObject({ seed: 3 });
  });

  it("surfaces server errors, non-JSON errors and offline", async () => {
    const err = await call("/x", { json: {} }, reply(409, { error: "Daily already played", existing: { correct: 1 } }));
    expect(err).toMatchObject({ ok: false, status: 409, error: "Daily already played" });
    const html = await call("/x", undefined, (async () => new Response("<html>", { status: 504 })) as unknown as typeof fetch);
    expect(html).toMatchObject({ ok: false, status: 504, error: "request failed (504)" });
    const offline = await call("/x", undefined, (async () => {
      throw new TypeError("failed to fetch");
    }) as unknown as typeof fetch);
    expect(offline).toMatchObject({ ok: false, status: 0 });
  });

  it("registers a player once per nickname", async () => {
    let calls = 0;
    const f = (async () => {
      calls++;
      return new Response("{}", { status: 201 });
    }) as unknown as typeof fetch;
    const p = { id: "player-000001", nickname: "Ada" };
    await ensurePlayer(p, f);
    await ensurePlayer(p, f);
    await ensurePlayer({ ...p, nickname: "Grace" }, f);
    expect(calls).toBe(2);
  });

  it("puts the viewer id in the query and builds challenge urls", async () => {
    let url = "";
    const f = (async (u: string) => {
      url = u;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    await fetchDaily("pip-flash", "player-000001", f);
    expect(url).toBe("/api/daily/pip-flash?playerId=player-000001");
    await fetchDaily("pip-flash", null, f);
    expect(url).toBe("/api/daily/pip-flash");
    expect(challengeUrl("https://x.dev", "abcd2345")).toBe("https://x.dev/c/abcd2345");
  });
});
