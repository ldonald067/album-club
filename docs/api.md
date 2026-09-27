# API Patterns

## Rate Limiting (`lib/rate-limit.js`)

Two layers of protection, both using in-memory Maps:

- **Per-minute**: `checkRateLimit(ip)` — 30 req/min sliding window per IP
- **Per-day**: `checkDailyLimit(ip, endpoint)` — 12 submissions per IP per endpoint per day. The limit is per *address*, not per person — 12 is the NAT/CGNAT allowance; the per-person control is the client's localStorage guard. Don't restate the number in comments; defer to the function
- **IP resolution**: `getRealIp()` prefers `x-real-ip` (proxy-controlled on Railway; clients can't set it), falls back to the **rightmost** `x-forwarded-for` hop (the one appended by Railway's edge proxy — leftmost entries are client-supplied and spoofable), and ignores junk header values. **IPv6 is keyed per /64** (`ipv6Prefix64`), because one holder of a /64 could otherwise rotate addresses past every limit
- **Memory cap**: both maps are bounded (10k tracked IPs; 10× that for daily entries). At the cap both purge stale entries first. Then the per-minute map evicts its coldest 10% and never stops tracking, while the daily map **fails open on purpose** — its keys are day-scoped, so a full table means a genuinely enormous day, and refusing votes is worse than missing a few counts. A 60s `setInterval` purges both maps, and a time-throttled backstop sweep covers traffic spikes between intervals
- **Date validation**: `isValidDateKey()` validates `YYYY-MM-DD` format, real calendar date, not in the future
- Vote/game POST routes reject bodies over 1024 characters, with a `content-length` precheck before buffering.
- POST routes require the parsed JSON body to be an object. Arrays / primitives get a clean `400`.
- Daily quotas are checked **after** body validation, so malformed requests don't consume them.
- Public JSON routes respond through shared helpers in `lib/api-helpers.js`, which add `Cache-Control: no-store` everywhere and `Retry-After` headers on `429` responses so browsers and clients do not cache stale vote data.

## Database (`lib/db.js`)

- **SQLite** via better-sqlite3, WAL mode, singleton connection
- **Busy timeout**: `busy_timeout = 5000` reduces transient lock failures under overlapping writes
- **Prepared statements** cached at module scope, created once on first `getDb()` call
- **Covering indexes** on all query patterns: `(album_key, rating)`, `(album_key, vibe)`, `(puzzle_key, attempts, solved)`, `(album_key, vote)`, `(matchup_key, pick), `(album_key, pick)` on `soundtrack_votes`

Routes translate SQLite lock/open/corruption errors into safe public responses (`503` with retry language) instead of exposing raw internals.

Every GET route keeps a 30s in-memory cache busted on POST, except `/api/stats` (5 min) and `/api/soundtrack/history` (60s). In-memory is enough for a single-instance deployment.

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

Daily limits are per game type (`guess-${type}`). Attempts must be integer 1-maxAttempts, solved is boolean, unsolved must have attempts=maxAttempts. `429` responses now include `Retry-After`, and all responses opt out of browser caching.

### POST/GET `/api/playlist`

Binary poll: "Would you add this to your playlist?" Vote must be boolean. GET validates `?key=` same as rate. 30s in-memory cache, busted on POST.

### POST/GET `/api/matchup`

Shared endpoint for Album vs Album and Blind Taste Test. `?type=` param: `versus` or `taste`. POST body: `{ type, pick }` where pick is `"A"` or `"B"`. Returns `{ a, b, total }`. 30s in-memory cache per type, busted on POST. Daily limit shared across both types (`matchup` endpoint key). DB table: `matchup_votes` with `matchup_key` format `{type}-{date}`.

### GET `/api/stats`

Aggregate site statistics (total ratings, avg rating, albums rated, top vibes, puzzle stats). 5-minute double cache (route + db layer), but the HTTP response itself is `no-store` so clients always revalidate instead of hanging onto old totals.

### POST/GET `/api/soundtrack`

Soundtrack Corner's "where does this cue belong" vote. POST body: `{ pick }` where pick is `"game"`, `"film"`, or `"tv"`. Returns `{ game, film, tv, total }` counts for today's album. GET returns the same distribution (30s in-memory cache, busted on POST). Daily limit per IP as above (`soundtrack` endpoint key). DB table: `soundtrack_votes` keyed by the daily `album_key`.

### GET `/api/soundtrack/history`

The Archive's cue log. Returns `{ days: { "YYYY-MM-DD": { game, film, tv, total } } }` for the last 30 days — the same window the Archive table lists. Read-only (the vote itself still goes to `/api/soundtrack`), 60s in-memory cache keyed by the UTC date. The `Room` column derives a winner client-side and shows nothing below two votes or on a tie; the raw counts are returned so that floor stays a UI decision rather than something baked into the payload.

### GET `/api/health`

Deploy/status probe: `{ commit, volumeMounted, uptimeSeconds }`. `commit` is the short Railway commit SHA (`"dev"` locally), `volumeMounted` reports whether `RAILWAY_VOLUME_MOUNT_PATH` is present (i.e. the SQLite volume is attached). Rate-limited like every other route. Used to verify deploys landed and the data volume is still attached. A climbing `uptimeSeconds` is also the check that distinguishes a real crash loop from Railway's cosmetic "Deploy Crashed" notification — see `docs/gotchas.md` → Deployment.

### GET `/api/backup`

Returns a consistent SQLite snapshot of the live database, for the daily backup workflow. **Token-gated**, `Authorization: Bearer <token>` only (no query-string token — it would leak into logs), compared by hashing both sides (`lib/token-match.js`) so a wrong length answers no faster. Without the token it 404s rather than 401ing, so the route does not advertise its own existence. Driven by `.github/workflows/backup.yml` (daily 06:00 UTC, 90-day artifact retention) using the `BACKUP_URL` + `BACKUP_TOKEN` Actions secrets. Operational detail and the Litestream upgrade path live in `docs/project.md` → Database Backups.
