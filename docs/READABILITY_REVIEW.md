# Readability and homepage rankings

This pass addresses the owner's screenshots and UI audit while preserving the Day/Dusk identity and phone play flow.

## Changes

- Corner markers have their own contrasting foreground/background pair. Dusk contrast increases from 1.03:1 to 16.45:1; Day is 13.63:1. Numbered tokens and port chips are slightly larger, with more room between trade ratios and resource glyphs.
- Instructions, questions, Hand Tracker guidance, and answer explanations use 16px reading text, rising to 18px on desktop. Metadata stays small. Mobile verdict actions occupy a separate row so explanations can use the full remaining width.
- Desktop play/challenge containers expand from 576px to 768px and boards from 544px to 640px. Mobile board bleed and answer controls remain.
- Enabled buttons use pointer cursors, including nickname, palette, Start, Quit, Pause, and Next. Disabled controls keep their disabled treatment.
- Home shows a top-five Daily leaderboard with three keyboard-accessible format tabs. It reuses the existing API and row renderer, highlights the viewer, refreshes every three minutes while visible, and refreshes on return. Failed refreshes retain the previous successful data. Loading, empty, and retry states are supported.

## Validation

- `pnpm check`: typecheck/lint pass; 182 tests pass, two opt-in database integration tests skipped.
- `pnpm build`: production build passes. No dependencies, engine rules, schema, or database writes were added.
- WSL Chromium: Day/Dusk checks at 360, 390, 1440, and 1920px; homepage layouts also checked at 768px. No horizontal overflow in the checked states. Desktop instructions compute to 18px and the board to 640px.
- Browser request fixtures and the Playwright clock verify top-five truncation, viewer highlighting, keyboard tab switching, the three-minute refresh, preservation after a refresh error, zero polling requests while hidden, recovery on visibility, and empty/initial-error states. A production initial load issues one leaderboard request; a UTC midnight crossing causes another load.
- Production smoke: full three-puzzle Pip Flash quick set, six hard-tier markers, Relaxed Hand Tracker playback/pad/confirm, and keyboard focus on Next. Port Math feedback actions occupy separate 48px rows on mobile. No page errors in the final exercised flows.
- Two-axis source review: Standards had no actionable findings; Spec found four small Hand Tracker instructional passages, which were promoted to reading text.
- Mechanical detector: pre-existing Archivo alias and Dusk-documentation findings were reviewed; the new 18px reading role is explicitly documented. These warnings are not claims of full accessibility compliance.

## Captures

See [screenshots/readability](screenshots/readability). `home-desktop-fixture.png` uses synthetic leaderboard entries solely to inspect layout, truncation, and current-player highlighting. Other captures show local gameplay; none are evidence of real community usage. Captures use reduced motion to avoid partially transparent entrance frames.

Physical iOS/Android, Safari, screen readers, load handling, and new database integration writes were not tested. This UI pass does not address the previously documented API rate limiting or client timing limitations.
