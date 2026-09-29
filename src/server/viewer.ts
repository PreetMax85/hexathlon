import { PLAYER_ID } from "./verify";

/** The viewing player's id from `?playerId=`, if present and well-formed. */
export function viewerFrom(req: Request): string | null {
  const id = new URL(req.url).searchParams.get("playerId");
  return id && PLAYER_ID.test(id) ? id : null;
}
