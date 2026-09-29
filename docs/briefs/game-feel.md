# Brief: game feel (v1.1)

Source: `/impeccable shape`, 2026-09-29, from PRODUCT.md and the critique in
`.impeccable/critique/2026-09-29T12-47-32Z__src-app.md`. The owner chose
"game feel first" and "all issues in scope", and delegated the numbers to
Claude. Every value below is a starting point, to be tuned by playing, not a
fixed rule.

## 1. Job and audience
Hex trading-game players on a phone, in short sessions, who want pressure
they can beat with practice (Principle 3: "Pressure, not panic"). Mode:
**Operate**. The player is completing timed tasks, so clarity and pace come
before decoration.

## 2. Outcome
An average player clears easy tiers comfortably, finishes medium tiers about
half the time under pressure, and finds hard tiers hard but fair. Speed is
rewarded through the time tiebreak and combos, not through cutoffs most
players can't beat.

## 3. Direction (interaction thesis)
Each puzzle is a small beat: **ready → read → answer → verdict → next**. The
clock only runs during "read and answer". Right answers build momentum you
can see, and a Rush ends on a payoff, not on admin.

## 4. Changes

**Timing** (engine: `src/engine/formats/*`, server-verified, so write tests first)
- Pip Flash `timeLimitMs`: easy 6000 → **7000**, medium 5000 → **8000**,
  hard 4000 → **10000** (3, 4 and 6 corners: about 2 s to orient plus
  1.3 s per corner).
- Hand Tracker: replace the fixed `secondsPerEvent` with a **per-event
  duration that the engine computes**, so it stays deterministic from the seed:
  `durationMs = words × 60000 / wpm + updateMs(event)`.
  - `wpm` by tier: easy 180, medium 220, hard 260.
  - `updateMs` by event: only "You" changes (a distractor) 500; Rival gains
    or steal 1000; Rival trade 1500; Rival build 2000 (the player has to recall
    the cost).
  - This gives roughly 3.5 s per event on easy, 3.0 s on medium and 2.6 s on
    hard, where v1 had 1.5 / 1.2 / 0.9 s.
  - Hard gets harder through **more events (16 → 20) and 2 questions**, not
    through speed.
  - Show **only the current event**, not the last three, so the format
    trains a running count rather than re-reading.
  - Keep the 3 s preview of the starting hand. In Relaxed mode, the next
    event appears on tap.
  - Evidence behind these numbers:
    - Adults read silently at 238 wpm on average, and most read at 175–300
      wpm (Brysbaert 2019, meta-analysis of 190 studies,
      doi:10.1016/j.jml.2019.104047).
    - Generated events average 6 words (max 8), so reading alone takes
      1.5–2.7 s. v1's hard speed of 0.9 s was below reading time for every
      reader.
    - Real online play is slower still. Colonist's fastest mode gives a 30 s
      turn and a 10 s dice phase (Colonist blog, "Better Timers", 2020).
    - Several card-counter browser extensions exist for Colonist, which
      suggests players find tracking hard enough to automate.
- Port Math stays untimed per puzzle. Its time only counts toward the
  tiebreak. Show that in its intro, so the difference is explained rather than
  looking inconsistent.
- Show the time limit for each tier on each format's intro screen before
  play starts.

**The ready beat**
- Show the board or puzzle first for about 600 ms with a "3-2-1" or
  settle cue. The clock starts after that. Measured time runs from the clock
  start, not from mount.

**The Daily becomes a mini-run**
- Change the Daily from 1 puzzle to **5 puzzles** (2 easy, 2 medium, 1 hard)
  from the daily seed. Keep one scored attempt per format per UTC day, and the
  same ranking: correct first, then time. This touches `runItems`, the daily
  seed rules and the result verification. The results tables are empty, so
  there's no data to migrate.

**Control and error prevention**
- **Pause** between puzzles only. It is never available while a scored
  puzzle's clock runs, because pausing would let a player study the board. A
  scored run interrupted by leaving the tab keeps its timer running.
- **Skip** (Port Math) and **Quit ✕** ask for confirmation. The confirmation
  is one tap and inline, not a modal.
- The Hand Tracker pad needs **select, then confirm** (or Enter). Digit keys
  work on desktop.

**Momentum and payoff**
- A combo counter in the run header (for example "×4") that resets on a
  wrong answer.
- Feedback on a right answer: a short pulse on the answer, plus
  `navigator.vibrate` where supported. Wrong answers get a distinct but calm
  response, never a flashing red screen.
- The Rush result leads with the score (big numerals), the time, and how it
  compares to the player's local best. Then a strip of the 13 puzzles where
  **tapping a missed puzzle replays its reveal**. After that come share and
  challenge. The sync status is one small line.

**Coming back**
- **Streaks**: count consecutive UTC days with at least one Daily finished,
  stored locally with the player. The home screen leads with a **Today** strip
  (the three Dailies, done or pending, plus the streak). The formats come
  second.

**Access**
- **Relaxed mode**: a per-player toggle that doubles every time limit and
  event duration. Results in relaxed mode are unranked (they don't go on
  leaderboards) and are labelled as such. This meets WCAG 2.2.1 without
  breaking fairness.
- The Hand Tracker screen-reader log announces a summary after playback
  ends, not every event live.

## 5. States
- First visit: show value before asking for a nickname. Let the player open
  How to play or a practice puzzle first, and ask for the nickname only when
  they first submit a scored result.
- Daily already played: the Today strip shows the result and the time until
  the next Daily.
- Offline or no database: the current "score not saved, retry" behaviour
  stays.

## 6. Out of scope for this brief
Visual direction (palette, type, layout styling), which comes from the new
DESIGN.md. New formats. The scoring anti-cheat work (minimum-time floors,
start tokens) is tracked separately.

## 7. Open decisions (the builder must not invent answers)
- Sound effects: none by default. They're open for the owner.
- Whether combos affect the score: **no**. Combos are display only, so
  scoring stays "correct, then time".
