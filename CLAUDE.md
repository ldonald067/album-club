# Album Of The Day Club

## Commands

```bash
npm install          # Install dependencies (includes better-sqlite3 native build)
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run fetch-albums # Grow album list via Last.fm (needs LASTFM_API_KEY env var)
npm run fetch-covers # Fetch album cover art
```

## Architecture

Next.js 15 App Router with SQLite (better-sqlite3). Single-page app with three anonymous activities.

```
app/
  page.js              # Server component — resolves today's album, passes to ForumPage
  ForumPage.js         # Client component — all UI (RateReveal, VibeCheck, GuessGame)
  globals.css          # All styling — retro 2004 forum aesthetic
  layout.js            # Root layout (Righteous font + HackerNoon pixel icon font)
  api/rate/route.js    # POST rating, GET distribution histogram
  api/vibe/route.js    # POST vibes (1-3 mood picks), GET distribution
  api/guess/route.js   # POST game result stats, GET aggregate stats
  api/stats/route.js   # GET aggregate site statistics (60s server cache)
lib/
  albums.json          # 347+ album entries (recognizable + deep cuts). Source of truth
  albums.js            # Imports albums.json, seeded shuffle, puzzle logic, VIBES, CAROUSEL_ICONS
  db.js                # SQLite setup + queries (ratings, vibes, guess_stats tables)
  rate-limit.js        # In-memory IP-based rate limiter + daily vote caps
public/
  pixel-icons/         # 52 Streamline Pixel SVGs (CC BY 4.0) for vibes + carousel
scripts/
  fetch-albums.mjs     # Last.fm API tool to grow album list
  fetch-covers.mjs     # Album cover art fetcher
data/                  # Auto-created, holds aotd.db (gitignored)
```

## Key Patterns

- **No auth/accounts**: All interactions are anonymous. localStorage tracks per-day participation
  (keys: `aotd_rated_YYYY-MM-DD`, `aotd_vibed_YYYY-MM-DD`, `aotd_guess_YYYY-MM-DD`)
- **Daily album rotation**: Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally, but order feels random. Rotates through all 347+ albums
- **Album data**: `lib/albums.json` is the source of truth. Each entry has `title`, `artist`, `year`, `genre`, `cover` (emoji), `color` (hex), and `recognizable` flag (true = well-known, false = deep cut/lofi/mix/obscure)
- **Puzzle album**: Draws only from `recognizable: true` albums (~124). Uses different seed (`year * 31 + 7`) so it always differs from the featured album. 6 progressive clues: genre, decade, word count, artist initial, year, artist name
- **Hydration**: Random values (online count, guest count) must init in `useEffect`, never in `useState` initializer — otherwise SSR/client mismatch
- **Animation states**: `justRevealed`/`justSubmitted` booleans distinguish fresh submissions (animate) from localStorage reloads (static). This prevents re-animating on page refresh
- **Confetti**: Uses `canvas-confetti` (dynamic import) with `prefers-reduced-motion` check

## API Patterns

- **Rate limiting**: All routes use `checkRateLimit(ip)` — 30 req/min per IP, hard cap at 2000 tracked IPs. IP via `getRealIp()` which prefers `x-real-ip` header (set by Vercel/Netlify)
- **Daily vote cap**: POST routes also use `checkDailyLimit(ip, endpoint)` — max 3 submissions per IP per endpoint per day
- **Body size guard**: All POST routes reject `content-length > 1024`
- **Server-side caches**: Each GET route has a 30s in-memory cache (`rateCache`, `vibeCache`, `guessCache`). Stats has 60s TTL. Caches are keyed by today's date and busted on new POSTs
- **Validation**: Rating must be integer 1-10. Vibes must be 1-3 valid labels. Guess attempts 1-6, solved is boolean, unsolved must have attempts=6

## Style

- Old-school forum aesthetic: Verdana 12px base, dark blue/gold palette, panel-based layout
- Banner title uses Righteous font via `var(--font-banner)` CSS variable
- All CSS in `globals.css` using CSS custom properties (`:root` vars)
- No CSS modules or Tailwind
- Vinyl record effect on album cover (CSS-only, slides out on hover)
- CSS animations: `growUp` (histogram bars), `slideRight` (vibe bars), `fadeSlideUp` (panel reveals), `carouselScroll` (icon carousel), `vibeBounce` (vibe selection)
- Color convention: gold = user's selection, dark green = community data bars

### Icon System

Two pixel icon libraries, both retro-aesthetic:

- **HackerNoon Pixel Icon Library** (`@hackernoon/pixel-icon-library`): Iconfont loaded in `layout.js`. Used via `<i className="hn hn-iconname">` for nav, panel headers, info bar, footer. Common icons: `hn-home`, `hn-calender`, `hn-trending`, `hn-question`, `hn-music`, `hn-star`, `hn-headphones`, `hn-play`, `hn-playlist`, `hn-sound-on`
- **Streamline Pixel SVGs** (52 files in `public/pixel-icons/`): CC BY 4.0, attribution in footer. Used as `<img>` tags for vibe buttons and carousel. Each vibe in `VIBES` array has an `icon` path. `CAROUSEL_ICONS` array (in `albums.js`) interleaves these with album cover emojis in the scrolling strip

## Database

SQLite at `data/aotd.db`, auto-created on first request. WAL journal mode.
Three tables: `ratings`, `vibes`, `guess_stats` — all indexed on their key column.
Delete `data/aotd.db` to reset all data.

## Gotchas

- **`allowedDevOrigins`** in `next.config.mjs`: Required to suppress "Cross origin request detected" warnings when dev server runs on `127.0.0.1` vs `localhost`
- **Empty `app/api/reviews/` directory**: Placeholder, no route file inside — don't reference in imports
- **Pixel icon SVGs are black** (`fill="#000000"`): Render as black pixel art silhouettes. Use `image-rendering: pixelated` CSS for crisp edges
- **Carousel duplication**: Track content is rendered twice (two `.map()` loops) so `translateX(-50%)` creates a seamless infinite loop
- **`React.Fragment` import**: `ForumPage.js` imports `React` explicitly because carousel uses `<React.Fragment>` for interleaving icons between album emojis
- **Path alias**: `@/*` maps to project root via `jsconfig.json`

## Skills

Use `/skill-name` to invoke. Skills marked (auto) can also be triggered by Claude when relevant.

### Content Management

| Skill                      | When to use                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| `/add-album` (auto)        | Expanding the album rotation — validates format, picks emoji + color        |
| `/preview-schedule` (auto) | Before/after adding albums — check upcoming rotation for gaps or collisions |

### Engineering Reviews

| Skill                | When to use                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `/ux-review` (auto)  | After UI changes — audits accessibility, mobile usability, interaction design    |
| `/api-harden` (auto) | After API changes — audits input validation, abuse prevention, error handling    |
| `/perf-check` (auto) | After adding features — checks bundle size, render efficiency, query performance |

### Operations

| Skill        | When to use                                                                     |
| ------------ | ------------------------------------------------------------------------------- |
| `/deploy`    | Ready to ship — runs production build, checks errors, deploys to Vercel/Netlify |
| `/reset-day` | Testing flows — clears today's localStorage + database entries                  |

## Automation

- **Prettier hook**: Auto-formats every file after Edit/Write (PostToolUse, in `.claude/settings.json`)
- **Data protection hook**: Blocks edits to `data/` files (PreToolUse)
- **context7 MCP**: Live documentation lookup for Next.js, React (configured in `.mcp.json`)
