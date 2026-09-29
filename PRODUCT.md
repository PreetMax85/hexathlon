# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players of online hex-board trading games (the Colonist.io crowd) who already
know the rules and want to get sharper at the parts of the game that decide
close matches: reading a board's production at a glance, trading efficiently,
and keeping track of what a rival holds. They play in short sessions, mostly on
a phone, often between real games or as a daily habit. The job is deliberate
practice that feels like a competitive game, not a tutorial.

Recruiters and developers who see the project on Twitter or in a job
application are a secondary audience. They judge it by whether it feels like a
real product for the players above, so nothing is designed for them directly.

## Product Purpose

Hexathlon is a skill gym for hex trading games, in the mould of Matiks for
mental math: short, timed puzzle formats that each isolate one micro-skill,
with a Daily everyone shares, Rush runs, and friend challenges. Success means
players come back daily, feel measurably faster, and send challenge links to
friends.

## Positioning

A standalone trainer, not affiliated with any existing game or platform. No
other product drills these micro-skills in isolation with instant, verifiable
scoring. Every puzzle comes from a deterministic seed through one engine shared
by client and server, so the server re-derives every result and a leaderboard
score cannot be forged by claiming it.

## Operating Context

- Played in a mobile browser at 360 px and up, and on laptops. No install, no
  account: a nickname and a random id in `localStorage`.
- Sessions are short: one Daily puzzle per format, or a 13-puzzle Rush.
- Sharing happens through challenge links (`/c/<id>`) and a plain-text result
  line pasted into chats.

## Capabilities and Constraints

**Shipped in v1** (see `docs/SPEC.md`, `docs/BUILD_LOG.md`):
- Formats: Pip Flash (pick the highest-pip corner), Port Math (reach a build in
  the fewest bank/port trades), Hand Tracker (follow a game log, count the
  rival's cards). Each has easy, medium and hard tiers.
- Modes: Daily (one scored attempt per format per UTC day), Rush (13 puzzles,
  easy to hard), challenge links with their own leaderboard.
- Stack: Next.js App Router, TypeScript, Tailwind, Vitest, Drizzle and Neon
  Postgres, deployed on Vercel. No AI at runtime.
- `src/engine/` stays pure TypeScript (no React, Next or DB imports) and is the
  single source of puzzle truth for client and server.

**Open to change** (decided by the building agent; the owner delegated these):
- Timers and difficulty. The v1 limits (Pip Flash 4–6 s, Hand Tracker events at
  0.9–1.5 s) felt too short in play and should be retuned.
- Formats and modes. New formats and modes may be added or existing ones
  reshaped (v1.1 candidates: per-format ratings, Road Race, Robber Call, Last
  Turn, lives in Rush).
- The fair-scoring model. It may be strengthened, for example with minimum
  time floors or server-issued start tokens, because client-reported times are
  currently trusted.
- A stronger engine, possibly informed by the open-source Catanatron simulator.
  **Undecided.** Catanatron is GPL-3.0 and written in Python, so linking or
  vendoring it would put the repo under the GPL and add a Python runtime next to
  the TypeScript engine. Using it offline as a reference or a generator of test
  data avoids both. Its name must also never appear in the product's UI or copy.

## Brand Commitments

- The name is **Hexathlon**.
- IP rule: never use "Catan" or "Settlers", or any official art, in code, UI or
  copy. Use generic terms: hexes, settlements, cities, roads, dev cards, and the
  resources wood, brick, sheep, wheat, ore. Say "hex trading games".

## Evidence on Hand

- A working, deployed v1 at https://hexathlon.vercel.app, with a tested engine
  (100+ tests) and an honest build log in `docs/BUILD_LOG.md`.
- No players, testimonials, usage numbers or press exist yet. Do not invent
  them.

## Product Principles

1. **Train one skill per format.** Each format isolates a single decision a
   player makes in a real game; anything that doesn't sharpen it gets cut.
2. **Fair by construction.** Scores are re-derived on the server from the seed;
   features never rely on trusting the client.
3. **Pressure, not panic.** Timers create tension a player can meet with
   practice. A limit most players can't beat teaches nothing.
4. **Thirty seconds to the first puzzle.** No account, no tutorial wall; the
   rules of each format fit on one screen with a tappable example.
5. **Worth coming back to.** The Daily, streaks and challenges give a reason to
   return tomorrow and to pull a friend in.

## Accessibility & Inclusion

- Works at 360 px wide with no horizontal scroll; tap targets at least 44 px.
- Resource identity must never rely on colour alone, since hexes and cards are
  read at speed and some players are colour-blind.
- Timed play needs a reduced-motion path for any animation.
