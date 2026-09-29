import { getDb } from "@/db/client";
import { handle, HttpError, json } from "@/server/http";
import { publicRows } from "@/server/leaderboard";
import { viewerFrom } from "@/server/viewer";
import { challengeLeaderboard, getChallenge } from "@/server/store";
import { CHALLENGE_ID } from "@/server/verify";

/** A challenge's format and seed, plus its leaderboard. */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/challenges/[id]">) => {
  const { id } = await ctx.params;
  if (!CHALLENGE_ID.test(id)) throw new HttpError(404, "challenge not found");
  const db = getDb();
  const challenge = await getChallenge(db, id);
  if (!challenge) throw new HttpError(404, "challenge not found");
  const entries = await challengeLeaderboard(db, id);
  return json({
    id: challenge.id,
    format: challenge.format,
    seed: challenge.seed,
    createdBy: challenge.createdBy,
    entries: publicRows(entries, viewerFrom(req)),
  });
});
