import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { challenges, players, results } from "@/db/schema";
import {
  challengeLeaderboard,
  createChallenge,
  dailyLeaderboard,
  hasRushResult,
  saveResult,
  upsertPlayer,
} from "./store";

/**
 * Integration tests against a real Postgres. They write rows for throwaway
 * `dbtest-` players and delete them afterwards. Run with:
 *   RUN_DB_TESTS=1 pnpm vitest run src/server/store.db.test.ts
 */
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!enabled)("store (database)", () => {
  const tag = Math.random().toString(36).slice(2, 10);
  const a = `dbtest-a-${tag}`;
  const b = `dbtest-b-${tag}`;
  const seed = 4_000_000_000 + Math.floor(Math.random() * 1_000_000);
  const created: string[] = [];

  afterAll(async () => {
    const db = getDb();
    await db.delete(results).where(inArray(results.playerId, [a, b]));
    for (const id of created) await db.delete(challenges).where(eq(challenges.id, id));
    await db.delete(players).where(inArray(players.id, [a, b]));
  });

  it("allows one Daily per player, format and seed", async () => {
    const db = getDb();
    await upsertPlayer(db, { id: a, nickname: "Aa" });
    await upsertPlayer(db, { id: b, nickname: "Bb" });
    const base = { format: "pip-flash" as const, mode: "daily" as const, seed, challengeId: null };
    const first = await saveResult(db, { ...base, playerId: a, correct: 1, totalMs: 2000 });
    expect(first.saved).toBe(true);
    const second = await saveResult(db, { ...base, playerId: a, correct: 0, totalMs: 900 });
    expect(second).toEqual({ saved: false, existing: { correct: 1, totalMs: 2000 } });
    // Another player, another format, or another seed are all separate attempts.
    expect((await saveResult(db, { ...base, playerId: b, correct: 1, totalMs: 1500 })).saved).toBe(true);
    expect((await saveResult(db, { ...base, format: "port-math", playerId: a, correct: 1, totalMs: 1 })).saved).toBe(true);
    expect((await saveResult(db, { ...base, seed: seed + 1, playerId: a, correct: 1, totalMs: 1 })).saved).toBe(true);
    const board = await dailyLeaderboard(db, "pip-flash", seed);
    expect(board.map((r) => r.nickname)).toEqual(["Bb", "Aa"]);
  });

  it("does not limit Rush attempts and builds a challenge with the creator's score", async () => {
    const db = getDb();
    const rush = { format: "hand-tracker" as const, mode: "rush" as const, seed: seed + 7, challengeId: null };
    expect(await hasRushResult(db, a, "hand-tracker", rush.seed)).toBe(false);
    expect((await saveResult(db, { ...rush, playerId: a, correct: 8, totalMs: 60000 })).saved).toBe(true);
    expect((await saveResult(db, { ...rush, playerId: a, correct: 9, totalMs: 65000 })).saved).toBe(true);
    expect(await hasRushResult(db, a, "hand-tracker", rush.seed)).toBe(true);
    const id = await createChallenge(db, { playerId: a, format: "hand-tracker", seed: rush.seed });
    created.push(id);
    expect(await createChallenge(db, { playerId: a, format: "hand-tracker", seed: rush.seed })).toBe(id);
    await saveResult(db, { ...rush, playerId: b, challengeId: id, correct: 10, totalMs: 70000 });
    const board = await challengeLeaderboard(db, id);
    expect(board.map((r) => [r.nickname, r.correct])).toEqual([["Bb", 10], ["Aa", 9]]);
  });
});
