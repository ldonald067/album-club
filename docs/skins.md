# Skins

Two looks ship: the default 2004 forum, and **Vintage**, a 1990s desktop
(teal `#008080` title bars, silver `#C0C0C0` surfaces, bevelled edges,
Silkscreen on display text). A `<select>` in the info bar switches them.

## How it works

- The skin is `data-theme="vintage"` on `<html>`. No attribute = default.
- A tiny script in `app/layout.js` sets it **before first paint** from
  `localStorage.aotd_theme`, so a saved skin never flashes the wrong look. That
  script is why `<html>` carries `suppressHydrationWarning`: the server markup
  and the live DOM genuinely differ by that attribute. React still logs a
  hydration diff **in dev only** — a production build's console is clean.
- `ThemePicker` in `app/ForumPage.js` reads the applied attribute on mount
  (rather than assuming) and writes both the attribute and the key on change.
- All styling lives in one block at the end of `app/globals.css`.

## The palette is the whole mechanism

Every light background and every text colour in the stylesheet resolves through
a `--surface-*` or `--text-*` token defined in `:root`. A skin overrides the
palette; it does not chase selectors.

This matters because the first version of the Vintage skin **did** chase
selectors, and stayed incomplete through two full audits — the lyric hint, the
locked vibe, the tomorrow teaser and the status notices all kept their cream.
`npm run eval-site` now fails on any raw light background hex outside the
palette, with file and line.

**Adding a skin:** override the tokens in a
`:root[data-theme="yours"]` block. Anything written afterwards is skinned
automatically as long as it uses a token.

**Adding a rule:** use a token. If none fits, add one — do not hardcode.

## Contrast is a hard requirement

Both skins must clear WCAG AA (4.5:1 for body text). Measured values worth
knowing on silver `#C0C0C0`:

| Colour             | Ratio | Verdict                  |
| ------------------ | ----- | ------------------------ |
| Black `#000`       | 11.54 | body text                |
| Navy `#000080`     | 8.80  | links, emphasis          |
| Maroon `#800000`   | 6.02  | errors                   |
| Green `#1a4f1a`    | 5.30  | success                  |
| **Teal `#008080`** | 2.62  | **fails — surface only** |

**Teal is a surface, never text.** It sits behind white (4.77:1). This is the
one place the skin deliberately departs from the reference design, which calls
teal the accent colour; the reference also says to put accessibility first
where the two collide, so this follows it rather than bending it.

## Traps this skin already hit

- **A token can serve two roles and collide.** `--gold` is a text colour on
  light surfaces _and_ a background in three rules. Setting both `--gold` and
  `--bg-dark` to teal made `.scramble-display` teal-on-teal — ratio 1.00,
  letters invisible, game unplayable. Check what a token is used _as_ before
  giving it a value.
- **`--accent-color` is set inline** on `.content` per album, so a stylesheet
  rule cannot reach it. Neutralising it for a skin needs `!important` — the one
  case that earns it.
- **`.clue.hidden` is meant to be unreadable** until revealed. It is exempt
  from the contrast rule; "fixing" it spoils the puzzle.
- **Inline `style={{ color }}` in JSX cannot be skinned at all.** Five of these
  existed and were also below AA in the default skin. They are now
  `.muted-text` and `.footer-link`. Do not add more.
- **Body copy stays a system sans.** Silkscreen is a bitmap face and punishing
  at paragraph length; the pixel type is display-only.

## Verifying a skin

Contrast has to be _measured_, and the measurement itself has three traps — see
the "Verifying colour" section of `docs/gotchas.md` before trusting a sweep.
