# Hexathlon

A competitive puzzle arena for the micro-skills of hex-board trading games:
reading pips fast, trading efficiently at ports, and tracking a rival's hand.
Short formats, a Daily puzzle, 13-puzzle Rush runs and friend challenges.
Mobile-first, no AI at runtime.

See [`docs/SPEC.md`](docs/SPEC.md) for the product spec and
[`docs/PLAN.md`](docs/PLAN.md) for the build plan.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · Vitest ·
Drizzle ORM + Neon Postgres · pnpm · Vercel.

## Layout

- `src/engine/` — pure TypeScript game engine (board, puzzle generators and
  validators). No React, Next or DB imports. Shared by the UI and the API.
- `src/app/` — Next.js App Router pages and API routes.
- `src/db/` — Drizzle schema and database client.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # typecheck + lint + tests
pnpm build        # production build
```

Database (from P4): set `DATABASE_URL` (pooled Neon URL) and
`DATABASE_URL_UNPOOLED` (direct URL, used by `drizzle-kit`) in your
environment, then run `pnpm db:migrate`.
