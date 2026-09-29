import { getDb } from "@/db/client";
import { handle, HttpError, json, readJson } from "@/server/http";
import { getChallenge, getPlayer, saveResult } from "@/server/store";
import { dailyDatesAt, parseResultBody, verifyResult } from "@/server/verify";

/**
 * Submit a run. The server regenerates every puzzle from the seed and
 * recomputes correctness itself; nothing the client claims about its score is
 * read.
 */
export const POST = handle(async (req: Request) => {
  const parsed = parseResultBody(await readJson(req));
  if (!parsed.ok) throw new HttpError(parsed.status, parsed.error);
  const body = parsed.value;
  const db = getDb();

  const player = await getPlayer(db, body.playerId);
  if (!player) throw new HttpError(404, "unknown player");
  const challenge = body.challengeId ? await getChallenge(db, body.challengeId) : null;

  const verified = verifyResult(body, { dailyDates: dailyDatesAt(new Date()), challenge });
  if (!verified.ok) throw new HttpError(verified.status, verified.error);
  const { correct, totalMs, marks } = verified.value;

  const saved = await saveResult(db, {
    playerId: body.playerId,
    format: body.format,
    mode: body.mode,
    seed: body.seed,
    challengeId: body.challengeId,
    correct,
    totalMs,
  });
  if (!saved.saved) {
    throw new HttpError(409, "Daily already played", { existing: saved.existing });
  }
  return json({ id: saved.id, correct, total: marks.length, totalMs, marks }, 201);
});
