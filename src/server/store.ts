import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { challenges, players, results } from "@/db/schema";
import type { Format, Mode } from "@/engine";
import { newChallengeId } from "./ids";
import { bestPerPlayer, rankRows, type BoardRow, type RankedRow } from "./leaderboard";

export const BOARD_LIMIT = 50;
const ROW_CAP = 2000;

export async function upsertPlayer(db: Db, p: { id: string; nickname: string }) {
  await db
    .insert(players)
    .values(p)
    .onConflictDoUpdate({ target: players.id, set: { nickname: p.nickname } });
}

export async function getPlayer(db: Db, id: string) {
  const [row] = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return row ?? null;
}

export interface NewResult {
  playerId: string;
  format: Format;
  mode: Mode;
  seed: number;
  challengeId: string | null;
  correct: number;
  totalMs: number;
}

export type SaveResult =
  | { saved: true; id: number }
  | { saved: false; existing: { correct: number; totalMs: number } };

/**
 * Store a verified result. A Daily is unique per (player, format, seed) via a
 * partial unique index, so a second attempt inserts nothing and the first
 * result is returned instead.
 */
export async function saveResult(db: Db, r: NewResult): Promise<SaveResult> {
  const [row] = await db.insert(results).values(r).onConflictDoNothing().returning({ id: results.id });
  if (row) return { saved: true, id: row.id };
  const [existing] = await db
    .select({ correct: results.correct, totalMs: results.totalMs })
    .from(results)
    .where(
      and(
        eq(results.playerId, r.playerId),
        eq(results.format, r.format),
        eq(results.mode, r.mode),
        eq(results.seed, r.seed),
      ),
    )
    .limit(1);
  return { saved: false, existing: existing ?? { correct: 0, totalMs: 0 } };
}

export async function getChallenge(db: Db, id: string) {
  const [row] = await db
    .select({
      id: challenges.id,
      format: challenges.format,
      seed: challenges.seed,
      createdBy: players.nickname,
      createdAt: challenges.createdAt,
    })
    .from(challenges)
    .innerJoin(players, eq(players.id, challenges.createdBy))
    .where(eq(challenges.id, id))
    .limit(1);
  return row ?? null;
}

async function findChallengeByCreator(db: Db, playerId: string, format: Format, seed: number) {
  const [row] = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(eq(challenges.createdBy, playerId), eq(challenges.format, format), eq(challenges.seed, seed)))
    .limit(1);
  return row ?? null;
}

/** True if the player has a verified Rush result for this run. */
export async function hasRushResult(db: Db, playerId: string, format: Format, seed: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(results)
    .where(
      and(
        eq(results.playerId, playerId),
        eq(results.format, format),
        eq(results.mode, "rush"),
        eq(results.seed, seed),
      ),
    );
  return (row?.n ?? 0) > 0;
}

/**
 * Create (or return the existing) challenge for a creator's Rush run and
 * attach the creator's own result to it, so friends have a score to beat.
 */
export async function createChallenge(
  db: Db,
  c: { playerId: string; format: Format; seed: number },
): Promise<string> {
  let id = (await findChallengeByCreator(db, c.playerId, c.format, c.seed))?.id ?? null;
  for (let attempt = 0; !id && attempt < 5; attempt++) {
    const [row] = await db
      .insert(challenges)
      .values({ id: newChallengeId(), format: c.format, seed: c.seed, createdBy: c.playerId })
      .onConflictDoNothing()
      .returning({ id: challenges.id });
    id = row?.id ?? (await findChallengeByCreator(db, c.playerId, c.format, c.seed))?.id ?? null;
  }
  if (!id) throw new Error("could not allocate a challenge id");
  await db
    .update(results)
    .set({ challengeId: id })
    .where(
      and(
        eq(results.playerId, c.playerId),
        eq(results.format, c.format),
        eq(results.mode, "rush"),
        eq(results.seed, c.seed),
        isNull(results.challengeId),
      ),
    );
  return id;
}

async function boardFor(db: Db, where: ReturnType<typeof and>): Promise<RankedRow[]> {
  const rows: BoardRow[] = await db
    .select({
      playerId: results.playerId,
      nickname: players.nickname,
      correct: results.correct,
      totalMs: results.totalMs,
    })
    .from(results)
    .innerJoin(players, eq(players.id, results.playerId))
    .where(where)
    .limit(ROW_CAP);
  return rankRows(bestPerPlayer(rows).slice(0, BOARD_LIMIT));
}

export function dailyLeaderboard(db: Db, format: Format, seed: number) {
  return boardFor(
    db,
    and(eq(results.format, format), eq(results.mode, "daily"), eq(results.seed, seed)),
  );
}

export function challengeLeaderboard(db: Db, challengeId: string) {
  return boardFor(db, eq(results.challengeId, challengeId));
}
