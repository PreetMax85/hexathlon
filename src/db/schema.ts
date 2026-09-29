import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const seed = (name: string) => bigint(name, { mode: "number" }).notNull();

/** SPEC §4. No accounts: the id is a random string the browser keeps in localStorage. */
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const challenges = pgTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    format: text("format").notNull(),
    seed: seed("seed"),
    createdBy: text("created_by")
      .notNull()
      .references(() => players.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("challenges_creator_run_unique").on(t.createdBy, t.format, t.seed)],
);

export const results = pgTable(
  "results",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    format: text("format").notNull(),
    mode: text("mode").notNull(),
    seed: seed("seed"),
    challengeId: text("challenge_id").references(() => challenges.id),
    correct: integer("correct").notNull(),
    totalMs: integer("total_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One scored Daily attempt per (player, format, daily seed). The Daily
    // seed encodes the UTC date, so this is one per player per format per day.
    uniqueIndex("results_daily_unique")
      .on(t.playerId, t.format, t.seed)
      .where(sql`${t.mode} = 'daily'`),
    index("results_daily_board").on(t.format, t.mode, t.seed),
    index("results_challenge").on(t.challengeId),
  ],
);

export type PlayerRow = typeof players.$inferSelect;
export type ChallengeRow = typeof challenges.$inferSelect;
export type ResultRow = typeof results.$inferSelect;
