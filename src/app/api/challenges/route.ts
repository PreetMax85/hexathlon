import { getDb } from "@/db/client";
import { handle, HttpError, json, readJson } from "@/server/http";
import { createChallenge, getPlayer, hasRushResult } from "@/server/store";
import { parseChallengeBody } from "@/server/verify";

/**
 * Turn a finished Rush into a challenge link. The creator must already have a
 * server-verified result for the seed, so seeds cannot be minted from nothing.
 */
export const POST = handle(async (req: Request) => {
  const parsed = parseChallengeBody(await readJson(req));
  if (!parsed.ok) throw new HttpError(parsed.status, parsed.error);
  const { playerId, format, seed } = parsed.value;
  const db = getDb();
  if (!(await getPlayer(db, playerId))) throw new HttpError(404, "unknown player");
  if (!(await hasRushResult(db, playerId, format, seed))) {
    throw new HttpError(403, "finish this Rush before challenging friends");
  }
  const id = await createChallenge(db, { playerId, format, seed });
  return json({ id }, 201);
});
