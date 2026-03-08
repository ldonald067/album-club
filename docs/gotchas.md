# Gotchas

## Next.js / Build

- **`allowedDevOrigins`** in `next.config.mjs`: Required to suppress "Cross origin request detected" warnings when dev server runs on `127.0.0.1` vs `localhost`
- **Stale `.next` cache**: If you see `Cannot find module` or EBUSY errors (especially on OneDrive-synced folders), delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Path alias**: `@/*` maps to project root via `jsconfig.json`
- **Build output target**: <50 kB page JS. Currently 46.5 kB + 102 kB shared = 149 kB First Load

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

- **Empty `app/api/reviews/` directory**: Placeholder, no route file inside — don't reference in imports
- **Lyrics data quality**: `fetch-lyrics.mjs` uses Genius search which can return wrong-artist songs, non-English translations, or album credits. After fetching, audit `lyrics.json` for: wrong language, duplicate lyrics across albums, lyrics from wrong artists
- **Carousel duplication**: Track content is rendered twice (two `.map()` loops) so `translateX(-50%)` creates seamless infinite loop
- **Seeded permutation cache**: `lib/albums.js` caches shuffle permutations in a Map (5-10 entries per year, negligible)
- **Adding albums shifts schedule**: Daily rotation uses `dayOfYear % ALBUMS.length` — changing album count shifts which album appears on which day

## Icons

- **Pixel icon SVGs are black** (`fill="#000000"`): Render as black pixel art silhouettes. Use `image-rendering: pixelated` CSS for crisp edges
- **HackerNoon Pixel Icons**: Iconfont loaded in `layout.js`, used via `<i className="hn hn-iconname">`
- **Streamline Pixel SVGs**: 52 files in `public/pixel-icons/` (CC BY 4.0), used as `<img>` tags for vibe buttons and carousel

## Easter Eggs

- **Konami code**: `↑↑↓↓←→←→BA` triggers confetti + vinyl spin animation
- **Vinyl disc**: Click to toggle spin, CSS uses multiple `radial-gradient` layers
- **EST hover**: Hover over timestamp shows timezone tooltip
- **Forum signatures**: Random retro forum signature at bottom, set in `useEffect`
- **Visit ranks**: localStorage tracks visit count, displays rank badge in info-bar (7 tiers)
