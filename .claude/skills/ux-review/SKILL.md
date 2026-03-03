---
name: ux-review
description: UX engineer review of the site for usability, accessibility, and mobile experience
---

# UX Review

Act as a senior UX engineer auditing this site. The design intentionally mimics a 2004-era forum — respect that aesthetic while identifying real usability problems.

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

- Panel header styling consistency across all three activities
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
- Do NOT suggest Tailwind, CSS modules, or framework changes
- Focus on what real users would struggle with, not theoretical best practices
