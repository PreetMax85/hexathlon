---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/components"]
---

# Surface brief: Hexathlon app (all routes)

Mode: **Operate**. The player completes timed puzzles on a phone in short
sessions. Covers home, `/play/[format]/[mode]`, `/c/[id]`, the result screen
and the empty and error states. Game behaviour comes from
`docs/briefs/game-feel.md`. Product truth is in PRODUCT.md. Build path:
**code-led** (no image generation this session).

## v1.2 amendment (owner review, 2026-09-29) — overrides the contract below

Where this block and the contract below disagree, this block wins.
- **Clarity over chart.** No soundings, graticule, neatline, scale bar or range
  ring. The board is island + plain sea + ports; it fills the width on phones.
- **Accent is sea blue** (`--accent`, day `#1B6A96`, dusk `#6DB3DD`). No
  magenta anywhere. Ports are chips in their resource's own colours.
- **Two palettes: Day and Dusk.** No night.
- **Fewer things on the play screen**: the question, a timer bar, the board and
  big answer buttons. No demos or previews that repeat what a tap will show.
- **Words: a mix.** Sea flavour for moments (Sail the Daily, days at sea,
  Passage complete, buoys); the game's own terms for instructions and puzzles.
  No light characteristics ("Fl(4)").

## Direction contract

THESIS: Every puzzle is a chart of one island. The sea, the ports and the
seed-derived soundings around the board do real work, and the chrome is the
chart's margin: neatline, graticule ticks, cartouche and notes. It refuses the
category default of dark slate puzzle-app cards with one green accent and a
flame streak, and it refuses the tavern look of wood and parchment.

OWN-WORLD: The day palette is chart white `#F3F7F7`, with shallow-water
cyan-blue `#9ED6DF` fading to white deep water, sounding ink `#1D2B36`, chart
magenta `#C2187A` for lights, notes and focus, and IALA green `#00875A` / red
`#C8102E`. Dusk and night are named ECDIS palettes (dim, desaturated, no glow)
in dark mode. The board owns every saturated resource colour. The chrome is
white and ink only. Verdicts use buoy shapes: a green cone for right, a red can
for wrong. Used and disabled states take restricted-area hatching, never
opacity. Type: one condensed-capable workhorse grotesque with a width axis and
tabular numerals, plus italic for water and sea labels. The chrome uses at most
three sizes, and rank comes from weight, case and italic.

STORY: The player opens today's chart, sees which Dailies are charted and which
are still open, and how many days they've been at sea. They sail a puzzle
against a sweeping range ring and land on a result that reads like a completed
passage.

FIRST VIEWPORT: At 390 px, the neatline frames the screen. Top left, a
cartouche reads "HEXATHLON · 29 SEP 2026". Below it, today's board is the island
plate at full width with seeded soundings in the sea. Under the plate, the Today
strip: three buoy-marked Dailies (done or pending, with time and score once
done) and "Days at sea: N". The primary action, the next open Daily, sits in the
thumb zone. The formats follow as "Sailing Directions" entries with Rush and How
to play.

FORM: The Admiralty / ECDIS chart, #4 on the ordered grounded list, seed key
5c79c1b3. Signature interaction: the timer is a range ring whose bearing line
sweeps once around the board over the time limit. The remaining arc is the time
left, with tabular seconds beside it. Reduced motion shows a static arc that
steps down each second.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Required play moments (the owner's bar is "fun", not "calm")
Charts are calm by nature. These moments are **required**, so the world reads
as a game and not a skin. The finish review audits each one in behaviour:
- **Range-ring sweep timer**: the signature interaction in FORM.
- **Buoy verdicts**: on answer, a green cone (right) or a red can (wrong) drops
  onto the chosen spot and bobs once. Reduced motion shows it without the bob.
- **Combo as a light character**: the run header shows the combo streak like a
  lighthouse characteristic (for example "Fl(4)"), flashing on each right
  answer.
- **"Passage complete" stamp**: the Rush result opens with a chart-stamp
  impression (score, time, date), then the per-puzzle strip.
- **Share card**: `opengraph-image` and the share text render as a chart
  snippet: the island, the score in the cartouche, and the date as the chart's
  edition. Screenshot-worthy on Twitter.

## Unresolved
- The exact face (candidates with a width axis and tabular figures; not on
  impeccable's default-face list), picked at build time.
- Whether the Pip Flash candidate markers become chart waypoints (circled
  letters) or light characters. The builder chooses by legibility at 360 px.
