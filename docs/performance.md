# Performance Rules

Follow these rules for all CSS, rendering, and database changes. The build target is <55 kB page JS.

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

## Database — Query Patterns

- **Singleton connection** — `db.js` creates one connection, reused across all requests
- **Prepared statements** — 14 statements cached at module scope, created once on first `getDb()` call
- **Covering indexes** — `(album_key, rating)`, `(album_key, vibe)`, `(puzzle_key, attempts, solved)`, `(album_key, vote)`, `(matchup_key, pick)`
- **WAL mode** — concurrent reads while writes complete
- **Stats cache** — `getSiteStats()` has 5-minute TTL to avoid expensive `COUNT DISTINCT` / `SUM` / `GROUP BY` on every request

## Rate Limiter — Memory Safety

- Hard cap: 2000 tracked IPs (prevents DoS via map exhaustion)
- Hard cap: 20k daily vote entries
- Deterministic cleanup every 60s via `setInterval`
- Probabilistic inline cleanup at 1% of requests
- Both maps are bounded — no unbounded growth possible

## API Caching

| Route               | TTL                 | Cache-bust |
| ------------------- | ------------------- | ---------- |
| GET `/api/rate`     | 30s                 | On POST    |
| GET `/api/vibe`     | 30s                 | On POST    |
| GET `/api/guess`    | 30s per game type   | On POST    |
| GET `/api/playlist` | 30s                 | On POST    |
| GET `/api/matchup`  | 30s per type        | On POST    |
| GET `/api/stats`    | 5min (double cache) | Time-based |

All caches are in-memory objects, no external cache layer needed for single-instance deployment.

## Bundle Budget

Current: **55.1 kB** page JS, **157 kB** First Load. Target: stay under 55 kB page JS.

- `better-sqlite3` stays server-only (never imported in client code)
- `lib/albums.json` (403 albums) is intentionally client-bundled — needed for autocomplete
- `canvas-confetti` is dynamically imported and cached in `_confetti` variable
- No code splitting needed — single-page app
