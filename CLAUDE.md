# Album Of The Day Club

## Commands

```bash
npm install              # Install dependencies (includes better-sqlite3 native build)
npm run dev              # Start dev server on localhost:3000
npm run build            # Production build
npm run fetch-albums     # Grow album list via Last.fm (needs LASTFM_API_KEY env var)
npm run fetch-covers     # Fetch album cover art (needs LASTFM_API_KEY, tries Last.fm then iTunes, skips existing)
npm run fetch-lyrics     # Fetch lyrics via Genius API (needs GENIUS_ACCESS_TOKEN env var)
npm run fetch-youtube-ids # Fetch YouTube video IDs (needs YOUTUBE_API_KEY env var)
```

## Workflow

**After every change:** commit and push to keep the remote in sync.

```bash
git add -A && git commit -m "description of change" && git push
```

## Environment Setup

```bash
git clone https://github.com/ldonald067/album-club.git
cd album-club
npm install
npm run dev    # http://localhost:3000
```

Requires Node.js 18+. No `.env` needed for dev. Database auto-creates on first request.

## External API Setup (Optional)

These are only needed to populate game data. The site runs without them (games fall back to Cover Art Challenge).

**Genius API** (for Lyric game — `lyrics.json`):

1. Create account at `genius.com/api-clients`, register an API client
2. Generate a Client Access Token
3. Run: `GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics`
4. Skips albums already in `lyrics.json`. Re-run to fill gaps after cleaning bad entries

**YouTube Data API** (for Heardle game — `youtubeId` in `albums.json`):

1. Create Google Cloud project, enable "YouTube Data API v3"
2. Create an API key (no OAuth needed)
3. Run: `YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids`
4. Free tier: 100 searches/day. Run across multiple days for all ~124 recognizable albums
5. **Status: not yet populated** — no albums have `youtubeId` yet

## Architecture

Next.js 15 App Router with SQLite (better-sqlite3). Single-page app with anonymous activities + daily rotating game.

```
app/
  page.js              # Server component — resolves today's album, passes to ForumPage
  ForumPage.js         # Client component — all UI (RateReveal, VibeCheck, GuessGame,
                       #   CoverChallenge, HeardleGame, LyricGame, YesterdayRecap)
  globals.css          # All styling — retro 2004 forum aesthetic
  layout.js            # Root layout (Righteous font + HackerNoon pixel icon font)
  api/rate/route.js    # POST rating, GET distribution histogram
  api/vibe/route.js    # POST vibes (1-3 mood picks), GET distribution
  api/guess/route.js   # POST game result stats, GET aggregate stats (supports 4 game types)
  api/stats/route.js   # GET aggregate site statistics (60s server cache)
lib/
  albums.json          # 383 album entries (recognizable + deep cuts). Source of truth
  albums.js            # Imports albums.json, seeded shuffle, puzzle/game logic, VIBES, CAROUSEL_ICONS
  lyrics.json          # Pre-fetched lyric lines per album (66 entries, via fetch-lyrics script)
  db.js                # SQLite setup + queries (ratings, vibes, guess_stats tables)
  rate-limit.js        # In-memory IP-based rate limiter + daily vote caps
public/
  pixel-icons/         # 52 Streamline Pixel SVGs (CC BY 4.0) for vibes + carousel
scripts/
  fetch-albums.mjs     # Last.fm API tool to grow album list
  fetch-covers.mjs     # Album cover art fetcher
  fetch-lyrics.mjs     # Genius API — fetch lyric lines for recognizable albums → lyrics.json
  fetch-youtube-ids.mjs # YouTube Data API — fetch video IDs → youtubeId field in albums.json
data/                  # Auto-created, holds aotd.db (gitignored)
```

## Key Patterns

- **No auth/accounts**: All interactions are anonymous. localStorage tracks per-day participation
  (keys: `aotd_rated_YYYY-MM-DD`, `aotd_vibed_YYYY-MM-DD`, `aotd_guess_YYYY-MM-DD`, `aotd_cover_YYYY-MM-DD`, `aotd_heardle_YYYY-MM-DD`, `aotd_lyric_YYYY-MM-DD`)
- **Daily album rotation**: Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally, but order feels random. Rotates through all 383 albums
- **Album data**: `lib/albums.json` is the source of truth. Each entry has `title`, `artist`, `year`, `genre`, `cover` (emoji), `color` (hex), `recognizable` flag (true = well-known, false = deep cut/lofi/mix/obscure), `image` (cover art URL or null, UI falls back to emoji), and optionally `youtubeId` (for Heardle game)
- **4-game rotation**: `getGameType()` in `albums.js` cycles daily via `dayOfYear % 4` → `["guess", "cover", "lyric", "heardle"]`. Each game type draws from recognizable albums with different seeds to avoid collisions with the featured album
  - **Guess the Album** (6 attempts): Clue-based — genre, decade, word count, artist initial, year, artist name
  - **Cover Art Challenge** (5 attempts): Blurred cover art, blur decreases per wrong guess (`[10, 7, 4, 2, 0]`px)
  - **Lyric Fill-in-the-Blank** (4 attempts): Random lyric line from `lyrics.json` with 1-2 words blanked. Hints after wrong guesses: word length, first letter, album title
  - **Heardle / Audio Intro** (6 attempts): YouTube audio clips, progressively longer (`[1, 2, 4, 8, 16, 30]`s)
- **Game fallbacks**: LyricGame → CoverChallenge (if album has no lyrics in `lyrics.json`). HeardleGame → CoverChallenge (if album has no `youtubeId`). Scramble fallback exists but is currently unused
- **Yesterday's Recap**: Collapsible panel showing previous day's participation. Reads localStorage + fetches community data from existing API endpoints
- **Lyrics data**: `lib/lyrics.json` stores 5-8 lyric lines per album, keyed by `"artist - title"`. Currently 66 entries. Populated via `npm run fetch-lyrics` (Genius API). Lines are filtered for quality (>15 chars, <120 chars, no metadata, no section headers)
- **Hydration**: Random values (online count, guest count) must init in `useEffect`, never in `useState` initializer — otherwise SSR/client mismatch
- **Animation states**: `justRevealed`/`justSubmitted` booleans distinguish fresh submissions (animate) from localStorage reloads (static). This prevents re-animating on page refresh
- **Confetti**: Uses `canvas-confetti` (dynamic import) with `prefers-reduced-motion` check

## Album Data Quality Rules

When adding or editing albums in `albums.json`:

- **Title must be a real album** — no singles, tracks, or fabricated names. Verify on RYM/Discogs
- **Title should not contain the artist name** — "Clandestino" not "Manu Chao: Clandestino"
- **Year = release year**, not recording year (e.g., Sam Cooke live album: 1985 not 1963)
- **Color hex must be dark/muted** — R+G+B sum < 600 so white text is readable
- **`recognizable: true`** only for albums a general listener could guess from clues (genre, decade, artist initial, year, artist name). Niche/experimental = false
- **No duplicates** — check artist+title before adding. Run `/add-album` skill for validation
- After renaming an album, set `image` to `null` and re-run fetch-covers to get correct artwork

## API Patterns

- **Rate limiting**: All routes use `checkRateLimit(ip)` — 30 req/min per IP, hard cap at 2000 tracked IPs. IP via `getRealIp()` which prefers `x-real-ip` header (set by Vercel/Netlify)
- **Daily vote cap**: POST routes also use `checkDailyLimit(ip, endpoint)` — max 3 submissions per IP per endpoint per day
- **Body size guard**: All POST routes reject `content-length > 1024`
- **Server-side caches**: Each GET route has a 30s in-memory cache (`rateCache`, `vibeCache`, `guessCache`). Stats has 60s TTL. Caches are keyed by today's date and busted on new POSTs
- **Guess route game types**: `?type=` param supports `puzzle` (default), `cover`, `heardle`, `lyric`. Max attempts vary: puzzle=6, cover=5, heardle=6, lyric=4. Daily limits are per game type (`guess-${type}`)
- **Key param validation**: Rate and vibe GET routes validate `?key=` against `/^\d{4}-\d{2}-\d{2}$/`, falling back to today
- **Validation**: Rating must be integer 1-10. Vibes must be 1-3 valid labels (deduplicated server-side). Guess attempts must be integer 1-maxAttempts for the type, solved is boolean, unsolved must have attempts=maxAttempts

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

- **HackerNoon Pixel Icon Library** (`@hackernoon/pixel-icon-library`): Iconfont loaded in `layout.js`. Used via `<i className="hn hn-iconname">` for nav, panel headers, info bar, footer — grep `ForumPage.js` for current usage
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
- **Stale `.next` cache**: If you see `Cannot find module` errors after building while dev server was running, delete `.next/` and restart: `rm -rf .next && npm run dev`
- **Lyrics data quality**: `fetch-lyrics.mjs` uses Genius search which can return wrong-artist songs, non-English translations, album credits, or the same popular single for multiple albums. After fetching, audit `lyrics.json` for: wrong language, duplicate lyrics across albums, lyrics from wrong artists, metadata instead of lyrics. 37 bad entries were cleaned in the initial fetch of 103
- **HeardleGame YouTube player**: Uses YouTube IFrame API loaded dynamically. Player + timer are cleaned up on unmount. Global `window.onYouTubeIframeAPIReady` is set/cleared per mount cycle
- **LyricGame fallback**: When LyricGame falls back to CoverChallenge (no lyrics), stats are saved under `cover` type and localStorage uses `aotd_cover_` key. The `checkDone()` function handles this by checking all game type keys

## Skills

Use `/skill-name` to invoke. Skills marked (auto) are also triggered by Claude when relevant.

- `/add-album` (auto) — expand album rotation, validates format + picks emoji/color
- `/preview-schedule` (auto) — check upcoming rotation for gaps or collisions
- `/ux-review` (auto) — after UI changes: accessibility, mobile, interaction design
- `/api-harden` (auto) — after API changes: validation, abuse prevention, errors
- `/perf-check` (auto) — after adding features: bundle size, render, queries
- `/deploy` — production build + deploy to Vercel/Netlify
- `/reset-day` — clear today's localStorage + database entries for testing

## Repository

GitHub: https://github.com/ldonald067/album-club (public)
Git config is local (not global): user `ldonald067`, email `ldonald067@users.noreply.github.com`

## Automation

- **Prettier hook**: Auto-formats every file after Edit/Write (PostToolUse, in `.claude/settings.json`)
- **Data protection hook**: Blocks edits to `data/` files (PreToolUse)
- **context7 MCP**: Live documentation lookup for Next.js, React (configured in `.mcp.json`)
