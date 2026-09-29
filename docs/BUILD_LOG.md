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
