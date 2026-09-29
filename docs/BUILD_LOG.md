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

## V2 — Game-feel flows — done
- What shipped (logic in `src/game/`, each module with Vitest tests; components only wire it):
  - `beat.ts`: 600 ms ready beat. `usePuzzleClock` shows the puzzle, ignores taps and keys during the beat, and measures answer time from clock start, not mount.
  - Intro screens: `introTiming(format, relaxed)` states each tier's clock before play ("7 s easy · 8 s medium · 10 s hard"; Port Math "No time limit. Your total time only breaks ties."; Hand Tracker preview + events + pace). Daily intro says "5 puzzles: 2 easy, 2 medium, 1 hard".
  - `runFlow.ts`: between-puzzle reducer (`puzzle → verdict → paused`). Pause exists only on the verdict and stops the auto-advance; resuming starts the next puzzle behind its ready beat. Leaving the tab doesn't stop a running clock (it's `performance.now()`-based).
  - `confirm.ts` + `useConfirm`: Skip (Port Math) and Quit ✕ arm on the first tap ("Skip? Tap again" / "Quit?") and fire on a second within 3 s; no modal.
  - `numberPad.ts`: Hand Tracker pad is select → Confirm. Digit keys select (two quick digits make 10–19, "2 then 5" is 5), Enter confirms, Backspace clears.
  - Hand Tracker shows only the current log line. Screen readers get one `logSummary` when playback ends ("Log finished: 8 events. How many wood does Rival hold? Choose 0 to 19, then confirm."), not every line live.
  - `combo.ts`: combo in the run header written as a light characteristic (`Fl`, `Fl(4)`); display only, resets on a wrong answer. Right answers also get `navigator.vibrate` (skipped under reduced motion).
  - `today.ts`: streak ("Days at sea") = consecutive UTC days with a finished Daily, stored locally (`hexathlon:days`), alive until today ends. `todayStatus` feeds a Today strip at the top of home (three Dailies, done/open with score and time, streak). `untilNextDaily` + `formatCountdown` for the "next Daily in" line.
  - `best.ts`: Rush result compares to the previous local best (first / better / equal / worse, with deltas).
  - Nickname: no modal on arrival or on `/c/<id>`. Anyone can play; the first scored result shows an inline "Put your score on the board" form, then sends. An unsent Daily is still resent on revisit.
  - `relaxed.ts` + `settings.ts`: Relaxed mode toggle on every intro, remembered per player. Doubles Pip Flash limits and Hand Tracker preview and event durations; Hand Tracker playback advances on tap ("Start the log", "Next line", Space/Enter). Results are labelled "Relaxed, unranked", never sent, never set the Rush best; scored locally with `finalScore(..., { relaxed: true })` (times halved onto the ranked clock, so the shared scorer and floor still apply).
- Decisions (and why):
  - **Hand Tracker pace copy uses measured numbers.** Over 500 seeds per tier the engine averages 3.0 / 2.7 / 2.5 s per event, a bit under the brief's rough 3.5 / 3.0 / 2.6. The intro states the measured values; V1's formula is the brief's own, so I kept it rather than padding it.
  - **Relaxed Hand Tracker is tap-paced only** (not "doubled or tap"). The brief says both; tap-only is the one that actually meets WCAG 2.2.1 for players who need it, and doubled durations still define the local floor.
  - **A Relaxed Daily uses today's Daily slot and counts for the streak.** The player has seen today's puzzles, so a scored attempt afterwards wouldn't be fair; the streak rewards coming back, which Relaxed players do too.
  - Pausing ends at the next puzzle's ready beat, not back on the old verdict: the verdict was already read.
  - The Rush result's "tap a missed puzzle to replay its reveal" is part of the result screen build in V3.
- What broke and how it was fixed: nothing notable; `HomeNickname` removed with the arrival modal.
- Checked in headless Chromium at 390 px on the dev DB: no modal on home; a key press during the ready beat is ignored; pause shows only on the verdict; nickname asked at the result, then "Score saved"; Hand Tracker shows one log line, announces the summary, "1","2" → "Confirm 12", Enter submits; Quit arms then navigates home; Today strip shows "Done · 4/5" and "Days at sea: 1". No console errors.
- Tests: 155 passing (+2 DB tests)
- Notes for next phase: V3 restyles all of this; behaviour lives in `src/game/` and the hooks in `useClock.ts`.

## V3 — Chart Room build — done
- What shipped (direction contract in `.impeccable/surfaces/src-app.md`, code-led):
  - **World**: chart-white paper, sounding ink, shallow-water cyan fading to white deep water, chart magenta for lights, notes and focus, IALA green/red for verdicts only. Tokens in `globals.css`; **day, dusk and night** palettes (dusk follows `prefers-color-scheme: dark`; a header switch cycles Auto → Day → Dusk → Night, stored locally and applied pre-paint by a tiny inline script). Dusk and night dim the land layer with a CSS filter, never the tokens.
  - **Type**: Archivo (OFL), self-hosted via `next/font/local` with its width axis (62–125%) and true italic. Chrome uses three sizes (`text-s`/`m`/`l`); rank comes from weight, case, width and italic (water and section names are italic, as on a chart).
  - **Frame**: a neatline (double rule plus latitude scale bar) around every screen; the header is the cartouche ("HEXATHLON · 29 SEP 2026").
  - **Board plate**: shoal bands that follow the coast, seeded depth soundings (`game/chart.ts`, deterministic per board), graticule ticks on the plate's border, ports as magenta harbour notes, authored terrain glyphs on each hex.
  - **Critique board fixes**: pips at r 0.058 units (~3 px dots at 360 px) on bigger tokens; lettered waypoints sit on the corners with a clear gap to every token; waypoint focus draws a magenta ring (SVG groups ignore `outline`); verdicts by **shape** (cone right, can wrong) as well as colour; 44 px hit areas that never overlap.
  - **Required play moments**: (1) range-ring sweep timer around the Pip Flash board (magenta remaining arc, bearing line sweeping clockwise from north; reduced motion steps once a second); (2) buoy verdicts drop onto the chosen corner and bob once, with a pulse on a right answer (no bob under reduced motion); (3) combo as a light characteristic "Fl(4)" whose lamp flashes once per step; (4) "Passage complete" stamp (score, time, edition date) that presses onto the result, then the buoy strip where **tapping any puzzle replays its reveal** (the first miss opens automatically); (5) share cards: `opengraph-image` and a per-challenge `/c/[id]/opengraph-image` render a chart snippet (island, the score to beat stamped in the cartouche, edition date); the share text reads "Hexathlon Rush · Port Math 11/13 · 2:41 · Ed. 29 SEP 2026" with a ▲/■ buoy strip.
  - **Routes and states**: home (island plate from today's Pip Flash Daily, Today's Dailies with buoys and days at sea, primary action "Sail the … Daily" pinned in the thumb zone, then Sailing Directions), play for all three formats, paused, Rush and Daily results, already-played Daily with the countdown, `/c/[id]` loading and a proper not-found ("ED, existence doubtful"), nickname form, 404 ("Off the chart"), error, loading, empty and error leaderboards. Disabled controls use restricted-area hatching, never opacity.
  - No emoji anywhere in the UI: authored 24-unit SVG glyphs for the five resources, desert and the four builds, drawn icons for quit, theme and chevrons.
- Decisions (and why):
  - **Face: Archivo.** The contract asked for a workhorse grotesque with a width axis and tabular figures, not on the default list. Archivo has both, plus a true italic for sea labels; condensed widths set the big numerals, expanded widths the cartouche.
  - **Waypoints, not light characters, for Pip Flash markers**: a circled letter reads at 360 px; a light characteristic label would need two lines per corner.
  - Tiers are depth marks (1–3 bars, ink) so they never borrow the verdict colours.
  - The Hand Tracker log progress uses a small range dial rather than a second full ring; the full ring stays Pip Flash's signature.
  - OG cards use static Archivo TTFs (Satori reads TTF/OTF only); ~350 KB of fonts in the image bundle, under the 500 KB limit. The challenge card falls back to a generic card without a database.
  - Contrast checked numerically for every text pairing in all three palettes (≥ 4.5:1; e.g. ink-2 on paper 6.6, magenta 5.3, night ink-2 5.2, night red token 4.9).
- What broke and how it was fixed: Satori picked the italic face for everything when both shared a family name → separate family names. The challenge not-found buttons wrapped at 390 px → stacked on phones.
- Engine untouched in this phase.
- Tests: 161 passing (+2 DB tests)
- Notes for next phase: `/tmp/shots/peek.mjs` was only a smoke check; V4 runs the batched round.

## V4 — Inspect and finish — done
- What shipped: `.impeccable/review/shoot.mjs` (one batched capture of every route and state at 390 and 1440 on `next start`: home first visit / returning / after a Daily / dusk / night / thumb-zone viewport, intros incl. Relaxed, the lead play screen `mobile.png`/`desktop.png`, Pip Flash verdict, run header mid-combo, Port Math and its skip confirm, Hand Tracker log / pad / Relaxed, paused, reduced motion, Rush result, Daily result with the nickname prompt, already-played Daily, challenge not found, 404, and both share cards). No page errors and no horizontal scroll in any capture. `DESIGN.md` and `.impeccable/design.json` written by the documenter from the built world.
- Rounds: round 1 found the timer reading 0.0 after an answer, buoys covering tokens and the combo lamp stuck dim → fixed; round 2 confirmed. Detector (`impeccable detect --json src/app src/components`) returned no findings.
- Finish review (`impeccable-finish-reviewer`): disposition **fix** with 8 material fixes (combo not evidenced, verdict plates on tokens, share card not a chart plate / undated, kicker lines, thumb-zone action unverified, result spacing, hatching through labels, bearing drawn as a rim tick only). All applied in one batch. Verdict pass: **7 resolved, 1 partial** (share card lacked port icons) plus 2 regressions (displaced terrain glyphs on shared corners, soundings under port labels). That was the two-round budget for an unattended run, so those three were fixed without a third review and are **not reviewer-verified**; the recapture shows them fixed.
- Documenter drift notes acted on: the night primary button was the brightest plate on screen → new `--action`/`--on-action` tokens (dim plate at night, 4.95:1); share-card port labels squared.
- Critique re-run (dual isolated agents): **30/40**, up from v1's **26/40** (0 P0, 2 P1). Snapshot `.impeccable/critique/2026-09-29T16-38-00Z__src-app.md`. Acted on after scoring (not re-scored): verdicts now name the player's own pick or count ("You picked A: 6 pips. B had 9."), the combo leads with "×N" from 2 captioned "Fl(N)", a played Daily shows a neutral ink tick (cones mean "right"), scores under 60 % stamp "Rough passage", the primary hover only applies on hover-capable devices, the palette switch is 44 px wide.
- Decisions (and why):
  - The review's replay covers every puzzle, not only misses (the first miss opens automatically): reviewing a lucky right answer is also practice, and the strip stays one control.
  - The share card's OG route regenerates hourly (`revalidate = 3600`) so its island and edition date follow the day.
  - `outputFileTracingIncludes` ships the share-card TTFs with the OG functions.
- What broke and how it was fixed: Satori rejects `border-style: double` → two nested rules; the capture's answer-learning pass broke when the verdict copy changed → regex updated; an old `next start` kept serving a stale build after a rebuild → restart by PID.
- Left for the owner (critique P2s, not done): keep Pause reachable after a right answer (the 1.2 s auto-advance) and focus Next after keyboard answers; bring Hand Tracker / Paused / intro actions down into the thumb zone; a "Challenge a friend" path from the Daily result; the timer's low-time red reuses the "wrong" colour.
- Tests: 172 passing (+2 DB tests)

## V5 — Architecture, review and PR — done
- Architecture (`improve-codebase-architecture` on `src/components` + `src/game`, applied without the interactive grilling loop since the run is unattended):
  - Applied: **`finishRun`** (`src/game/finishRun.ts`, tested) now owns end-of-run bookkeeping (score, Daily slot + streak, Rush best comparison, submission body), which lived inline in `GameRun`; **`dailyResubmission`** replaces two hand-built copies of the resend body; **`recordedTime`** (floor rounding, tested) moved out of `GameRun`; **`tierRamp`** derives "easy 1–4, medium 5–9, hard 10–13" / "easy 1–2, medium 3–4, hard 5" from `runItems` instead of hard-coded copy; the `handPlaybackMs` pass-through was deleted in favour of the engine's `handTrackerPlaybackMs`; `browser.ts` shares one snapshot KV and one reduced-motion query.
  - Not applied (listed for later): one plate-geometry module shared by `Board.tsx` and the share card (`hexPoints`, port offsets, sounding exclusions are near-copies); a `useRunSync` module for the submit / retry / conflict flow still in `GameRun`; a generic `useStored(key, read)` hook for the five storage hooks; one "first board of a run" helper (home plate and challenge card both derive it); a per-format strategy map to replace the `switch (puzzle.format)` repeated in `relaxed.ts`, `introTiming`, `minPuzzleMs` and the render.
- Code review (`code-review` from `origin/main`, two isolated axes):
  - Standards: no hard violations (engine purity, server re-verification, no secrets or new deps, IP rule clean). Fixed: **a real bug**: in Relaxed Pip Flash a tap under 600 ms was rounded to the 300 ms floor then halved to 150 ms by relaxed scoring, so `finishRun` rejected the whole run; the floor now doubles in Relaxed (`recordedTime`, test added). Also fixed the duplicated submission body, hard-coded tier copy, the magic soundings salt (now `mixSeed(seed, "soundings")`), two components both named `IslandPlate`, the share-card renderer living in `src/components` while reading from disk (moved to `src/app/_og/`), the hand-written theme list in the boot script, and a stale pace note in an engine test.
  - Spec: fixed challenge share text missing the edition date and buoy strip; the stamp now uses the run's own date (a Daily finished in the midnight grace window keeps its day); the Today strip shows the next-Daily countdown as soon as one Daily is played; Hand Tracker shows the hand during the ready beat (not a "Steady…" placeholder); Relaxed Hand Tracker intro copy now says "one per tap"; README states the Daily grace window. **Screen readers and Hand Tracker**: timed playback still announces one summary (the brief), but the log lines were fully hidden from assistive tech, so the format wasn't playable by ear; Relaxed (tap-paced) playback now announces each line as the player steps to it.
  - Recorded as deliberate (no change): replay offered for every puzzle; the palette switch; the 15-minute Daily grace; Relaxed Daily uses the day's slot.
- README: formats with per-tier clocks, Daily mini-run, game feel and Relaxed mode, a "Design: the Chart Room" section, the time floor, and "Known limitations" (client-reported times inside the floors, predictable Daily seeds, no rate limiting, Relaxed results local only).
- Dev database: the review scripts wrote throwaway `review-…`, `critique-b-…` and `Chartwell` rows (and one challenge) to the `v1-1-dev` branch only; production was never touched.
- Tests: 172 passing (+2 DB tests pass with `RUN_DB_TESTS=1`)
- Notes: PR to `main` opened with before/after screenshots. Not merged, not deployed.

## v1.2 — Board and feel (owner review) — done
- What shipped:
  - **Board**: soundings, graticule, neatline and the range ring removed; the island sits in a plain sea with one shore band and fills the width on phones (bleeds to the screen edges). Tokens are larger and five pips fit inside them. Ports are chips in their resource's own colours with two short piers to the coast. Terrain glyphs are drawn above all land so no neighbour clips them.
  - **Pip Flash**: a timer bar above the board; big A–F buttons under it that turn into each corner's pip total (counting up) on the verdict; the hexes that fed the best corner light up green, a wrong pick's are ringed red.
  - **Quick sets**: Pip Flash Rush offers 3, 5, 10 (unranked, local) or 13 (ranked). Quick sets use the Rush ramp (≈30% easy, 40% medium, rest hard) with their own `quick-set` seed tag; `runItems(mode, seed, length)` and `scoreRun(..., length)` take an optional length the server never passes.
  - **Flow**: Pip Flash moves on by itself after every verdict (1.2 s right, 2.4 s wrong, +120 ms per puzzle into the run), with the Next button's underline draining; Port Math and Hand Tracker wait for Next (`advanceDelayMs`).
  - **Port Math** is one tap: the hand, the build and each resource's trade rate, then buttons 1–6 for the fewest trades. Still untimed. The verdict names the player's count and one best route.
  - **Hand Tracker**: logs are 5 / 9 / 14 lines (was 8 / 12 / 20); hard still asks two questions. A miss shows the rival's asked counts after every log line (`runningCounts`), on the play screen and in the result replay.
  - **Chrome**: Day and Dusk only (a first visit follows the system; a stored "night" reads as dusk); sea-blue accent replaces magenta; no page frame or scale bar; the date left the header (normal case "29 Sep 2026" on results and shares); "days at sea" is a stat block; the share preview shows only when copying fails; How to play lost the untimed demo and says "warm up with a Rush"; the combo reads "×4 in a row".
- Decisions (and why):
  - **Merged v1.1 (PreetMax85/hexathlon#2) to main on the owner's say-so**, then branched `v1.2-board-and-feel` from it.
  - **Words are a mix** (owner): sea flavour stays for moments (Sail the Daily, days at sea, Passage complete, buoys); instructions and puzzle text use the game's terms. "Sailing directions" → "How it works" / "The drills"; the `Fl(N)` light characteristic is gone.
  - **Pip Flash keeps auto-advance** (owner: it keeps you focused); the other two wait, since they have more to read after a verdict.
  - **Quick sets are unranked**: ranking 3/5/10 would split a small player base into four boards and make challenge links carry a length. Rank them later if they get used.
  - **The growing pause is between puzzles, not on the answer clock**, so scoring and the server are untouched.
  - **Port Math: one tap, no clock** (owner). Tier trade ranges now overlap (easy 1–2, medium 2–3, hard 3–5) so the tier badge never gives the count away; buttons go to 6 so 5 is never a sure pick. The answer is a number; the server re-checks it against the regenerated puzzle.
  - **Consequence of the Port Math and Hand Tracker rule changes**: puzzles for existing seeds changed. Stored scores stay as they were, but old Port Math and Hand Tracker challenge links now show different puzzles than their creator played, and today's Daily for those two formats changed for anyone who already played it. Accepted: the site is days old. Pip Flash is unchanged.
  - **Docs kept light** (owner: code first): a v1.2 amendment at the top of the direction contract (so impeccable passes stop re-adding magenta and soundings), a note at the top of DESIGN.md, README facts. DESIGN.md was not regenerated.
- What broke and how it was fixed: `pkill -f "next start"` killed its own shell (the pattern matched the command) → free the port with `fuser -k 3200/tcp`. Terrain glyphs moved below a token were clipped by the neighbouring hex drawn later → all land first, then all glyphs.
- Tests: 175 passing (+2 DB tests, skipped without a database)
- Notes for next phase: open items from the plan are Robber Call (a new format) and per-format ratings; the OG card could share more geometry with `Board.tsx` than `portMark`.
