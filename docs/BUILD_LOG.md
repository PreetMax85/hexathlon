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
