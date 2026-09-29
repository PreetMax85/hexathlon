# Hexathlon: Build Plan v1.1 (game feel and Chart Room)

v1 shipped and is merged (see `docs/BUILD_LOG.md`, P0–P5). This plan makes it
fun to play and gives it its own visual world. Execute the phases **in order,
without stopping between phases**, on the branch `v1.1-chart-room`
(already created from `main`). At the end of each phase:
1. make sure `pnpm check` passes,
2. append a phase entry to `docs/BUILD_LOG.md` (same format as v1, `V<n>`),
3. commit and push.

Stop early only for something only the owner can provide. Write a `BLOCKED:`
entry saying exactly what's needed, then carry on with everything that doesn't
depend on it.

## Read first (these outrank docs/SPEC.md where they differ)
- `PRODUCT.md`: who it's for, principles, what may change.
- `docs/briefs/game-feel.md`: timing, Daily, controls, momentum, streaks,
  Relaxed mode.
- `.impeccable/surfaces/src-app.md`: the **Chart Room** direction contract and
  the required play moments.
- `.impeccable/critique/2026-09-29T12-47-32Z__src-app.md`: the critique of v1
  (26/40), which this build must answer.

The numbers in the briefs are starting points. You may improve on them when
you have a reason; record the reason under "Decisions" in BUILD_LOG.

## Skills (vendored in `.claude/skills/`)
- **impeccable**: all UI work. Run
  `.claude/skills/impeccable/scripts/impeccable context` once per session
  from the repo root. Read `reference/craft-floor.md` before any UI edit.
  Follow `reference/new-work.md` §6–7 for the build and finish (code-led
  path; there is no image generation).
- **tdd**: every engine and server change, red → green → refactor.
- **improve-codebase-architecture** and **codebase-design**: phase V5 only.
- **code-review**: phase V5 only.

---

## V0: Setup
- Check out `v1.1-chart-room`, `pnpm install`, `pnpm check` green.
- Screenshots: try `pnpm dlx playwright@latest install chromium`. If the
  network blocks the browser download, write `BLOCKED: playwright browser`
  and use the impeccable detector plus careful source review instead of
  screenshots in V3–V4.

## V1: Engine and server game rules *(test-first)*
- Pip Flash `timeLimitMs` → 7000 / 8000 / 10000.
- Hand Tracker: a per-event `durationMs` computed in the engine, per the
  game-feel brief. Hard tier has 20 events and 2 questions.
- The Daily is a **5-puzzle mini-run** (2 easy, 2 medium, 1 hard) from the
  daily seed. Update `runItems`, the verification and the daily-uniqueness
  rules. The results tables are empty, so no data migration is needed.
- **Minimum-time floor** (a known v1 gap: client times are trusted). Reject a
  puzzle time under the human floor: Hand Tracker ≥ its playback length +
  preview, the other formats ≥ 300 ms. Write tests that a scripted 0 ms run is
  rejected.
- Relaxed-mode results never reach the server (local only), so there's no
  schema change.

## V2: Game-feel flows
Everything in the game-feel brief that isn't visual styling:
- the ready beat before the clock starts
- the time limits shown on each intro screen
- pause between puzzles only
- inline confirmations for Skip and Quit
- the Hand Tracker pad: select, then confirm, plus digit keys
- Hand Tracker shows only the current event
- combos
- streaks and the Today data
- the nickname asked for at first scored submit
- Relaxed mode
- a summary-only screen-reader announcement for the Hand Tracker log

Put the logic in `src/game/` with Vitest tests, not in components.

## V3: Chart Room build
Build the direction in `.impeccable/surfaces/src-app.md` with full commitment,
every route and state:
- home (Today strip, Sailing Directions)
- play for all three formats
- the Rush result
- challenge `/c/[id]`, including a proper not-found state
- nickname
- error, loading and empty states
- day, dusk and night palettes (dark mode)

It must also include:
- **all five required play moments**
- the fixes to the critique's board findings: readable pips at 360 px,
  markers moved off the tokens, a visible focus ring, verdicts shown by shape
  and not just colour
- no emoji carrying meaning
- AA contrast everywhere

Keep `src/engine/` untouched in this phase.

## V4: Inspect and finish (impeccable §7)
- One batched screenshot round at 390 and 1440 into `.impeccable/review/`.
- Fix, then confirm with one more round. Two rounds at most.
- Run `impeccable detect --json` on the changed targets once.
- Spawn the `impeccable-finish-reviewer` agent with the packet described in
  new-work §7, act on its disposition, then spawn `impeccable-documenter` to
  write **DESIGN.md** and `.impeccable/design.json` from the build.
- Re-run the critique (`/impeccable critique`) and log the new score next to
  v1's 26/40.

## V5: Architecture, review and PR
- `improve-codebase-architecture` on `src/components` and `src/game`. Apply
  only the deepenings that clearly reduce complexity and keep tests green.
  List the rest in BUILD_LOG.
- `code-review` from `main` to HEAD against this plan and the briefs. Fix
  the findings.
- README:
  - update the formats, timings and look
  - add a short "Design" section (the Chart Room idea)
  - add a "Known limitations" section, for what remains of the client-time
    trust
- Open a PR to `main` summarising V0–V5 with before and after screenshots.
  **Don't merge. Don't deploy to production.**

## Rules that carry over
- The IP rule: never write "Catan" or "Settlers" anywhere.
- `src/engine/` stays pure TypeScript. The server re-verifies every result.
- Never commit secrets. Check current docs before using any library API.
- A new dependency needs a one-line reason in BUILD_LOG.
