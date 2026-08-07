# Gotchas

## Deployment

- **Railway "Deploy Crashed" on every push (fixed 2026-07)**: Node exits with code 143 on SIGTERM by default, and Railway reports any nonzero exit as a crash when the old container is replaced during a rollout. `instrumentation.js` registers SIGTERM/SIGINT handlers that `process.exit(0)`. If crash notifications return, check that file still exists and verify real health via `/api/health` (`uptimeSeconds` climbing = no crash loop)

## Next.js / Build

- **`allowedDevOrigins`** in `next.config.mjs`: Required to suppress "Cross origin request detected" warnings when dev server runs on `127.0.0.1` vs `localhost`
- **Stale `.next` cache**: If you see `Cannot find module` or EBUSY errors (especially on OneDrive-synced folders), delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Path alias**: `@/*` maps to project root via `jsconfig.json`
- **Build output target**: <55 kB page JS. Currently 55.1 kB + 102 kB shared = 157 kB First Load

## JSX text

- **Escapes do not decode in bare JSX text**: `›` written as JSX text ships those six characters to the page. Use the real character. This shipped twice.
- **Escapes do not decode in JSX attribute values either**: `label="📋 Share"` also ships verbatim, because attribute quotes are not a JS string literal. `label={"📋 Share"}` (inside braces) does decode. A grep for escapes must cover both forms
- **JSX can eat a leading space** before text that follows an element when that text contains an HTML entity: `<strong>{pct}%</strong> of today&apos;s vibes` rendered as `71%of`. Prettier collapses a `{" "}` fix back onto one line, so put the whole run in an expression: `{" of today's vibes"}`

## React / Hydration

- **Hydration**: Random values (online count, guest count, forum signatures) must init in `useEffect`, never in `useState` initializer — otherwise SSR/client mismatch
- **Animation states**: `justRevealed`/`justSubmitted` booleans distinguish fresh submissions (animate) from localStorage reloads (static). Prevents re-animating on page refresh
- **`React.Fragment` import**: `ForumPage.js` imports `React` explicitly because carousel uses `<React.Fragment>` for interleaving icons between album emojis

## Client-Side Patterns

- **Confetti**: Uses `canvas-confetti` (cached dynamic import) with `prefers-reduced-motion` check. Module cached in `_confetti` variable to avoid repeated `import()` calls
- **Welcome-back detection**: Old streak data must be captured BEFORE calling `updateStreak()` — the function overwrites localStorage. Wrong order = lost gap detection
- **`Array.findLast` compatibility**: Use `[...arr].reverse().find()` pattern (or pre-computed reversed constant like `STREAK_MILESTONES_DESC`) instead of `findLast` for broader browser support
- **Activity detection**: Event-driven via `CustomEvent("aotd-activity")`, NOT polling. See `docs/performance.md` for rules

## Data

- **Artist-name tokens need stop words removed.** `filterSongHits` matched a hit if any token over two characters appeared in its title, so "The Beatles" → `["the","beatles"]` accepted almost anything. Fixed, but the same trap applies to any future name-matching
- **Genius search ranks by popularity, not album membership.** The `/search` endpoint carries no album field, so `"<artist> <album title>"` cheerfully returns the artist's biggest hit from a different record. A 2026-07 refill produced four Kendrick albums all filed under "Not Like Us", _In Rainbows_ → "Creep", _Melodrama_ → "Royals", _Mayhem_ → "Shallow", and — repeating the exact incident the guards were written for — Bon Iver's _For Emma_ → Kanye's "Monster", slurs included. `fetch-lyrics.mjs` now calls `/songs/:id` for each candidate and rejects it unless the album name matches. **There is no artist-only fallback search** — it returns the wrong album by construction. A miss is fine; a confidently wrong entry is not
- **Lyrics data quality**: Genius search returns wrong-artist songs, fan translation pages, and liner-note credits. This warning existed and was not enforced, and 8 of 88 entries turned out wrong — including a rap verse containing a racial slur filed under Miles Davis' _Kind of Blue_, an instrumental record. `fetch-lyrics.mjs` now enforces four guards (instrumental denylist, translation-page URL/title filter, credits-line filter, minimum two blankable words). **Still audit the results after any fetch** — the guards catch the known failure shapes, not novelty
- **Never index a per-game pool by `dayOfYear`**: each game airs every `GAME_TYPES.length` days, so `order[dayOfYear % pool.length]` samples the pool at that stride and collapses annual variety to `pool/cadence` whenever the two share a factor — a pool of 80 shows 16 albums a year instead of 73, silently. `pickRotatingPoolAlbum` indexes by _appearance ordinal_ for this reason, and `npm run eval-site` fails if that regresses
- **`results.total` from `/api/vibe` is not a headcount**: the `vibes` table stores one row per mood and everyone picks up to three, so a mood chosen unanimously reads as ~33%. Neither `vibes` nor `matchup_votes` has a voter column or uniqueness constraint, so neither total counts people (see `docs/STATUS.md` open item 2)
- **Carousel duplication**: Track content is rendered twice (two `.map()` loops) so `translateX(-50%)` creates seamless infinite loop
- **Seeded permutation cache**: `lib/albums.js` caches shuffle permutations in a Map. Most seeds are year-based (few entries), but the daily Versus/Taste pairs seed per-day for full-year variety, so the Map grows ~2 entries/day (~730/year, ~1-2 MB of int arrays). Bounded and reset on every deploy — negligible in practice, but not the old "5-10/year"
- **Adding albums shifts schedule**: Daily rotation uses `dayOfYear % ALBUMS.length` — changing album count shifts which album appears on which day

## Verifying colour: three ways the measurement lies

All three were hit while auditing the Vintage skin, and each one produced a
confident wrong answer before it was caught. A contrast sweep that ignores them
will both miss real failures and invent fake ones.

- **`background-color` is transparent when the background is a gradient.** The
  banner, the nav, the footer and every button use gradients, which live in
  `background-image`. A sweep that walks ancestors looking for a
  non-transparent `background-color` sails past them and lands on the page
  cream, then reports white-on-cream — `banner-title @1.84`, `btn-submit @1.03`.
  Every one of those is a false alarm. Check the real gradient stops instead
- **`opacity` composites the text into whatever is behind it.** Declared white
  at `opacity: 0.7` is not white; on the teal title bar it renders 3.14:1. The
  declared colour passes and the rendered pixel fails. Multiply opacity through
  ancestors and blend against the background before computing the ratio
- **A hidden browser pane freezes the animation timeline at zero.** In the
  in-app preview `document.visibilityState` is `hidden` and
  `document.timeline.currentTime` stays `0`, so CSS transitions never advance
  and hold their _start_ value forever. `.taste-play-btn` fades 0.5 → 1 over
  150ms as React enables it; frozen mid-flight it measures 3.46:1 and looks
  like a real AA failure on an enabled control. It is not — the button renders
  at full opacity in any visible browser. Call
  `document.getAnimations().forEach(a => a.finish())` before sampling.
  The tell was that no CSS rule, inline style, or ancestor explained the value:
  nulling all sixteen `opacity` rules one at a time never moved it

Related: WCAG 1.4.3 exempts **disabled** controls from contrast. Check
`el.matches(':disabled')` before filing one — dimmed-but-enabled is a real
failure, dimmed-and-disabled is not.

## Docs

- **Never write a derived count into prose.** Lyric coverage was corrected four separate times in one session because it was hard-coded in `CLAUDE.md`, `album-data.md`, `games.md` and `STATUS.md`. Pool sizes and coverage percentages come from `npm run eval-site`, which computes them. Historical narrative ("was 88, now 120") is fine — it's a fact about the past and doesn't rot

## CSS colour

- **Never hardcode a colour.** Every light background and every text colour
  resolves through a `--surface-*` / `--text-*` token in `:root`, so a skin can
  restyle the site by overriding the palette instead of chasing selectors.
  `npm run eval-site` fails on a raw light background hex and names the line.
  Two deliberate exceptions: `#fff` (already correct on dark surfaces) and
  `.clue.hidden`'s `#bbb`, which is meant to be unreadable. See `docs/skins.md`
- **Specificity beats source order, and `!important` beats a skin.**
  `.wrap-milestone` carried `color: var(--gold) !important` for no reason —
  `.wrap-message` sets the colour at equal specificity earlier in the file, so
  source order already won. The `!important` bought nothing and made the rule
  unreachable by any skin, pinning it to 2.62:1 on silver

## CSS classes: before you call one "unused"

Two traps, both hit during the 2026-07 dead-CSS removal:

- **Some classes are built dynamically and are invisible to grep.** `.hot-take-hot` / `.hot-take-crowd` only ever appear as `` `hot-take-${cls}` ``. A "which classes are referenced in JS?" sweep reports them as dead. They are annotated in `globals.css`; check for template-literal class construction (``className={`x-${y}`}``) before deleting anything
- **Some classes are shared across features whose names don't say so.** `.versus-btn`, `.versus-cover` and `.versus-info` are used by Blind Taste Test as well as Album vs Album. They are annotated at their definitions with the full consumer list. **The convention: if a name is a lie, rename it; if it's merely incomplete, annotate it at the definition.** A rename can't fix this anyway — any single name for a shared thing under-describes it, and the rename costs a large diff across rendered output that no test verifies
- **The `/* Chat agent */` block was a third trap** — it was mislabelled and contained all the live Soundtrack Corner styling, so a range delete would have destroyed a working feature. Removed rule-by-rule instead. Section comments are not to be trusted as boundaries

## Icons

- **Pixel icon SVGs are black** (`fill="#000000"`): Render as black pixel art silhouettes. Use `image-rendering: pixelated` CSS for crisp edges
- **HackerNoon Pixel Icons**: Iconfont loaded in `layout.js`, used via `<i className="hn hn-iconname">`
- **Streamline Pixel SVGs**: 52 files in `public/pixel-icons/` (CC BY 4.0), used as `<img>` tags for vibe buttons and carousel

## Easter Eggs

- **Konami code**: `↑↑↓↓←→←→BA` triggers confetti + vinyl spin animation
- **Vinyl disc**: Click to toggle spin, CSS uses multiple `radial-gradient` layers
- **Runout Groove**: click the vinyl again within 400ms and it flips — reverse spin plus a per-album matrix etching. The flip deliberately does **not** increment `aotd_vinyl_spins`; counting it would make the 33⅓ Club farmable by double-clicking
- **Still Spinning**: `visibilitychange` swaps the tab title while you're away, restoring it on return. Registered inside the existing keydown/activity effect so it shares that cleanup, and it clears any pending vinyl spin-restore first or the 3s timer overwrites the away title
- **EST hover**: Hover over timestamp shows timezone tooltip
- **Forum signatures**: Random retro forum signature at bottom, set in `useEffect`
- **Visit ranks**: localStorage tracks visit count, displays rank badge in info-bar (7 tiers)
