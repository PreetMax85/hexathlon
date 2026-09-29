CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"format" text NOT NULL,
	"seed" bigint NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"format" text NOT NULL,
	"mode" text NOT NULL,
	"seed" bigint NOT NULL,
	"challenge_id" text,
	"correct" integer NOT NULL,
	"total_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_creator_run_unique" ON "challenges" USING btree ("created_by","format","seed");--> statement-breakpoint
CREATE UNIQUE INDEX "results_daily_unique" ON "results" USING btree ("player_id","format","seed") WHERE "results"."mode" = 'daily';--> statement-breakpoint
CREATE INDEX "results_daily_board" ON "results" USING btree ("format","mode","seed");--> statement-breakpoint
CREATE INDEX "results_challenge" ON "results" USING btree ("challenge_id");