# Gotchas

## Next.js / Build

- **`allowedDevOrigins`** in `next.config.mjs`: Required to suppress "Cross origin request detected" warnings when dev server runs on `127.0.0.1` vs `localhost`
- **Stale `.next` cache**: If you see `Cannot find module` or EBUSY errors (especially on OneDrive-synced folders), delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Path alias**: `@/*` maps to project root via `jsconfig.json`
- **Build output**: Page is ~45 kB + 102 kB shared = 147 kB First Load JS

## React / Hydration

- **Hydration**: Random values (online count, guest count, forum signatures) must init in `useEffect`, never in `useState` initializer — otherwise SSR/client mismatch
- **Animation states**: `justRevealed`/`justSubmitted` booleans distinguish fresh submissions (animate) from localStorage reloads (static). Prevents re-animating on page refresh
- **`React.Fragment` import**: `ForumPage.js` imports `React` explicitly because carousel uses `<React.Fragment>` for interleaving icons between album emojis
- **Confetti**: Uses `canvas-confetti` (cached dynamic import) with `prefers-reduced-motion` check. Module cached in `_confetti` variable to avoid repeated `import()` calls

## Performance Patterns

- **Pre-lowercased search index**: `ALBUM_SEARCH` array at module scope avoids `toLowerCase()` per keystroke across 403 albums
- **Split useMemo**: `excluded` Set (depends on `[guesses]`, rebuilds max 4-6×) is separate from `filtered` list (depends on `[currentGuess, excluded]`, runs every keystroke). Prevents Set rebuild on each keystroke
- **GPU-accelerated bars**: `.attempt-bar` and `.top-vibe-bar` use `transform: scaleX()` with `transform-origin: left` instead of `width` transitions
- **Cached prepared statements**: 10 SQLite statements cached at module scope in `db.js`, created once on first `getDb()` call
- **Rate limiter cleanup**: Deterministic `setInterval(60s)` prevents unbounded Map growth, supplemented by probabilistic inline cleanup

## Data

- **Empty `app/api/reviews/` directory**: Placeholder, no route file inside — don't reference in imports
- **Lyrics data quality**: `fetch-lyrics.mjs` uses Genius search which can return wrong-artist songs, non-English translations, or album credits. After fetching, audit `lyrics.json` for: wrong language, duplicate lyrics across albums, lyrics from wrong artists
- **Carousel duplication**: Track content is rendered twice (two `.map()` loops) so `translateX(-50%)` creates seamless infinite loop
- **Seeded permutation cache**: `lib/albums.js` caches shuffle permutations in a Map (5-10 entries per year, negligible)

## Icons

- **Pixel icon SVGs are black** (`fill="#000000"`): Render as black pixel art silhouettes. Use `image-rendering: pixelated` CSS for crisp edges
- **HackerNoon Pixel Icons**: Iconfont loaded in `layout.js`, used via `<i className="hn hn-iconname">`
- **Streamline Pixel SVGs**: 52 files in `public/pixel-icons/` (CC BY 4.0), used as `<img>` tags for vibe buttons and carousel

## Easter Eggs

- **Konami code**: `↑↑↓↓←→←→BA` triggers confetti + vinyl spin animation
- **Vinyl disc**: Click to toggle spin, CSS uses multiple `radial-gradient` layers
- **EST hover**: Hover over timestamp shows timezone tooltip
- **Forum signatures**: Random retro forum signature at bottom, set in `useEffect`
- **Visit ranks**: localStorage tracks visit count, displays rank (Lurker → Regular → Veteran → Elder → Legend)
