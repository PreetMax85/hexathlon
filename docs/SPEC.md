# Hexathlon — v1 Spec

A competitive puzzle arena that trains the micro-skills of hex-based settlement
trading games (the Catan family), in the style of Matiks: short formats, Daily
puzzles, Rush runs, and friend challenges. Mobile-first, playable on phone and
laptop. No AI at runtime.

**IP rule:** never use the words "Catan" or "Settlers" or any official art in the
product. Use generic terms: hexes, settlements, cities, roads, dev cards, and the
resources `wood`, `brick`, `sheep`, `wheat`, `ore`.

## 1. The board (shared by all formats)

Standard base layout: 19 land hexes in rows of 3-4-5-4-3.

- Resources: 4 wood, 4 sheep, 4 wheat, 3 brick, 3 ore, 1 desert.
- Number tokens (18): 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12. Desert has none.
- Generation constraint: no two hexes with 6 or 8 may be adjacent.
- Pips (dots) per token: 2/12 = 1, 3/11 = 2, 4/10 = 3, 5/9 = 4, 6/8 = 5.
- Topology: 54 vertices, 72 edges. Every vertex touches 1–3 land hexes.
- Ports: 9 on the coast, each on a pair of adjacent coastal vertices: 4 generic (3:1) and one 2:1 port for each of the 5 resources.
- Everything is generated from an integer seed with a deterministic PRNG. Same seed → identical board, on client and server.

## 2. Formats

Each format has **three tiers**, **easy / medium / hard**. Every puzzle is produced by
`generate(format, tier, seed)` and checked by `validate(puzzle, answer)`. Both are
pure functions in the engine, and client and server share them.

### 2.1 Pip Flash — reading a board fast

- Show a board with K candidate vertices, labelled A…F. The player taps the vertex with the **highest pip total**, which is the sum of pips on its adjacent hexes. A desert counts 0.
- Candidates must touch at least 2 land hexes. The maximum must be unique.
- Tiers:

  | Tier | K | Gap from best to second-best | Time limit per puzzle |
  |---|---|---|---|
  | easy | 3 | ≥ 2 pips | 6 s |
  | medium | 4 | ≥ 1 pip | 5 s |
  | hard | 6 | ≥ 1 pip | 4 s |

- A timeout counts as wrong.

### 2.2 Port Math — trade efficiency

- Given: a hand (counts of 5 resources), a set of owned ports, and a **target** (a multiset of builds, e.g. City + Dev card).
- Build costs:
  - Road = wood + brick.
  - Settlement = wood + brick + sheep + wheat.
  - City = 2 wheat + 3 ore.
  - Dev card = sheep + wheat + ore.
- A maritime trade gives N of one resource for 1 of any *other* resource. N is 2 if you own that resource's 2:1 port, else 3 if you own a generic port, else 4. The bank supply is unlimited.
- The player performs trades in the UI, then presses **Build**. The answer is correct if the final hand covers the target **and** the number of trades equals the optimum. Any optimal sequence is accepted.
- The generator computes the optimum by exhaustive search (BFS over hands) and only keeps puzzles where the target is reachable.
- Tiers:

  | Tier | Optimal trades | Extra rule |
  |---|---|---|
  | easy | 1–2 | — |
  | medium | 3 | — |
  | hard | 4–5 | Prefer puzzles where the naive greedy strategy is **not** optimal. Greedy = always trade the resource with the largest surplus at its best rate. |

### 2.3 Hand Tracker — card counting (1v1)

- Show the rival's starting hand for 3 s. Then a sequence of game-log events plays at a fixed speed. Afterwards, ask: **"How many ⟨resource⟩ does Rival hold?"** The player answers with a number pad (0–19).
- Event types, all fully informative (no hidden information):
  - `roll`: "Rolled 8 — Rival +2 wheat, You +1 ore"
  - Rival builds a road, settlement, city or dev card (costs deducted)
  - Rival bank/port trade: "Rival traded 3 sheep → 1 brick"
  - "You stole 1 ore from Rival"
  - "Rival stole 1 brick from you"
- The generator never makes a rival count negative. Builds and trades only happen when affordable.
- Tiers:

  | Tier | Events | Seconds per event | Questions |
  |---|---|---|---|
  | easy | 8 | 1.5 | 1 |
  | medium | 12 | 1.2 | 1 |
  | hard | 16 | 0.9 | 2, about different resources |

## 3. Modes

- **Daily**
  - One puzzle per format per day, identical for everyone.
  - Seed = hash(format, tier `medium`, UTC date). The day rolls over at 00:00 UTC.
  - One scored attempt per player per format per day.
  - Shows a daily leaderboard by correctness, then time.
- **Rush**
  - 13 puzzles of one format, back to back. The tier ramps up: 1–4 easy, 5–9 medium, 10–13 hard.
  - Score = number correct. Tiebreak = total time.
  - The run ends at 13 puzzles. There is no lives system in v1.
- **Challenge link**
  - After a Rush, the player can create a challenge. It stores the Rush seed.
  - `/c/<id>` lets friends play the *same* 13 puzzles and shows that challenge's leaderboard.

## 4. Players and data

- **Players:** no login. The first visit asks for a nickname. A random player id is stored in `localStorage`.
- **Results:** the client submits `{format, mode, seed, answers[], times[]}`. The **server regenerates the puzzles from the seed and recomputes correctness**, and never trusts a client-reported score.
- **Tables:**
  - `players(id, nickname, created_at)`
  - `challenges(id, format, seed, created_by, created_at)`
  - `results(id, player_id, format, mode, seed, challenge_id?, correct, total_ms, created_at)`
  - Daily uniqueness: one `results` row per (player, format, daily seed).

## 5. UX requirements

- Mobile-first: works at 360 px wide with no horizontal scroll. Tap targets are at least 44 px. The board renders as SVG and scales to the viewport.
- The home screen has three format cards. Each card shows Daily and Rush buttons plus a one-screen "How to play" with a tappable example. This addresses the onboarding weakness players complain about in puzzle apps.
- After a Rush, show a result screen with the score, the time, a per-puzzle ✓/✗ strip, and "Challenge a friend" (copies the link and a share text such as `Hexathlon Rush · Port Math 11/13 · 2:41`).

## 6. Out of scope for v1

Ratings per format, live real-time duels, Road Race, Robber Call, the Last Turn (win-this-turn) solver, accounts and auth, 4-player formats. See `PLAN.md → v1.1+`.
