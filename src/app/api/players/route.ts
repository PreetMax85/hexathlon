import { getDb } from "@/db/client";
import { handle, HttpError, json, readJson } from "@/server/http";
import { upsertPlayer } from "@/server/store";
import { parsePlayerBody } from "@/server/verify";

/** Create a player, or update the nickname of an existing id. */
export const POST = handle(async (req: Request) => {
  const parsed = parsePlayerBody(await readJson(req));
  if (!parsed.ok) throw new HttpError(parsed.status, parsed.error);
  await upsertPlayer(getDb(), parsed.value);
  return json(parsed.value, 201);
});
