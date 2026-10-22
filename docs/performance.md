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

Measure a **fresh production visit**, not the build's route table — chunk names are hashed and Turbopack prefetches dynamic chunks, so neither the build output nor a filename grep tells you what a visitor downloads.

**How, so the numbers compare.** `npm run build`, then `preview_start` the `prod` entry in `.claude/launch.json` (`next start` on port 3100). It gzips exactly as Railway does, so it measures `master` even while production lags behind it. Wait ~8s after load so the prefetched chunks are in, then sum `encodedBodySize` (bytes over the wire) from `performance.getEntriesByType('resource')` for same-origin `.js` and `.css`, plus the navigation entry for the HTML. Fonts and icons are left out. The HTML also lists a `noModule` polyfill chunk (~39KB) that modern browsers never fetch. Do not count it.

**Last measured 2026-10-22** (`master` at `1bf1328`). The 2026-09-03 column is that day's commit (`04e1dbd`) rebuilt and measured the same way; its 212.8KB total is where the old "212KB" figure came from.

|                | 2026-09-03 | 2026-10-22 |
| -------------- | ---------: | ---------: |
| JS (10 chunks) |    192.5KB |    200.5KB |
| CSS            |     11.4KB |     15.3KB |
| HTML           |      8.9KB |     12.4KB |
| **Total**      |    212.8KB |    228.2KB |

The HTML depends partly on the day. Four chunks make up nearly all the JS:

- React DOM, 69.6KB: the biggest chunk, and byte-identical since 09-03 (same hash)
- Next's router, 44.4KB (was 45.4KB)
- the app code, 33.8KB (was 25.0KB): almost all of the growth. The turntable, tonearm, needle, record patterns, margin rails and Dead Air tab all landed here
- `lib/albums.json`, 32.9KB (was 33.9KB)

Window width does not change the download. At 1024px and at 1440px (rails showing), the same ten chunks load. The Soundtrack Corner generator and `lib/lyrics.json` each have their own chunk, and a home visit fetches neither (checked by grepping each chunk for a string unique to the data).

- `better-sqlite3` stays server-only (never imported in client code)
- `lib/schedule.json` stays server-only — `lib/daily-picks.js` reads it and passes picks down as props; `eval-site` fails if a client component imports it
- `lib/albums.json` is intentionally client-bundled — needed for autocomplete. Its own chunk, about a sixth of the JS; the app code has passed it, so when the budget moves, check that chunk first
- `canvas-confetti` is dynamically imported and cached in `_confetti` variable
- **Code splitting is real work here, not ruled out.** Soundtrack Corner sits behind `next/dynamic` to keep its generator off the home path; Webamp loads from `/vendor` via a script tag because `next/dynamic` still shipped its chunk to everyone (`docs/components.md` → Webamp view). Anything heavy that only some visitors open deserves the same question
- **Pixel icons are self-hosted as a subset** (`app/iconfont-subset.css` +
  `public/fonts/iconfont-subset.woff2`, ~1 kB vs the vendor's 20 kB full face).
  If you add a new `hn-*` class, regenerate: add its codepoint to a subset-font
  run over `node_modules/@hackernoon/pixel-icon-library/fonts/iconfont.woff2`
  and add the class to `iconfont-subset.css` (codepoints live in the vendor
  `iconfont.css`). The vendor package stays a dep only as the glyph source.
  Check the run first: the same codepoints minus the new one must reproduce
  the committed woff2 byte for byte (`cmp`) — it did on 2026-10-18. Pass the
  codepoints as separate arguments; zsh does not word-split an unquoted
  variable, and that run silently subset one glyph.
