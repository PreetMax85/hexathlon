import { getDb } from "@/db/client";
import { dailySeed, isFormat, utcDateKey } from "@/engine";
import { handle, HttpError, json } from "@/server/http";
import { publicRows } from "@/server/leaderboard";
import { viewerFrom } from "@/server/viewer";
import { dailyLeaderboard } from "@/server/store";

/** Today's Daily leaderboard: correctness first, then time. */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/daily/[format]">) => {
  const { format } = await ctx.params;
  if (!isFormat(format)) throw new HttpError(404, "unknown format");
  const date = utcDateKey(new Date());
  const seed = dailySeed(format, date);
  const entries = await dailyLeaderboard(getDb(), format, seed);
  const viewer = viewerFrom(req);
  return json({ format, date, seed, entries: publicRows(entries, viewer) });
});
