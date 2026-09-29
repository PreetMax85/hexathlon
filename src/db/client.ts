import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = ReturnType<typeof makeDb>;

function makeDb(url: string) {
  return drizzle(url, { schema });
}

let cached: Db | null = null;

/** Pooled Neon connection (DATABASE_URL). Throws if the env var is missing. */
export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  cached = makeDb(url);
  return cached;
}
