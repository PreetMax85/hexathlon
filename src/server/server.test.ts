import { describe, expect, it } from "vitest";
import { dailySeed, generate, minPuzzleMs, runItems, solve, type Format, type Mode } from "@/engine";
import { bestPerPlayer, publicRows, rankRows, type BoardRow } from "./leaderboard";
import { newChallengeId } from "./ids";
import {
  parseChallengeBody,
  parsePlayerBody,
  parseResultBody,
  dailyDatesAt,
  verifyResult,
  type ResultBody,
} from "./verify";
import { viewerFrom } from "./viewer";

const TODAY = "2026-09-29";
const PLAYER = "0b0f7f0e-aaaa-4bbb-8ccc-123456789abc";

function perfectBody(format: Format, mode: Mode, seed: number, extra: Partial<ResultBody> = {}): ResultBody {
  const items = runItems(mode, seed);
  return {
    playerId: PLAYER,
    format,
    mode,
    seed,
    answers: items.map((it) => solve(generate(format, it.tier, it.seed))),
    times: items.map((it) => minPuzzleMs(generate(format, it.tier, it.seed)) + 1500),
    challengeId: null,
    ...extra,
  };
}

describe("parsePlayerBody", () => {
  it("accepts and cleans a nickname", () => {
    const r = parsePlayerBody({ id: PLAYER, nickname: "  Ada \n Lovelace  " });
    expect(r).toEqual({ ok: true, value: { id: PLAYER, nickname: "Ada Lovelace" } });
  });
  it("rejects bad ids and empty nicknames", () => {
    expect(parsePlayerBody({ id: "x", nickname: "a" }).ok).toBe(false);
    expect(parsePlayerBody({ id: PLAYER, nickname: "   " }).ok).toBe(false);
    expect(parsePlayerBody(null).ok).toBe(false);
    expect(parsePlayerBody({ id: PLAYER, nickname: 5 }).ok).toBe(false);
  });
  it("caps nickname length", () => {
    const r = parsePlayerBody({ id: PLAYER, nickname: "x".repeat(99) });
    expect(r.ok && r.value.nickname.length).toBe(20);
  });
});

describe("parseResultBody", () => {
  const good = { playerId: PLAYER, format: "pip-flash", mode: "rush", seed: 5, answers: [], times: [] };
  it("accepts a well-formed body", () => expect(parseResultBody(good).ok).toBe(true));
  it("rejects malformed fields", () => {
    for (const patch of [
      { format: "chess" },
      { mode: "blitz" },
      { seed: -1 },
      { seed: 1.5 },
      { seed: 2 ** 32 },
      { answers: "no" },
      { challengeId: "!!" },
      { playerId: "short" },
    ]) {
      expect(parseResultBody({ ...good, ...patch }).ok).toBe(false);
    }
  });
});

describe("verifyResult (server recompute)", () => {
  it("scores reference answers as fully correct", () => {
    const body = perfectBody("port-math", "rush", 99);
    const r = verifyResult(body, { dailyDates: [TODAY], challenge: null });
    expect(r.ok && r.value.correct).toBe(13);
  });

  it("rejects a scripted 0 ms run with 400", () => {
    for (const format of ["pip-flash", "port-math", "hand-tracker"] as const) {
      const body = perfectBody(format, "rush", 99);
      const r = verifyResult({ ...body, times: body.times.map(() => 0) }, { dailyDates: [TODAY], challenge: null });
      expect(!r.ok && r.status).toBe(400);
    }
  });

  it("ignores any claimed score: a forged run is scored on its answers only", () => {
    const body = perfectBody("hand-tracker", "rush", 99);
    const forged = {
      ...body,
      answers: body.answers.map(() => [0]),
      correct: 13,
      score: 13,
      totalMs: 1,
    } as ResultBody & { correct: number; score: number };
    const r = verifyResult(forged, { dailyDates: [TODAY], challenge: null });
    expect(r.ok && r.value.correct).toBeLessThan(13);
    // Parsing drops unknown fields, so a claimed score cannot reach the store.
    const parsed = parseResultBody(forged);
    expect(parsed.ok && "correct" in parsed.value).toBe(false);
  });

  it("marks timeouts wrong and rejects impossible times", () => {
    const body = perfectBody("pip-flash", "rush", 7);
    const slow = verifyResult({ ...body, times: body.times.map(() => 60_000) }, { dailyDates: [TODAY], challenge: null });
    expect(slow.ok && slow.value.correct).toBe(0);
    expect(verifyResult({ ...body, times: body.times.map(() => -5) }, { dailyDates: [TODAY], challenge: null }).ok).toBe(false);
    expect(verifyResult({ ...body, answers: body.answers.slice(1) }, { dailyDates: [TODAY], challenge: null }).ok).toBe(false);
  });

  it("only accepts today's Daily seed", () => {
    const today = dailySeed("pip-flash", TODAY);
    expect(verifyResult(perfectBody("pip-flash", "daily", today), { dailyDates: [TODAY], challenge: null }).ok).toBe(true);
    const wrongDay = perfectBody("pip-flash", "daily", dailySeed("pip-flash", "2026-09-28"));
    const r = verifyResult(wrongDay, { dailyDates: [TODAY], challenge: null });
    expect(!r.ok && r.status).toBe(409);
    const arbitrary = verifyResult(perfectBody("pip-flash", "daily", 1234), { dailyDates: [TODAY], challenge: null });
    expect(arbitrary.ok).toBe(false);
    // Another format's seed is not accepted either.
    const otherFormat = perfectBody("pip-flash", "daily", dailySeed("port-math", TODAY));
    expect(verifyResult(otherFormat, { dailyDates: [TODAY], challenge: null }).ok).toBe(false);
  });

  it("ties a challenge run to the challenge's format and seed", () => {
    const challenge = { format: "port-math", seed: 4242 };
    const ok = perfectBody("port-math", "rush", 4242, { challengeId: "abcd2345" });
    expect(verifyResult(ok, { dailyDates: [TODAY], challenge }).ok).toBe(true);
    const wrongSeed = perfectBody("port-math", "rush", 4243, { challengeId: "abcd2345" });
    expect(verifyResult(wrongSeed, { dailyDates: [TODAY], challenge }).ok).toBe(false);
    const missing = verifyResult(ok, { dailyDates: [TODAY], challenge: null });
    expect(!missing.ok && missing.status).toBe(404);
    const dailyInChallenge = perfectBody("port-math", "daily", dailySeed("port-math", TODAY), { challengeId: "abcd2345" });
    expect(verifyResult(dailyInChallenge, { dailyDates: [TODAY], challenge }).ok).toBe(false);
  });
});

describe("dailyDatesAt", () => {
  it("is just today for most of the day", () => {
    expect(dailyDatesAt(new Date("2026-09-29T12:00:00Z"))).toEqual(["2026-09-29"]);
    expect(dailyDatesAt(new Date("2026-09-29T00:15:00Z"))).toEqual(["2026-09-29"]);
  });

  it("still takes yesterday's Daily for 15 minutes after 00:00 UTC", () => {
    // A 5-puzzle run started at 23:58 finishes after midnight.
    expect(dailyDatesAt(new Date("2026-09-29T00:14:59Z"))).toEqual(["2026-09-29", "2026-09-28"]);
    expect(dailyDatesAt(new Date("2026-03-01T00:01:00Z"))).toEqual(["2026-03-01", "2026-02-28"]);
  });

  it("accepts a run that straddled midnight", () => {
    const yesterday = perfectBody("pip-flash", "daily", dailySeed("pip-flash", "2026-09-28"));
    const ctx = { dailyDates: dailyDatesAt(new Date("2026-09-29T00:03:00Z")), challenge: null };
    expect(verifyResult(yesterday, ctx).ok).toBe(true);
  });
});

describe("parseChallengeBody", () => {
  it("validates fields", () => {
    expect(parseChallengeBody({ playerId: PLAYER, format: "port-math", seed: 3 }).ok).toBe(true);
    expect(parseChallengeBody({ playerId: PLAYER, format: "nope", seed: 3 }).ok).toBe(false);
    expect(parseChallengeBody({ playerId: PLAYER, format: "port-math", seed: "3" }).ok).toBe(false);
  });
});

describe("leaderboard", () => {
  const row = (playerId: string, correct: number, totalMs: number): BoardRow => ({
    playerId,
    nickname: playerId.toUpperCase(),
    correct,
    totalMs,
  });

  it("keeps each player's best run and sorts by correct then time", () => {
    const rows = [row("a", 5, 9000), row("b", 7, 30000), row("a", 7, 20000), row("c", 7, 30000), row("a", 6, 1000)];
    const best = bestPerPlayer(rows);
    expect(best.map((r) => r.playerId)).toEqual(["a", "b", "c"]);
    expect(best[0]).toMatchObject({ correct: 7, totalMs: 20000 });
  });

  it("gives ties the same rank", () => {
    const ranked = rankRows(bestPerPlayer([row("a", 7, 100), row("b", 7, 100), row("c", 6, 50)]));
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("never exposes player ids and flags only the viewer's row", () => {
    const ranked = rankRows(bestPerPlayer([row("a", 7, 100), row("b", 6, 50)]));
    const pub = publicRows(ranked, "b");
    expect(JSON.stringify(pub)).not.toContain("playerId");
    expect(pub.map((r) => r.mine)).toEqual([false, true]);
    expect(publicRows(ranked, null).every((r) => !r.mine)).toBe(true);
  });
});

describe("ids", () => {
  it("makes readable 8-char challenge ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newChallengeId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[2-9a-hjkmnp-z]{8}$/);
  });
  it("reads a well-formed viewer id from the query", () => {
    expect(viewerFrom(new Request(`http://x/api?playerId=${PLAYER}`))).toBe(PLAYER);
    expect(viewerFrom(new Request("http://x/api?playerId=%20"))).toBeNull();
    expect(viewerFrom(new Request("http://x/api"))).toBeNull();
  });
});
