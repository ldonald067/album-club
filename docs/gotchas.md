# Gotchas

## Next.js / Build

- **`allowedDevOrigins`** in `next.config.mjs`: Required to suppress "Cross origin request detected" warnings when dev server runs on `127.0.0.1` vs `localhost`
- **Stale `.next` cache**: If you see `Cannot find module` errors after building while dev server was running, delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Path alias**: `@/*` maps to project root via `jsconfig.json`

## React / Hydration

- **Hydration**: Random values (online count, guest count) must init in `useEffect`, never in `useState` initializer — otherwise SSR/client mismatch
- **Animation states**: `justRevealed`/`justSubmitted` booleans distinguish fresh submissions (animate) from localStorage reloads (static). Prevents re-animating on page refresh
- **`React.Fragment` import**: `ForumPage.js` imports `React` explicitly because carousel uses `<React.Fragment>` for interleaving icons between album emojis
- **Confetti**: Uses `canvas-confetti` (dynamic import) with `prefers-reduced-motion` check

## Data

- **Empty `app/api/reviews/` directory**: Placeholder, no route file inside — don't reference in imports
- **Lyrics data quality**: `fetch-lyrics.mjs` uses Genius search which can return wrong-artist songs, non-English translations, album credits, or the same popular single for multiple albums. After fetching, audit `lyrics.json` for: wrong language, duplicate lyrics across albums, lyrics from wrong artists, metadata instead of lyrics
- **Carousel duplication**: Track content is rendered twice (two `.map()` loops) so `translateX(-50%)` creates seamless infinite loop

## Icons

- **Pixel icon SVGs are black** (`fill="#000000"`): Render as black pixel art silhouettes. Use `image-rendering: pixelated` CSS for crisp edges
- **HackerNoon Pixel Icons**: Iconfont loaded in `layout.js`, used via `<i className="hn hn-iconname">`
- **Streamline Pixel SVGs**: 52 files in `public/pixel-icons/` (CC BY 4.0), used as `<img>` tags for vibe buttons and carousel
