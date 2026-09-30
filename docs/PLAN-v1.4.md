# Hexathlon v1.4 plan: Last Turn (endgame puzzle)

Branch `v1.4-last-turn`, from main after v1.3 (PreetMax85/hexathlon#4). A fourth format: it's your turn,
you're on 8 or 9 points, and you play the turn on the board to reach 10.

## Owner decisions (2026-09-30)
- **Name: Last Turn.**
- **No option buttons.** The player plays the turn on the board: trades, then builds.
- **Any winning line counts.** The engine replays the player's actions with full legality. If they reach 10 points, the answer is right.
- **Show all 4 players**: points and hand-card count for You and Rivals 1–3, and all four players' pieces on the board. Rival pieces block spots and roads.
- **No Daily at launch.** Last Turn ships as Rush, quick sets and challenges only. It can join the Daily in a later version, once the difficulty is tuned from real play.
- **Reaching 10 points ends the turn automatically** (the plan's recommendation, accepted). This matches the real rule: you win the moment you hit 10 on your turn. It's also the payoff moment, and Undo is never needed after a win. "End turn" stays as the way to give up a line that falls short.
- **Clock: par, not timed** (the plan's pick). This follows the Port Math decision: no hard clock, and a pace bar drains to par (45 / 60 / 90 s by tier), then waits. Time only breaks ties. Relaxed mode hides the bar.

## One puzzle
- **Board**: reuses `Board.tsx`, with all 4 players' settlements, cities and roads in 4 player colours. Player colours must differ from the resource colours and from the red and green verdict colours. Each piece also gets a shape or mark, so colour is never the only cue.
- **Player strip**: 4 chips (You, Rival 1–3) with points and card count. Rivals' card counts are context only in v1.4.
- **Your hand**: 5 resource cards in Port Math's card style, each with its trade rate. Ports come from your settlements and cities on port corners: the rate is derived from the board, not listed separately.
- **Actions**, in an action bar within thumb reach:
  - **Trade**: tap the give resource, then the get resource, at 4:1, 3:1 or 2:1 depending on your ports.
  - **Road**: tap an edge next to your network. Legal edges are highlighted while Road is armed.
  - **Settlement**: tap a legal corner. It must touch your road, follow the distance rule and be empty.
  - **City**: tap one of your settlements.
  - **Undo** steps back one action. **End turn** submits the line as it stands.
- **Costs** come off your hand live. An illegal tap does nothing and shows a one-line reason, for example "Too close to Rival 2" or "Need 1 more ore".
- **Points meter**: shows "8 → 10". At 10 the win lands and the turn submits automatically.
- **Verdict**:
  - Right: the win moment. Your line is shown as a numbered list of the actions you took.
  - Wrong: the board resets and plays one shortest winning line, with its trades listed. One line then says why your line fell short, for example "9 points: one build short" or "Can't afford the city after those trades".

## Answer and verification (the server re-verifies, as today)
- **Answer**: the ordered action list, each action one of `{t:"trade",give,get}`, `{t:"road",edge}`, `{t:"settlement",vertex}` or `{t:"city",vertex}`.
- **`validateLastTurn(puzzle, answer)`**:
  - Replays from the start state with full legality: costs, port rates, distance rule, road connectivity, and piece limits of 5 settlements, 4 cities and 15 roads.
  - Returns true if and only if the final points reach 10 or more.
  - The first action that reaches 10 ends the line. Any actions after it make the answer invalid; the client never sends them.
- **Guards**: at most 30 actions, plus shape checks, as for the other formats.
- **`minPuzzleMs`**: the floor is about 2 s per puzzle plus about 250 ms per action, so an instant, many-action answer is rejected as a bot.

## Rules in scope for v1.4
- **In**:
  - Settlements (+1) and city upgrades (+1).
  - Roads, used to reach a settlement spot.
  - Bank and port trades, reusing Port Math's trade engine (`tradeRate`, `applyTrade`).
- **Out, for later**:
  - Longest road (+2), a v1.5 candidate.
  - Largest army and development-card points.
  - Robber, trades between players, and special-build phases.
- **Every v1.4 puzzle is winnable.** With no option buttons there's no way to answer "can't win". If a future tier wants unwinnable positions, it can add a "Pass" answer then.

## Graph helpers (engine)
- Board geometry: corners (vertices), edges, corner↔hex links, corner↔edge links and port corners. Check what `src/engine/board.ts` already derives for Pip Flash, and extend it rather than duplicating.
- Stable ids for corners and edges from the geometry, so answers can be serialized and replayed on the server.

## Generator (seeded and deterministic, `src/engine/formats/lastTurn.ts`)
- **Board**: `generateBoard(mixSeed(seed, "last-turn"))`.
- **Pieces**: placed for 4 players in legal positions, 2–5 settlements or cities each, with connected roads. Rivals get plausible points (9 or fewer) and card counts.
- **Your hand**:
  - Your points are 8 or 9.
  - The hand is built backwards from a planned winning line, as Port Math's `randomHand` does, plus decoy cards.
- **Solver**:
  - A bounded search over trades and builds (depth ≤ 8, with memo on the hand and board-delta state).
  - It confirms that a win exists and measures the shortest line.
  - It also supplies the reveal line.
- **Rejects**:
  - Positions whose shortest line is outside the tier's band.
  - Positions a trivial win solves while skipping the tier's intended skill.

## Tiers
| | Need | Shortest line | Traps |
|---|---|---|---|
| Easy | +1 | 1 build, no trades | An attractive spot blocked by the distance rule |
| Medium | +1 or +2 | 1–2 trades, then builds | The port-rate choice matters; a spot that needs a road |
| Hard | +2 | Road + settlement, or 2 builds, with 2–4 trades | Rival pieces cut the obvious road; greedy trades run out |

Rush uses the existing 13-item tier ramp. Quick sets (3 / 5 / 10) work as they do for the other formats: unranked and local only.

## Wiring
- **Format registration**: new format id `last-turn` in `FORMATS`, with `generate`, `validate`, `solve` and `minPuzzleMs`.
- **No Daily at launch**:
  - Add a `DAILY_FORMATS` list (the three existing formats).
  - The Today strip and streak read `DAILY_FORMATS`, so Last Turn can't break the "days at sea" streak.
  - The server rejects `mode: "daily"` for `last-turn`.
  - Tests cover both.
- **Database**: `src/db/schema.ts` stores `format` as plain `text`, with no enum or check constraint, so **no migration is needed**. Confirm the insert on the Neon `v1-1-dev` branch.
- **Copy and pages**:
  - `meta.ts`: name, tagline and skill ("Closing out games").
  - Also update `introTiming`, `verdict.ts` and `share.ts`.
  - HowToPlay steps.
  - A home row with a Rush button only.
  - The OG card uses the cover board.
- **IP rule**: never use "Catan" or "Settlers" in anything. Use plain terms: settlement, city, road, points.

## UI work
- **Board**:
  - Player-colour pieces: settlement, city and road shapes.
  - Tappable corners and edges, with legal-target highlights.
  - Hit areas of 44 px at a 390 px width. Corners already meet this; edges need wide invisible hit strokes.
- **`LastTurnPlay.tsx`**:
  - Player strip.
  - Board, full bleed.
  - Hand and trade row.
  - Action bar: Road, Settlement, City, Undo, End turn.
  - Points meter and pace bar.
- **Result replay**: `PuzzleReveal` shows your line against a shortest winning line.
- **Screen readers**:
  - Corners and edges are labelled, for example "Corner B: touching 6, 8 and desert; legal".
  - Each action is announced.
  - The action log is readable.
- **Keyboard**: T, R, S, C arm Trade, Road, Settlement and City; Z is Undo; Enter is End turn. Arrow keys move between legal targets.

## Phases (commit per logical change; `pnpm check` gates on its own exit code)
1. **Engine, test-driven**:
   - Graph helpers.
   - Action replay and validation.
   - Solver.
   - Generator for each tier.
   - Tests over 500 seeds: every puzzle is valid and winnable, the shortest line is within its tier, the solver's line validates, and perturbed lines fail.
2. **Wiring**:
   - Format registration and `DAILY_FORMATS`.
   - Server verify and the daily guard.
   - DB insert check on the dev branch.
   - Meta, copy and share.
3. **UI**: board pieces and targets, `LastTurnPlay`, verdict and replay, home row and intro.
4. **Finish**:
   - Code review on both axes.
   - Impeccable critique.
   - Screenshots, with new steps in `.impeccable/review/shoot.mjs`.
   - BUILD_LOG v1.4 entry.
   - PR with before and after screenshots.

## Risks
- **Solver cost**: the trade × build search can blow up. Bound it by depth, prune trades that don't feed any build, and memoize. Generation must stay under about 20 ms per puzzle, because the server regenerates puzzles.
- **Board legibility at 390 px**: 4 colours, pieces, tokens and ports all compete. Mute rival pieces a little and keep yours full strength.
- **Hard-tier fairness**: a hidden trap must be visible on the board. No puzzle may hinge on a rule the player can't see.
