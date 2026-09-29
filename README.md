# Hexathlon

A competitive puzzle arena for the micro-skills of hex-board trading games:
reading pips fast, trading efficiently at ports, and tracking a rival's hand.
Short formats, a Daily puzzle, 13-puzzle Rush runs and friend challenges.
Mobile-first, no AI at runtime.

| Format | Skill | You do |
|---|---|---|
| **Pip Flash** | Reading the board | Tap the corner touching the most pips before the timer ends |
| **Port Math** | Trade efficiency | Reach a build in the fewest bank/port trades |
| **Hand Tracker** | Card counting | Follow a game log, then count your rival's cards |

Modes: **Daily** (one puzzle per format per UTC day, same for everyone, one
scored attempt), **Rush** (13 puzzles, Easy → Hard), and **Challenge links**
(`/c/<id>`) so friends play the same 13 puzzles.

## The story

Hexathlon was built end to end with [Claude Code](https://claude.ai/code) in
cloud sessions. A local session did the research and wrote the spec and plan
first (`docs/SPEC.md`, `docs/PLAN.md`); after that, cloud sessions executed the
phases P0–P5 one by one under the rules in `CLAUDE.md`: read the spec, follow
the plan, one focused commit per change, `pnpm check` green before every
commit, and a log entry per phase. Every decision, dead end and fix is in
[`docs/BUILD_LOG.md`](docs/BUILD_LOG.md), and each commit links back to its
session.

## How it works

Everything is generated from an integer seed by a small deterministic PRNG, so
the same seed gives an identical board and puzzle on every device.

- **A shared, pure engine.** `src/engine/` is plain TypeScript with no React,
  Next or database imports (a test enforces this). It holds the board and
  topology, the three puzzle generators, and `validate(puzzle, answer)`. The UI
  and the API import the same code.
- **The server re-verifies every score.** The client submits only
  `{format, mode, seed, answers, times}`. The server regenerates the puzzles from
  the seed and recomputes correctness with the same engine; a claimed score is
  never read. Daily seeds must match today's UTC seed, challenge runs must match
  the challenge's seed, and Port Math answers are replayed trade by trade.
- **Fair Dailies.** A partial unique index in Postgres allows one Daily result per
  player, format and daily seed.
- **No accounts.** The first visit asks for a nickname; a random player id lives
  in `localStorage`. Player ids are never returned by the API.

```
src/engine/      pure game engine: rng, topology, board, formats, run scoring
src/game/        client logic: run state, storage, share text, API client
src/components/  React UI: SVG board, players for each format, results, boards
src/app/         pages (/, /play/[format]/[mode], /c/[id]) and API routes
src/server/      request parsing, verification, leaderboards, DB access
src/db/          Drizzle schema and Neon client
drizzle/         SQL migrations
```

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # typecheck + lint + tests
pnpm build        # production build
```

The game itself needs no setup. Scores, leaderboards and challenges need a
database. Set these in your environment (never commit them):

- `DATABASE_URL`: the **pooled** Neon URL, used by the app at runtime.
- `DATABASE_URL_UNPOOLED`: the **direct** URL, used only by `drizzle-kit`.

```bash
pnpm db:migrate   # apply migrations in ./drizzle
```

Without `DATABASE_URL` the API answers `503` and the UI keeps working with
local-only results, showing "score not saved" with a retry.

## Tests

`pnpm test` runs Vitest (logic tests, no snapshots):

- **Engine** (topology counts, distributions, 6/8 separation over 1,000 seeds,
  determinism; for 500 seeds per format and tier the puzzle is valid, tier rules
  hold, the reference answer validates and a perturbed one fails; Port Math BFS
  optimum ≤ greedy everywhere and greedy is beaten on hard).
- **Run scoring** shared by client and server, including forged answers and
  Pip Flash time limits.
- **Server**: request parsing, the Daily-seed and challenge rules, leaderboard
  ranking, no player ids in responses.
- **Client logic**: trade state, Hand Tracker phase clock, storage, API client,
  share text.
- **Database integration** (`RUN_DB_TESTS=1 pnpm vitest run src/server/store.db.test.ts`):
  Daily uniqueness and challenge leaderboards against a real Postgres, with
  cleanup. Skipped unless enabled.

See [`docs/SPEC.md`](docs/SPEC.md) for the product spec and
[`docs/PLAN.md`](docs/PLAN.md) for the build plan.
