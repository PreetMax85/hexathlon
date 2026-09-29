# Build Log

Planning happened in a local Claude Code session. The research, product choice,
spec and plan were written before any code. Execution runs in Claude Code cloud
sessions, and each commit links to its session.

## Planning — done
- Product: Hexathlon, a Matiks-style competitive puzzle arena for hex-trading-game micro-skills.
- Why: nobody offers competitive, rated drills for these skills. Existing tools are placement calculators and game reviewers.
- v1 scope: Pip Flash, Port Math and Hand Tracker; Daily, Rush and Challenge links; Neon; Vercel.

## P0 — Scaffold — done
- What shipped: Next.js 16.3 (App Router, TS strict, Tailwind 4, ESLint 9) via `create-next-app`; Vitest 5; Drizzle ORM + drizzle-kit + `@neondatabase/serverless`; `pnpm check` (typecheck → lint → test); `src/engine/`, `src/app/`, `src/db/` layout; placeholder home page; README.
- Dependencies added (reasons):
  - `vitest`: unit test runner required by PLAN.
  - `drizzle-orm`, `drizzle-kit`: ORM and migrations required by PLAN.
  - `@neondatabase/serverless`: Neon Postgres driver required by PLAN.
- Decisions (and why):
  - Dropped `next/font/google` (Geist) for a system font stack: no network fetch at build time, faster first paint on phones.
  - `typecheck` runs `next typegen && tsc --noEmit` because layouts use Next's generated global `LayoutProps` type.
  - Vitest config is `vitest.config.mts` (ESM) and uses Vite 8's built-in `resolve.tsconfigPaths` for the `@/*` alias, so no `vite-tsconfig-paths` dependency.
  - `drizzle.config.ts` reads `DATABASE_URL_UNPOOLED` (direct URL) per PLAN P4; schema is a stub until P4.
  - `esbuild` added to pnpm `ignoredBuiltDependencies` (its postinstall only verifies the platform binary, which pnpm installs as an optional dependency).
- What broke and how it was fixed: `tsc` could not find `LayoutProps` → run `next typegen` first. Vite warned about ESM config loaded as CJS → renamed config to `.mts`.
- Tests: 1 passing
- Notes for next phase: engine code goes in `src/engine/`, tests co-located as `*.test.ts`.

## P1 — Engine core — done
- What shipped: `src/engine/rng.ts` (mulberry32 `createRng`, `hashString` = FNV-1a + murmur3 finaliser, `mixSeed`), `types.ts` (resources), `topology.ts` (static 19-hex axial topology: 54 vertices, 72 edges, vertex↔hex, vertex↔vertex, hex↔hex adjacency, clockwise coast ring), `board.ts` (`generateBoard(seed)`, `pips`, `vertexPips`, `redsSeparated`).
- Decisions (and why):
  - Pointy-top hexes on an integer lattice (X in √3/2 units, Y in 1/2 units) so shared corners dedupe exactly with no float rounding; `toCartesian` converts for SVG.
  - Hex, vertex and edge ids are in reading order (top→bottom, left→right), so ids are stable and independent of the seed; the board only carries terrain, tokens and ports.
  - 6/8 rule by rejection sampling of the token shuffle: uniform over valid layouts, simple, and fast (~1 in 6 passes).
  - Ports: the 9 port kinds are shuffled onto coastal edges with fixed gaps `3,3,4 ×3` (sums to the 30-edge coast) from a seeded rotation, so ports never share a vertex and are spread evenly.
  - Sub-seeds come from `mixSeed(seed, label)`, so board, puzzle choices and later formats draw from independent streams.
- What broke and how it was fixed: nothing.
- Tests: 20 passing
- Notes for next phase: use `vertexPips(board, v)` for Pip Flash; `TOPOLOGY.vertices[v].hexes.length` gives the land-hex count per vertex.

## P2 — Format generators and validators — done
- What shipped:
  - `formats/pipFlash.ts`: K candidates (A–F) touching ≥2 land hexes, unique max, tier gap and time limit; `validate` also takes `elapsedMs` so a timeout (or `null` answer) is wrong.
  - `formats/portMath.ts`: build costs, port trade rates, `optimalTrades` (BFS over hands, returns a shortest sequence), `greedyTrades` baseline, generator per tier, validator that replays the player's trades and requires legal trades + covered target + optimal count (any optimal sequence passes).
  - `formats/handTracker.ts`: event simulator (roll, build, trade, you-steal, rival-steal) with `applyEvent` refusing negative or >19 counts, `describeEvent` log lines, generator and validator.
  - `puzzles.ts`: `generate(format, tier, seed)`, `validate(puzzle, answer, elapsedMs?)`, `solve(puzzle)`, `rushSeeds(seed)` (13 × {tier, seed}, ramp 4 easy / 5 medium / 4 hard), `dailySeed(format, date)` = hash("daily", format, "medium", UTC YYYY-MM-DD), `utcDateKey`.
  - `purity.test.ts`: fails if any engine source imports a non-relative module (React, Next, DB, Node).
- Decisions (and why):
  - Validators take the answer as `unknown` and type-check it, because the server will feed them raw client JSON.
  - Answers: Pip Flash = candidate index or `null`; Port Math = `[{give, get}]`; Hand Tracker = one count per question.
  - Pip Flash candidates are also pairwise non-adjacent so A–F labels never overlap on a phone screen. A puzzle carries its full board; the board seed is `mixSeed(seed, "pip-flash-board", n)`.
  - **Greedy definition (SPEC §2.2 ambiguity).** Read literally: each step takes the single resource with the largest surplus (hand − target; ties → cheaper rate, then resource order) at its best rate, for the most-missing resource; if that pile can't pay, greedy is stuck (= ∞). A "smarter" greedy that skips unpayable piles was tried first and is *provably always optimal* (each trade yields exactly one card, so any finishing surplus-only strategy hits the deficit lower bound), which would make the hard-tier rule impossible. So hard puzzles are exactly those with a trap: a big pile you can't trade next to a smaller pile that you can.
  - Same argument gives a cheap filter: when greedy finishes it is optimal, so the hard generator rejects those candidates before running BFS.
  - Port Math hands are sampled constructively (target cost − planned deficit + payer piles sized in whole trades + odd leftovers), then the exact optimum is still computed by BFS. Pure random hands hit hard-tier puzzles ~0.3% of the time; this brings hard generation to ~3 ms.
  - Port Math targets: easy 1 build, medium 1–2, hard 2 (hard always owns ≥1 port). Hands never exceed 19 of a resource (bank size).
  - Hand Tracker: 7s are never rolled (the robber is out of scope); roll gains are 1–2 cards; the rival's trade rate comes from 0–2 random rival ports; questions only ask about resources the log actually changed. "You" isn't tracked, since only the rival's hand is asked about.
  - Rush item seeds = `mixSeed("rush", seed, i)`, so a challenge only needs to store one seed.
- What broke and how it was fixed:
  - Hard Port Math generation never finished with the smarter greedy (see above) → switched to the literal SPEC greedy.
  - Random hand sampling was ~50 ms/puzzle for hard → constructive sampler + greedy pre-filter.
  - BFS packed hands 5 bits per resource, which could overflow for big hands → 6 bits and a total-cards guard (trades never raise the total).
- Tests: 57 passing (500 seeds × 3 tiers × 3 formats: validity, tier rules, reference answer correct, perturbed answer wrong; BFS ≤ greedy everywhere and greedy > BFS on hard; BFS cross-checked by an independent depth-limited DFS).
- Notes for next phase: import everything from `@/engine`. Use `describeEvent` for the Hand Tracker feed, `CANDIDATE_LABELS` for Pip Flash, `tradeRate`/`applyTrade`/`targetCost`/`covers` for the Port Math trade UI, and `toCartesian` + `TOPOLOGY` for the SVG board.

## P3 — Game UI — done
- What shipped:
  - Engine: `run.ts` (`runItems`, `scoreRun`, `dailyRunSeed`, `MAX_PUZZLE_MS`). One shared scorer for client and (P4) server; Daily = 1 medium puzzle, Rush = 13.
  - `src/game/` (client logic, no React except `browser.ts`): run progress, local storage (player, Daily result per UTC date, Rush best), share text (`Hexathlon Rush · Port Math 11/13 · 2:41`), Port Math trade state, Hand Tracker phase clock, number pad, per-format answer verdicts.
  - `src/components/`: SVG `Board` (hexes, tokens + pips, ports, lettered tappable corners, reveal of pip totals), `PipFlashPlay` (timer bar, A–F keys), `PortMathPlay` (have/need table, tap-to-trade, undo, skip, build), `HandTrackerPlay` (reveal → log feed → 0–19 pad), `GameRun` (intro → 13-puzzle Rush or 1-puzzle Daily → result), `Result` (score, time, ✓/✗ strip, share), `FormatCard` + `HowToPlay` with a tappable live demo per format, `NicknameDialog`, `AppHeader`.
  - Routes: `/` and `/play/[format]/[mode]` (statically generated for all 6 combinations).
  - Verified in headless Chromium at 360 px and 1280 px: no horizontal scroll, full Pip Flash Rush to the result screen, Port Math and Hand Tracker flows, dark tokens defined.
- Decisions (and why):
  - No new dependencies. Screenshots used the globally installed Playwright, outside the repo.
  - Times: Pip Flash from board shown to tap; Port Math from screen shown to Build; Hand Tracker from when the question appears to the last answer (playback is fixed-length, so it is not the player's time).
  - Number pad answers on tap (one tap = locked in) for speed; hard tier asks its 2 questions in sequence.
  - Correct answers auto-advance after 1.2 s; wrong ones wait for a tap so the explanation (e.g. the optimal trade route) can be read.
  - Port Math has no time limit (SPEC gives none). Build is disabled until the hand covers the target; Skip counts as wrong.
  - Local-only until P4: nickname + random id in `localStorage`, Daily result keyed by UTC date (blocks a replay in the same browser), Rush best per format. "Challenge a friend" lands in P4; P3 has "Share result".
  - Emoji stand in for resource icons (no art, no IP risk); hex colours plus emoji so meaning is never colour-only.
  - Hydration-safe storage via `useSyncExternalStore` (server snapshot `undefined`), so no flash of wrong state and no set-state-in-effect.
  - Tests are logic-only (Vitest, node env, no DOM libs): trade state, phase clock, storage, scoring, verdicts. No snapshots.
- What broke and how it was fixed:
  - React 19 lint rules forbid `performance.now()`/refs during render and side effects in state updaters → clock read only in handlers/effects via `now()`; answer-once guard is a ref instead of an updater.
  - Port Math table columns misaligned and clipped at 360 px inside the nested How-to demo → fixed-width grid columns with `minmax(0,1fr)`, demo breaks out of card padding.
  - Corner labels hid neighbouring pips → smaller labels, 0.8-unit transparent hit area keeps 44 px+ tap targets.
  - `pkill -f` matched my own shell while restarting the preview server → target the process name.
- Tests: 82 passing
- Notes for next phase: `scoreRun(format, mode, seed, answers, times)` is the server recompute; for Daily also require `seed === dailySeed(format, today UTC)`. `LocalResult` shape in `src/game/storage.ts` mirrors the future API result. `GameRun` accepts `fixedSeed` for `/c/<id>`.

## P4 — Persistence and challenges — done
- What shipped:
  - `src/db/schema.ts` (players, challenges, results) + first migration in `drizzle/`, **applied to Neon** with `drizzle-kit migrate` over `DATABASE_URL_UNPOOLED` (the database was empty beforehand). `src/db/client.ts` uses `drizzle-orm/neon-http` on the pooled `DATABASE_URL`.
  - API: `POST /api/players`, `POST /api/results`, `GET /api/daily/<format>`, `POST /api/challenges`, `GET /api/challenges/<id>`. Server logic is layered: `server/verify.ts` (parse + recompute, pure), `server/leaderboard.ts` (pure), `server/store.ts` (DB), thin route files.
  - Client: `game/api.ts` (never-throwing fetch wrapper), `Leaderboard` (loading skeleton, error + retry, empty state), `ChallengeShare` ("Challenge a friend": create link, copy or share), `/c/[id]` page (`ChallengeClient`: loading, not-found, error states, then the same Rush). Runs are submitted the moment the last puzzle is answered; a Daily finished offline is resent when the page reopens.
  - `vercel.json` pins functions to `sin1`.
- Decisions (and why):
  - **The server never reads a claimed score.** The body carries only answers and times; `scoreRun` regenerates the puzzles from the seed and recomputes correctness. Unknown body fields are dropped by parsing.
  - Daily: seed must equal `dailySeed(format, today UTC)` exactly (else 409). One row per (player, format, daily seed) is enforced by a **partial unique index** (`WHERE mode = 'daily'`); a second submit returns 409 plus the first score. A run that straddles 00:00 UTC is rejected; acceptable for a 1-puzzle mode.
  - Challenges can only be created by a player who already has a server-verified Rush result for that seed, so seeds cannot be minted from nothing. Creating one attaches the creator's own result(s) so friends have a score to beat; creating twice returns the same id. Leaderboards show each player's best run (correct desc, then time), ties share a rank.
  - Player ids are effectively bearer secrets, so the API never returns them; leaderboards return a `mine` flag computed from an optional `?playerId=`.
  - `POST /api/players` is an upsert (create or rename). Nickname is cleaned server-side (control chars, whitespace, 20 chars).
  - No interactive transactions (neon-http has none); every write is a single statement and correctness comes from the unique indexes.
  - Body cap 16 KB; unexpected errors return generic JSON, a missing `DATABASE_URL` returns 503.
  - DB integration test (`store.db.test.ts`) writes `dbtest-` rows to a real database, so it only runs with `RUN_DB_TESTS=1` and cleans up after itself. Run once against Neon: 2/2 pass. It shows as skipped in plain `pnpm check`.
  - Dependencies: none added.
- What broke and how it was fixed:
  - `set-state-in-effect` lint on the offline Daily resend → split into `perform()` (async, returns the new sync state) and `send()` (sets "saving", then result); the effect only calls `perform().then(setSync)`.
  - `psql`-style parameter placeholders don't work with the neon `sql` tagged helper via `-e` args; used tagged template values instead (only for one-off DB inspection scripts).
- End-to-end check (real Neon, headless Chromium at 360 px, throwaway `e2e-` players, deleted afterwards; DB left empty): Daily play → saved → leaderboard; reload shows "already played" + board; Rush → challenge link → second player opens `/c/<id>`, plays the same 13 puzzles, both appear on the challenge leaderboard; unknown challenge shows the not-found state. Also curl-checked: bad shape → 400, unknown player → 404, wrong Daily seed → 409, challenge before a Rush result → 403.
- Tests: 102 passing (+2 DB integration tests run separately with `RUN_DB_TESTS=1`)
- Notes for next phase: `pnpm build` lists all API routes as dynamic. Rate limiting is not implemented (out of v1 scope). OG description/title polish and README are P5.

## P5 — Polish and ship — done
- What shipped:
  - Titles via a `%s · Hexathlon` template, per-route titles (`Pip Flash Rush`, `Rush challenge`), Open Graph + Twitter description, generated 1200×630 Open Graph image (`next/og`, no dependency), SVG favicon (`icon.svg`, replaces the default `favicon.ico`), light/dark `theme-color`.
  - `not-found.tsx`, `error.tsx`, `loading.tsx`; network states already covered by leaderboard skeleton/error/empty, challenge loading/not-found/error, and score-save retry.
  - Home is a 3-column grid at ≥1024 px (1-column at phone width); header width follows.
  - README: story, how it works (shared deterministic engine, server re-verification, unique Daily index), layout, env vars, tests summary.
- Decisions (and why):
  - `metadataBase` comes from `VERCEL_PROJECT_PRODUCTION_URL`, falling back to localhost so builds never need config.
  - Play and challenge pages stay a single centred column (max-w-xl) on desktop: the board and forms are the focus, and a wider layout only adds empty space.
  - Layout checked at 360 px and 1280 px for `/`, all play routes, `/c/<id>`, and 404: `scrollWidth` equals viewport width everywhere (no horizontal scroll); tap targets ≥ 44 px.
- What broke and how it was fixed: nothing new.
- Tests: 102 passing (+2 DB integration tests, run separately)
- Notes for next phase: v1 is complete per PLAN. v1.1+ ideas remain in PLAN. Not done on purpose: rate limiting, ratings, accounts.

## V0 — Setup — done
- What shipped: `pnpm install` + `pnpm check` green on `v1.1-chart-room`; screenshot browser ready; 12 "before" screenshots of v1 (home, one Rush play screen per format, Pip Flash Rush result, `/c/<unknown>`, each at 390 and 1440) in `.impeccable/review/before/`, with the script that took them (`shoot-before.mjs`).
- Decisions (and why):
  - **Screenshot route: step 1 (browser already on the VM).** The VM ships Playwright 1.56.1 globally with Chromium 141 in `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`). It launched headless first try, so steps 2 and 3 weren't needed. The script loads the global `playwright` via `createRequire(npm root -g)`, so `package.json` is unchanged and nothing is installed in the repo.
  - Before shots ran on `pnpm dev` without `DATABASE_URL` (as the plan allows), so the result screen shows "Score not saved: database not configured". A fake local player is seeded in `localStorage` to skip the nickname dialog. The Next dev indicator ("N") shows bottom-left; after shots use `next start` instead.
- What broke and how it was fixed: nothing.
- Tests: 102 passing (+2 DB tests skipped without `RUN_DB_TESTS=1`)
- Notes for next phase: run shots with `NP=$(npm root -g) node <script>`; browser at `/opt/pw-browsers`.

## V1 — Engine and server game rules — done
- What shipped (all test-first):
  - Pip Flash `timeLimitMs` 7000 / 8000 / 10000.
  - Hand Tracker: `secondsPerEvent` replaced by `eventDurationsMs`, one per event, from `eventDurationMs(event, tier)` = words × 60000 / wpm (180 / 220 / 260) + update time (You-only roll 500, rival gain or steal 1000, trade 1500, build 2000). Hard has 20 events and 2 questions. `handTrackerPlaybackMs` = preview + all events. Measured averages over 200 seeds sit inside the brief's ~3.5 / 3.0 / 2.6 s per event (asserted as ranges).
  - Daily = 5-puzzle mini-run (`dailyItems`: easy, easy, medium, medium, hard; seeds `mixSeed("daily-run", seed, i)`). `runItems`, `scoreRun` and server verification all go through it.
  - Minimum-time floor: `minPuzzleMs(puzzle)` = Hand Tracker playback length (preview + events), 300 ms otherwise. `scoreRun` returns null for any time under it, so `POST /api/results` answers 400. Tests: a scripted 0 ms run is rejected in every format and mode; one puzzle 1 ms under its floor rejects the whole run; exactly the floor passes.
  - Daily straddling midnight: `dailyDatesAt(now)` accepts yesterday's Daily seed for 15 minutes after 00:00 UTC (was: rejected).
- Decisions (and why):
  - **Hand Tracker time now runs from the preview to the last answer** (v1: from the question). The floor "≥ playback + preview" only makes sense on that clock. Everyone on the same seed gets the same playback, so rankings between them are unchanged.
  - **Word count ignores "—" and "→"** (a word must contain a letter or digit). That matches the brief's "6 words on average, max 8" figure.
  - **New Daily seed tag** (`"mini-run-5"` replaces the v1 `"medium"` in the hash). Production still holds v1 1-puzzle Daily rows keyed by seed; a fresh tag means a v1.1 Daily can never share a leaderboard, or the unique index, with a v1 row, including on deploy day. **No schema change or migration**: the partial unique index (player, format, seed WHERE mode = 'daily') is still exactly "one Daily per player per format per day", and `drizzle-kit generate` reports no changes, so nothing touches production's existing rows.
  - Straddling runs: with 5 puzzles, a Daily started at 23:58 is likely to finish after midnight. A 15-minute grace is long enough for a real run and too short to replay a leaked seed meaningfully (the unique index still allows one attempt per seed).
  - Client: `GameRun` rounds each recorded time up to `minPuzzleMs`, so a very quick Skip can't get an honest run rejected. It only adds time, so it never helps a score.
  - `marksSoFar` validates each answered puzzle directly instead of scoring a zero-padded run (zero padding would now trip the floor).
  - Relaxed mode: results stay local, so no server or schema change; the V2 client scores them against doubled limits.
  - ESLint now ignores `.claude/**` and `.impeccable/**` (vendored skill scripts produced 94 warnings that weren't app code).
- What broke and how it was fixed: `marksSoFar` returned `[]` once the floor landed (padded zeros → `scoreRun` null) → per-puzzle validation. Tests with fixed 1000–1500 ms times were below the Hand Tracker floor → they now use `minPuzzleMs + 1 s`.
- DB: migrated the empty dev branch (`v1-1-dev`) with the existing migration; `RUN_DB_TESTS=1` → 2/2 pass. No new migration.
- Tests: 124 passing (+2 DB tests, pass with `RUN_DB_TESTS=1`)
- Notes for next phase: `HandTrackerPuzzle.eventDurationsMs` drives playback; Relaxed doubles durations and limits on the client only.
