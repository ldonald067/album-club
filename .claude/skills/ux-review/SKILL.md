---
name: ux-review
description: UX engineer review of the site for usability, accessibility, and mobile experience
---

# UX Review

Act as a senior UX engineer auditing this site. The design intentionally mimics a 2004-era forum — respect that aesthetic while identifying real usability problems.

## Read this before you find anything

**Never propose a share button, a "copy my result", or a score grid.** It is the
single most predictable suggestion in this space and it is against a standing
product rule — eight of them were removed on 2026-08-25 (Share Rating, Share
Vibes, five Wordle-style result grids, Share My Day) and `eval-site` fails if one
reappears in any shape. An activity that ends without a share button is
finished, not unfinished. The full rule is the non-negotiable in `CLAUDE.md`;
the line is the button, not the metadata, so the Open Graph card stays.

**Measure colour, never read it.** Four separate contrast "findings" in one week
were measurement artefacts — gradients, opacity, a frozen animation. Contrast is
measured on the _composited_ background of the rendered pixel. `docs/gotchas.md`
lists three ways the measurement itself lies. A hex value read out of the
stylesheet is not evidence.

**There are two skins.** The default 2004 forum and Vintage (a 1990s desktop
look), switched by `data-theme` on `<html>`. Audit both, and never propose a raw
colour: every light background and text colour resolves through a
`--surface-*` / `--text-*` token, `eval-site` fails on a raw light background
hex, and `docs/skins.md` explains why.

**Every tab is a route** (`/`, `/soundtrack`, `/cozy`, `/archive`, `/stats`,
`/faq`). Audit them as pages — titles, back button, deep links — not as panels.

## Arguments

Optional: focus area (e.g., "mobile", "accessibility", "rate-reveal", "guess-game")

## Review Checklist

### Accessibility (WCAG 2.1 AA)

- Color contrast: check text against backgrounds (especially gold on dark blue, muted text on cream)
- Interactive elements: do all buttons/inputs have visible focus states?
- Screen reader: are emoji-only elements given `aria-label`? Is the vinyl disc `aria-hidden`?
- Keyboard navigation: can you tab through stars, vibe buttons, guess input, and submit?
- Touch targets: are interactive elements at least 44x44px on mobile?

### Mobile Usability

- Test at 375px viewport width
- Star rating row: do 10 stars fit without overflow or cramping?
- Vibe grid: does it reflow cleanly to fewer columns?
- Guess autocomplete: does the dropdown overlay correctly on small screens?
- Album info: does it stack properly below the cover?

### Interaction Design

- Rate & Reveal: is it clear this is a one-time-only action? Is the "no take-backs" warning prominent enough?
- Vibe Check: is the 3-vibe limit communicated clearly? Is it obvious which vibes are selected?
- Guess Game: are clue reveals intuitive? Is it clear how many guesses remain?
- Feedback: do submissions have loading states? Error states?
- Empty states: what happens on first visit before anyone has voted?

### Visual Consistency

- Panel header styling consistency across the activities (Rate & Reveal, Vibe
  Check, the five rotating games, Playlist Poll, Versus, Blind Taste Test,
  Soundtrack Corner) — there are about ten, not three
- Spacing and padding rhythm
- Font sizes hierarchy
- Color usage consistency (gold = user's selection, blue = community data)

## Output Format

For each issue found, report:

1. **Severity**: Critical / Major / Minor / Suggestion
2. **Location**: Component and element
3. **Issue**: What's wrong
4. **Fix**: Specific recommendation

Use the preview tools to inspect the actual rendered page. Do NOT just read the code — verify visually with screenshots and accessibility snapshots.

## Boundaries

- Do NOT change the retro forum aesthetic — that's intentional
- Do NOT suggest adding modern UI patterns (modals, toasts, skeletons) unless there's a real usability gap
- Do NOT suggest any form of sharing — see the top of this file
- Do NOT suggest Tailwind, CSS modules, or framework changes
- Focus on what real users would struggle with, not theoretical best practices
