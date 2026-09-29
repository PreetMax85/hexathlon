---
name: Hexathlon
description: Timed hex-board puzzle drills, printed as a nautical chart of one island.
colors:
  chart-white: "#f3f7f7"
  deep-water: "#ffffff"
  shoal: "#9ed6df"
  shoal-pale: "#cfebef"
  sounding-ink: "#1d2b36"
  sounding-ink-soft: "#475a68"
  hairline: "#c3d1d6"
  chart-magenta: "#c2187a"
  on-magenta: "#ffffff"
  iala-green: "#007a52"
  buoy-green: "#00875a"
  iala-red: "#c8102e"
  token-cream: "#fbf8ef"
  token-red: "#b3122b"
  land-wood: "#2f6b45"
  land-brick: "#b5532f"
  land-sheep: "#9fcb63"
  land-wheat: "#e6be3c"
  land-ore: "#7d8798"
  land-desert: "#e3cf9c"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 72"
    fontFeature: "'tnum'"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
  sea:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.45
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 88"
  numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.1
    fontVariation: "'wdth' 72"
    fontFeature: "'tnum'"
rounded:
  none: "0px"
spacing:
  frame: "8px"
  gutter: "16px"
  stack-sm: "12px"
  stack: "24px"
  hit: "44px"
  action: "48px"
components:
  button-primary:
    backgroundColor: "{colors.sounding-ink}"
    textColor: "{colors.chart-white}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.deep-water}"
    textColor: "{colors.sounding-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.shoal-pale}"
  button-ghost:
    textColor: "{colors.chart-magenta}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    height: "44px"
  input-text:
    backgroundColor: "{colors.chart-white}"
    textColor: "{colors.sounding-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "48px"
  list-row:
    textColor: "{colors.sounding-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    height: "56px"
  list-row-hover:
    backgroundColor: "{colors.shoal-pale}"
  feedback-bar:
    backgroundColor: "{colors.deep-water}"
    textColor: "{colors.sounding-ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
---

# Design System: Hexathlon

## Overview

**Creative North Star: "The Chart Room"**

Every puzzle is a chart of one island. The board is the chart's plate: white deep water, cyan shoal bands that hug the coast, seed-derived italic soundings, magenta port lights on dashed leader lines, graticule ticks along its edge. Everything around it is the chart's margin, printed in ink on paper: a double neatline frames every screen, a latitude scale bar runs across its top, a cartouche carries the name and edition date, and notes sit under italic headings over a single ink rule. There are no cards, no rounded corners and no shadows. The surface is flat paper.

The world is calm in material and lively in behaviour. The game moments are chart instruments doing real work: the timer is a range ring whose bearing line sweeps once round the board, verdicts are IALA buoys (a green cone, a red can) that drop onto the chosen spot and bob once, the combo reads as a light characteristic ("Fl(4)") that flashes, and a finished run is pressed on as a magenta chart stamp. Day is a paper chart; dusk and night are dimmed ECDIS palettes (darker, desaturated, never glowing), selectable from the header and following the OS by default.

The system rejects the category default (dark slate cards, one green accent, a flame streak) and the tavern look (wood, parchment, brass).

**Key Characteristics:**
- Flat paper and ink chrome; the board is the only saturated surface.
- Square corners everywhere; rules and hairlines instead of containers.
- One variable grotesque (Archivo) with a width axis, used wide, normal and condensed.
- Italic for water: section headings, captions and anything spoken by the sea.
- Chart magenta for lights, notes, focus and time remaining.
- Verdicts by buoy shape first, colour second.
- Hatching, not transparency, for used and disabled states.

## Colors

A paper-chart palette: cool white paper, ink with a blue cast, two water tints, one magenta for lights, IALA green and red for verdicts, and a separate set of land colours that only the board may use.

### Primary
- **Sounding Ink** (sounding-ink): all text, rules, the neatline, the primary button fill, bearing lines and graticule ticks. It is the chart's printing colour.
- **Chart Magenta** (chart-magenta): the chart's light and note colour. Port markers and their leader lines, the remaining arc of the range ring, the combo light, the result stamp, text links ("Rush · 13 puzzles"), the "you" tag on leaderboards, text selection, caret and the 3px focus ring. Text on a magenta fill uses On Magenta.

### Secondary
- **IALA Green** (iala-green): verdict text ("Correct", "New best"), and a surplus count in Port Math. **Buoy Green** (buoy-green) is the slightly brighter fill of the cone buoy and the right-answer pulse ring.
- **IALA Red** (iala-red): the can buoy, wrong-verdict text, error lines, a shortfall count, the armed Quit button, and the range ring's arc once under 30% of the time is left.

### Tertiary (board only)
- **Land colours** (land-wood, land-brick, land-sheep, land-wheat, land-ore, land-desert): hex terrain fills, each paired with an authored stroke glyph so no resource is colour-only. Dusk and night dim this layer with a filter; they never change the tokens.
- **Token Cream** (token-cream) and **Token Red** (token-red): number-token discs and the 6/8 numerals and pips.

### Neutral
- **Chart White** (chart-white): page paper, the text on the primary button, the paper plate behind a disabled button's label.
- **Deep Water** (deep-water): the sea field of the board, the feedback bar, secondary buttons, the dialog sheet and the share-text slip. It sits one step lighter than paper by day and one step lighter than paper in the dark palettes.
- **Shoal** (shoal) and **Shoal Pale** (shoal-pale): the two depth bands around the island. Shoal Pale is also the only hover and selection wash in the chrome (list rows, the open buoy on the result strip, the player's own leaderboard row, a giving row in Port Math).
- **Sounding Ink Soft** (sounding-ink-soft): secondary text, soundings, meta lines, tick marks, and the hatching stroke.
- **Hairline** (hairline): row dividers, the empty range-ring track, pending progress dots, unfilled tier bars.

### Palettes
Every colour is a CSS custom property with three values: day (the hexes above), dusk, and night. Dusk (`data-theme="dusk"`, and the default under `prefers-color-scheme: dark`) and night (`data-theme="night"`) values live in `.impeccable/design.json`. New surfaces must use the custom properties, never literal hexes, so they follow the palette.

### Named Rules
**The Board Owns Saturation Rule.** The land colours appear only on the board and in its share-card rendition. Chrome is paper, ink, the water tints, magenta and the verdict pair.

**The Magenta Is a Light Rule.** Magenta marks lights, notes, links, focus and time remaining. It is never a large fill in the chrome; the stamp is magenta ink on paper, not a magenta panel.

**The Shape Carries the Verdict Rule.** Right is a cone, wrong is a can. Green and red only confirm what the shape says. Tier difficulty is shown as one to three ink sounding bars, never in the verdict colours.

## Typography

**Display Font:** Archivo (variable, self-hosted, width axis 62–125%), falling back to system-ui
**Body Font:** Archivo
**Label/Mono Font:** Archivo at 88% width, uppercase, tracked

**Character:** A single workhorse grotesque doing the whole chart. Headings go wide, readouts go condensed, water goes italic, and every numeral is tabular so timers and scores never jitter.

### Hierarchy
- **Display** (800, 4.5rem, 1, condensed 72%): the score numeral inside the result stamp. It is the only size outside the three-size ramp.
- **Headline** (800, 1.625rem, 1.1, wide 118%, uppercase): screen titles ("Off the chart", "Paused", intro titles) and format names in Sailing Directions.
- **Title** (700, 1rem, 1.45): row names, prompts, verdict titles, button labels (600).
- **Body** (400, 1rem, 1.45): taglines and running text. Secondary lines drop to 0.8125rem in Sounding Ink Soft.
- **Sea** (italic 450, 1rem or 0.8125rem): section headings ("Today's Dailies", "Sailing Directions", "The passage"), captions, skill names, the nickname, relaxed-mode notes, soundings and port rates.
- **Label** (650, 0.8125rem, 0.08em, uppercase, 88% width): the edition date in the cartouche, readout captions ("Time left", "Trades"), table column heads, hand-count resource names, tier marks and the stamp's inscription lines.
- **Numeral** (700, 1.625rem, condensed 72%): live readouts: seconds left, trades made, hand counts, "Days at sea".

### Named Rules
**The Three Sizes Rule.** The chrome uses 0.8125rem, 1rem and 1.625rem only. Rank comes from weight, case, width and italic, not from more sizes. The stamp numeral is the single sanctioned exception.

**The Water Is Italic Rule.** Headings that name a region of the chart, captions, and anything the sea says are set in italic. Upright bold is for land: names of things you act on.

**The Tabular Rule.** Numerals are tabular everywhere (set on body). Changing numbers use the condensed numeral style.

## Layout

A single-column chart sheet on phones, a two-plate sheet on desktop. The body carries an 8px margin (12px from 640px) inside which the neatline frames the full viewport height; a 5px scale bar of alternating 12px ink and paper sits under its top edge. Content sits in a centred column capped at 36rem with 16px side gutters; home widens to 72rem from 1024px as a two-column grid (island plate left and sticky, Dailies and Sailing Directions right, 48px column gap).

Vertical rhythm comes from rules, not boxes: sections stack 24–28px apart, each opening with an italic heading over a 1px ink rule (2px for a major division). Rows are separated by 1px hairlines and are at least 44px (list rows 56px). Every interactive target is at least 44px; primary buttons are 48px. On phones the next action and the post-answer feedback are sticky bottom bars, full-bleed to the neatline, topped by a 2px ink rule and padded for the safe area. The board is always full column width and square.

## Elevation & Depth

None. There are no box shadows anywhere in the build. Depth is tonal and cartographic: the board's water deepens from Shoal at the coast through Shoal Pale to Deep Water, the chrome separates regions with ink rules of two weights, and sticky bars sit on a paper or deep-water fill behind a 2px rule. Dark palettes dim; they do not glow. The only overlay is the nickname dialog, which dims the page with a 45% ink wash.

### Named Rules
**The Flat Paper Rule.** Nothing lifts off the chart. A layer is distinguished by fill tone and a rule, never a shadow, blur or glow.

**The Hatch, Don't Fade Rule.** Used, disabled and loading states take restricted-area hatching (a -45deg stripe of Sounding Ink Soft at 38%, 1.5px on a 7px pitch), never reduced opacity. A disabled button's label sits on its own paper plate so the hatching never crosses the text.

## Shapes

Square. Every button, input, row, dialog, bar and plate has 0 radius. Form comes from lines: the double neatline (1.5px ink border, 1px ink outline offset 5px), 2px rules for the cartouche and sticky bars, 1px ink under headings, 1px hairlines between rows, dashed ink-soft borders for chart notes set apart (the share-text slip, the untimed "Try one" demo), and a 3px double magenta border on the rotated (-4deg) stamp. Circles belong to the instruments: lettered waypoints, token discs, the range ring and the pending/current progress dots. Hexes belong to the island and the logo.

## Components

### Buttons
Plain, printed, confident. All share a 48px minimum height, 20px side padding, a 600-weight 1rem label with 0.01em tracking, a 150ms colour transition and a 1px press-down on active.
- **Shape:** square (0px).
- **Primary:** Sounding Ink fill with Chart White text ("Sail the Pip Flash Daily", "Copy challenge link", "Sail again"). One per view.
- **Hover / Focus:** primary mixes 12% magenta into the ink; focus is the global 3px magenta outline at 2px offset.
- **Secondary:** Deep Water fill, 1px inset ink ring; hover washes to Shoal Pale ("Home", "Pause", "Share result", "Rush").
- **Ghost:** magenta text with a 1px underline that thickens to 2px on hover (Skip, Retry). Inline text links ("Rush · 13 puzzles") use the same treatment in bold.
- **Disabled:** hatched paper with a hairline ring and ink-soft text, label on a paper plate.

### Cards / Containers
There are no cards. The **Note** pattern replaces them: an italic Sea heading on a 1px ink rule, with optional right-aligned meta, then content. Set-apart content uses a dashed ink-soft border on Deep Water or paper.

### Inputs / Fields
- **Style:** paper fill, 1px inset ink ring, square, 48px tall, 1rem body text; label above in the Label style. Caret and checkbox accents are magenta.
- **Focus:** the 3px magenta outline, offset 0 on inputs.

### Navigation
The header is the chart's cartouche: logo (an ink hex outline with a magenta light at its centre), the wordmark in 800 wide uppercase at 0.12em tracking, and the edition date beneath it as a Label. On the right, a palette switch (sun, half disc, crescent, split disc glyph; text label from 640px) and the nickname in italic with a hairline underline. A 2px ink rule closes it. In a run, a square ink-ringed quit button arms to a red "Quit?" on first tap.

### Island Plate (signature)
The board in its own square plate: Deep Water field, two shoal bands following the coast, italic soundings in Sounding Ink Soft, graticule ticks on all four edges, terrain hexes separated by paper-coloured seams, cream number tokens with pips, and magenta port markers (a small bordered plate with an italic rate and resource glyph) on dashed leaders. Candidate corners are lettered waypoint circles (ink letter, magenta ring); on reveal the others dim to a paper fill.

### Range Ring Timer (signature)
A circle round the board with 36 ink-soft ticks (every third long), a hairline track, a 0.14-unit magenta arc for the time left that turns red under 30%, and an ink bearing line sweeping clockwise from north. Beside the board, "Time left" as a Label over tabular seconds in the Numeral style. The Hand Tracker log uses a 28px miniature (RangeDial).

### Buoy Verdicts and Progress
Cone and can buoys with an ink waterline, standing on the chosen corner after an answer and bobbing once (640ms); a right answer adds a buoy-green pulse ring. The same buoys fill the run's progress strip (hairline dot pending, magenta-ringed dot current) and the result's per-puzzle strip, and lead each Today's Dailies row. The post-answer feedback bar pairs a 34px buoy with the verdict title in green or red and a one-line reason.

### Light Characteristic and Stamp
The combo shows as a magenta six-ray lamp that flashes once per streak step (360ms each, up to 8) beside an italic magenta "Fl(n)". The result opens with the stamp: magenta double-bordered, rotated -4deg, pressed on over 520ms, carrying format and mode, "Passage complete" or "Daily charted", the score in Display, and time and edition date.

### Motion
One easing, `cubic-bezier(0.16, 1, 0.3, 1)`, for everything that enters: views pop in (180ms scale 0.96 to 1), bars slide up (220ms, 8px). Reduced motion removes every animation, keeps the stamp's rotation, and shows the range ring as a static arc stepping down each second.

## Do's and Don'ts

### Do:
- **Do** frame every screen in the neatline with the scale bar under its top edge.
- **Do** use the CSS custom properties (`--paper`, `--ink`, `--magenta`, ...) so day, dusk and night all follow.
- **Do** separate regions with ink rules (2px major, 1px minor) and rows with hairlines.
- **Do** set section headings, captions and water in italic, and live numbers in the condensed tabular numeral.
- **Do** keep every target at least 44px and primary actions at 48px, sticky in the thumb zone on phones.
- **Do** hatch used, disabled and loading states.
- **Do** pair every resource colour with its authored glyph, and every verdict colour with a buoy shape.

### Don't:
- **Don't** round corners or add shadows, blurs or glows, in any palette.
- **Don't** use the land colours outside the board.
- **Don't** use opacity to show disabled or used states.
- **Don't** add a fourth chrome type size; change weight, case, width or italic instead.
- **Don't** put an uppercase Label above a heading as a kicker; Labels caption readouts, columns, the edition date and the stamp.
- **Don't** use green or red to show difficulty; tiers are ink sounding bars.
- **Don't** reach for wood, parchment, brass, or dark slate cards with a green accent.
