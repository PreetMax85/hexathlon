# Hexathlon — Build Plan (v1)

Read `docs/SPEC.md` first. Execute the phases **in order, without stopping between
phases**. At the end of each phase:
1. Make sure `pnpm check` passes.
2. Append the phase entry to `docs/BUILD_LOG.md`.
3. Commit and push.
4. Continue to the next phase.

Stop early only if you're blocked on something only the human can provide, for
example a missing `DATABASE_URL`. In that case, write a `BLOCKED:` entry in
BUILD_LOG saying exactly what is needed, then carry on with any work that doesn't
depend on it.

**Stack:**
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS
- Vitest
- Drizzle ORM + Neon Postgres (`@neondatabase/serverless`)
- pnpm
- Deployed on Vercel through its GitHub integration: every push gets a preview URL.

Before using any library API, check its current documentation. Don't write it from memory.

**Model guidance:**
- Phases marked *(Opus)* are algorithm-heavy. Use Opus 5.5 at high effort.
- The others suit Sonnet 5.5 at high effort.
- Never use `max` effort.

---

## P0 — Scaffold
- Create the Next.js app with TypeScript, Tailwind, ESLint, Vitest and Drizzle.
- Add a `pnpm check` script that runs typecheck, lint and test.
- Layout: `src/engine/` (pure TS, **no React/Next/DB imports**), `src/app/`, `src/db/`.
- Add a placeholder home page and `README.md` (what it is, how to run).

**Done when:** `pnpm check` passes, `pnpm build` passes, and the first commit is pushed.

## P1 — Engine core *(Opus)*
- Seeded PRNG (e.g. mulberry32) and string → seed hashing.
- Hex geometry in axial coordinates for the 19-hex board.
- Vertex and edge graph (54 vertices, 72 edges) with vertex↔hex and vertex↔vertex adjacency.
- Board generator following SPEC §1, including the no-adjacent-6/8 rule and ports.
- A pips helper.

**Tests:**
- Counts: 19 hexes, 54 vertices, 72 edges.
- Every vertex touches 1–3 hexes.
- Resource and token distributions are exact.
- No adjacent 6/8, checked over 1,000 seeds.
- Determinism: same seed gives a deep-equal board.

**Done when:** all of the above is tested and passing.

## P2 — Format generators and validators *(Opus)*
- `generate(format, tier, seed)` and `validate(puzzle, answer)` for Pip Flash, Port Math and Hand Tracker, exactly as in SPEC §2.
- Port Math optimum via BFS. A greedy baseline for the hard-tier filter.
- Hand Tracker event simulator, with the invariant that counts are never negative.
- `rushSeeds(seed)` → 13 (tier, seed) pairs, and `dailySeed(format, date)`.

**Tests:**
- For 500 seeds per format and tier:
  - the puzzle is valid,
  - its tier constraints hold,
  - the reference solution validates as correct,
  - a perturbed answer validates as wrong.
- Port Math: BFS optimum ≤ greedy on every sample. On hard tier, greedy > optimum.

**Done when:** all of the above is tested and passing.

## P3 — Game UI
- SVG board renderer: hexes, tokens with pip dots, ports, labelled vertex candidates.
- Screens:
  - Home: three format cards with How to play.
  - Nickname prompt.
  - Puzzle player for each format: timers, the Port Math trade UI, the Hand Tracker event feed and number pad.
  - Rush flow (13 puzzles with tier ramp).
  - Result screen with share text.
- Mobile-first per SPEC §5. Test the logic with Vitest, not snapshots.

**Done when:** all three formats are fully playable locally in Rush and Daily. Daily uses local-only storage until P4.

## P4 — Persistence and challenges
- Drizzle schema per SPEC §4. Create migrations with `drizzle-kit`.
- API routes:
  - `POST /api/players` (create)
  - `POST /api/results` (server recomputes correctness from the seed)
  - `GET /api/daily/<format>` (today's leaderboard)
  - `POST /api/challenges`
  - `GET /api/challenges/<id>` (seed and leaderboard)
- Page `/c/<id>`: play the same Rush as the challenge, then see its leaderboard.
- Enforce one scored Daily attempt per player per format.

**Tests:** results-recompute logic (a forged score is rejected), daily uniqueness.

**Env vars (set on Vercel and in the cloud environment; the Neon region is `ap-southeast-1` and Vercel functions run in `sin1`):**
- `DATABASE_URL`: the **pooled** Neon URL, used by the app at runtime.
- `DATABASE_URL_UNPOOLED`: the **direct** URL, used only by `drizzle-kit` for migrations.

**Done when:** everything works against Neon, including migrations applied to the database. If either variable is missing, write `BLOCKED` and finish everything else.

## P5 — Polish and ship
- Check the layout at 360 px and 1280 px.
- Empty and error states. Loading states for the network.
- Favicon and page titles. An Open Graph description.
- README: the story (built with Claude Code in cloud sessions), how it works (a shared deterministic engine means the server re-verifies every score), a tests summary.
- Final BUILD_LOG entry.
- Open a PR to `main` summarising all phases.

**Done when:** `pnpm check` and `pnpm build` pass, and the PR is open.

---

## v1.1+ (not now)
- A separate rating for each format.
- Road Race (longest-road puzzles).
- Robber Call.
- **Last Turn**: win-this-turn puzzles with a solver.
- Live duels (Cloudflare Durable Objects).
- 4-player variants.
