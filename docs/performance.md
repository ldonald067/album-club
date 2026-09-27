# Performance Rules

Follow these rules for all CSS and rendering changes. Database, rate-limiter and API-cache patterns live in `docs/api.md`.

## CSS — Compositor-Friendly Only

**All animations and transitions must use only GPU-composited properties:**

- `transform` (scale, translate, rotate)
- `opacity`
- `box-shadow` (composited on most browsers)

**Never animate or transition these paint-heavy properties:**

- `width`, `height`, `top`, `left`, `right`, `bottom`
- `color`, `background-color`, `border-color`
- `filter` (brightness, blur, etc.)
- `text-shadow`
- `background` (shorthand — triggers full repaint)

**Progress bars** use `transform: scaleX()` + `transform-origin: left`, never `width`.

**Existing examples to follow:**

- `.rank-progress-fill` → `transform: scaleX(n)`, not `width: n%`
- `.attempt-bar`, `.top-vibe-bar` → same `scaleX` pattern
- `starPulse` → `opacity` + `transform`, not `filter: brightness()`
- `limitFlash` → `opacity` pulse, not `color` animation
- `.nav-item` → `background-color` only (not shorthand `background`)
- `.vibe-btn` → `box-shadow` only (not `border-color` + `background-color`)

**Gradients:** Minimize radial-gradient layers. Vinyl disc combines groove rings into one gradient (4 layers, not 7). Each gradient layer is a paint operation.

## React — Render Efficiency

**Never poll for state changes.** Use `CustomEvent` dispatch + event listener. The `checkDone()` pattern:

```
activity completes → window.dispatchEvent(new Event("aotd-activity"))
ForumPage listens → window.addEventListener("aotd-activity", checkDone)
fallback poll → setInterval(checkDone, 10000) (10s, not 2s)
```

**Guard state setters** against no-ops:

```js
setAllDone((prev) => (prev === done ? prev : done));
```

**Isolate ticking components** with `React.memo()`. `NextAlbumCountdown` has its own 1-second interval — memo prevents parent re-renders from cascading into it. `VersusMatchup` and `BlindTasteTest` are also memoized to avoid re-renders from parent state changes.

**Pre-compute constants** outside components:

- `STREAK_MILESTONES_DESC` — reversed milestone array (computed once at module scope)
- `ALBUM_SEARCH` — pre-lowercased title+artist index (computed once at module scope)

**Split useMemo dependencies:**

- `excluded` Set depends on `[guesses]` (rebuilds max 4-6x per game)
- `filtered` list depends on `[currentGuess, excluded]` (runs per keystroke)
- Separate memos prevent Set rebuild on every keystroke

**useMemo for expensive scans:**

- `personalStats` depends on `[allDone]` — scans all localStorage keys, only recomputes when wrap-up state actually changes

## Bundle Budget

Measure a **fresh production visit** (network panel, cache disabled), not the build's route table — chunk names are hashed and Turbopack prefetches dynamic chunks, so neither the build output nor a filename grep tells you what a visitor downloads. Last measured 2026-09-03: 212KB, biggest chunk 70KB.

- `better-sqlite3` stays server-only (never imported in client code)
- `lib/schedule.json` stays server-only — `lib/daily-picks.js` reads it and passes picks down as props; `eval-site` fails if a client component imports it
- `lib/albums.json` is intentionally client-bundled — needed for autocomplete. It is the largest single contributor to bundle size, so check it when the budget moves
- `canvas-confetti` is dynamically imported and cached in `_confetti` variable
- **Code splitting is real work here, not ruled out.** Soundtrack Corner sits behind `next/dynamic` to keep its generator off the home path; Webamp loads from `/vendor` via a script tag because `next/dynamic` still shipped its chunk to everyone (`docs/components.md` → Webamp view). Anything heavy that only some visitors open deserves the same question
- **Pixel icons are self-hosted as a subset** (`app/iconfont-subset.css` +
  `public/fonts/iconfont-subset.woff2`, ~1 kB vs the vendor's 20 kB full face).
  If you add a new `hn-*` class, regenerate: add its codepoint to a subset-font
  run over `node_modules/@hackernoon/pixel-icon-library/fonts/iconfont.woff2`
  and add the class to `iconfont-subset.css` (codepoints live in the vendor
  `iconfont.css`). The vendor package stays a dep only as the glyph source.
