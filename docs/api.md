# API Patterns

## Rate Limiting (`lib/rate-limit.js`)

Two layers of protection, both using in-memory Maps:

- **Per-minute**: `checkRateLimit(ip)` — 30 req/min sliding window per IP, hard cap at 2000 tracked IPs
- **Per-day**: `checkDailyLimit(ip, endpoint)` — max 3 submissions per IP per endpoint per day, hard cap at 20k entries
- **IP resolution**: `getRealIp()` prefers `x-real-ip` (set by Vercel/Netlify, not spoofable), falls back to `x-forwarded-for`
- **Cleanup**: Deterministic `setInterval` every 60s purges stale entries from both maps. Additionally, probabilistic cleanup (~1% of requests) and size-based cleanup (>1000 IPs) run inline
- **Date validation**: `isValidDateKey()` validates `YYYY-MM-DD` format, real calendar date, not in the future
- All POST routes reject `content-length > 1024`

## Database (`lib/db.js`)

- **SQLite** via better-sqlite3, WAL mode, singleton connection
- **Prepared statements** cached at module scope (12 statements, created once on first `getDb()` call)
- **Covering indexes** on all query patterns: `(album_key, rating)`, `(album_key, vibe)`, `(puzzle_key, attempts, solved)`, `(album_key, vote)`

For caching details, see `docs/performance.md`.

## Routes

### POST/GET `/api/rate`

Rating must be integer 1-10. GET validates `?key=` against `/^\d{4}-\d{2}-\d{2}$/`, falls back to today.

### POST/GET `/api/vibe`

Vibes must be 1-3 valid labels (deduplicated server-side against VIBES list). GET validates `?key=` same as rate.

### POST/GET `/api/guess`

`?type=` param supports `puzzle` (default), `cover`, `heardle`, `lyric`, `scramble`. Max attempts vary by type:

| Type     | Max Attempts |
| -------- | ------------ |
| puzzle   | 6            |
| cover    | 5            |
| heardle  | 6            |
| lyric    | 4            |
| scramble | 5            |

Daily limits are per game type (`guess-${type}`). Attempts must be integer 1-maxAttempts, solved is boolean, unsolved must have attempts=maxAttempts.

### POST/GET `/api/playlist`

Binary poll: "Would you add this to your playlist?" Vote must be boolean. GET validates `?key=` same as rate. 30s in-memory cache, busted on POST.

### GET `/api/stats`

Aggregate site statistics (total ratings, avg rating, albums rated, top vibes, puzzle stats). 5-minute double cache (route + db layer).
