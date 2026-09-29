# Hexathlon

A skill gym for the micro-skills of hex-board trading games: reading pips
fast, trading efficiently at ports, and tracking a rival's hand. Short timed
formats, a 5-puzzle Daily, 13-puzzle Rush runs and friend challenges.
Mobile-first, no AI at runtime.

| Format | Skill | You do | Clock (easy / medium / hard) |
|---|---|---|---|
| **Pip Flash** | Reading the board | Tap the corner touching the most pips | 7 / 8 / 10 s per board |
| **Port Math** | Trade efficiency | Reach a build in the fewest bank/port trades | None; time only breaks ties |
| **Hand Tracker** | Card counting | Follow a game log, then count your rival's cards | 3 s preview, then 8 / 12 / 20 log lines paced for reading (≈3.0 / 2.7 / 2.5 s each) |

Modes: **Daily** (5 puzzles per format per UTC day: 2 easy, 2 medium, 1 hard;
the same for everyone; one scored attempt), **Rush** (13 puzzles, easy → hard),
and **Challenge links** (`/c/<id>`) so friends play the same 13 puzzles.

Game feel: every puzzle starts with a short steady beat before its clock
runs; you can pause between puzzles (never during one); Skip and Quit ask
once more inline; right answers build a combo; a streak ("days at sea")
counts consecutive days with a Daily. **Relaxed mode** doubles every limit and
lets the Hand Tracker log step on tap; relaxed runs stay on your device and
are never ranked.

## Design: the Chart Room

Every puzzle is a chart of one island. The board sits on a nautical chart
plate: shoal bands that follow the coast, seed-derived depth soundings in the
sea, ports as magenta harbour notes, graticule ticks on the neatline that
frames every screen. The board owns the saturated colours; the chrome is chart
white and sounding ink, with chart magenta for lights, notes and focus.

- The Pip Flash timer is a **range ring**: a bearing line sweeps once around
  the island over the time limit (a stepped arc under reduced motion).
- Verdicts are **buoys** by shape, not just colour: a green cone for right, a
  red can for wrong, dropped onto the corner you chose.
- The combo reads like a **lighthouse characteristic**, `Fl(4)`, and the lamp
  flashes once per step.
- A finished run is stamped **"Passage complete"** with score, time and the
  chart's edition date; tap any buoy in the strip to replay that puzzle.
- Share cards are chart snippets: the island, the score in the cartouche, the
  date as the edition.
- Day, dusk and night palettes (dimmed, ECDIS-style) follow the system or a
  header switch. Type is Archivo, using its width axis and italic for sea labels.

The direction contract lives in `.impeccable/surfaces/src-app.md` and the
design system in `DESIGN.md`.

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
  never read. Daily seeds must match today's UTC seed (or yesterday's for 15 minutes after midnight, so a run that straddles 00:00 still counts), challenge runs must match
  the challenge's seed, and Port Math answers are replayed trade by trade.
- **Fair Dailies.** A partial unique index in Postgres allows one Daily result per
  player, format and daily seed.
- **A human time floor.** Each puzzle time must be at least 300 ms, and a Hand
  Tracker time at least its preview plus playback, so a scripted 0 ms run is
  rejected.
- **No accounts.** Play straight away; a nickname is asked for when you first
  put a score on a board. A random player id lives in `localStorage`. Player
  ids are never returned by the API.

```
src/engine/      pure game engine: rng, topology, board, formats, run scoring
src/game/        client logic: run flow, ready beat, pad, combos, streaks, Relaxed, storage, API client
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
- **Client logic**: trade state, Hand Tracker phase clock and tap-paced log,
  ready beat, pause flow, inline confirm, number pad, combos, streaks and Today
  data, Relaxed scoring, storage, API client, share text, soundings.
- **Database integration** (`RUN_DB_TESTS=1 pnpm vitest run src/server/store.db.test.ts`):
  Daily uniqueness and challenge leaderboards against a real Postgres, with
  cleanup. Skipped unless enabled.

## Known limitations

- **Client times are still reported by the client.** The server recomputes
  correctness from the seed and enforces time floors and the Pip Flash limit,
  but inside those bounds it trusts the reported times, which only break ties.
  A modified client could claim a faster (still plausible) time. Server-issued
  start tokens would close most of that gap and are not built yet.
- A Daily seed is predictable once the date is known, so a player could study
  tomorrow's puzzles offline; the one-attempt rule only limits scored tries.
- No rate limiting on the API.
- Relaxed results are unranked by design and live only in the browser.

See [`docs/SPEC.md`](docs/SPEC.md) for the v1 spec,
[`PRODUCT.md`](PRODUCT.md) and [`docs/PLAN-v1.1.md`](docs/PLAN-v1.1.md) for
v1.1.
