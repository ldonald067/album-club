# API Patterns

## Rate Limiting

- All routes use `checkRateLimit(ip)` — 30 req/min per IP, hard cap at 2000 tracked IPs
- IP via `getRealIp()` which prefers `x-real-ip` header (set by Vercel/Netlify)
- POST routes also use `checkDailyLimit(ip, endpoint)` — max 3 submissions per IP per endpoint per day
- All POST routes reject `content-length > 1024`

## Caching

- Each GET route has a 30s in-memory cache (`rateCache`, `vibeCache`, `guessCache`)
- Stats has 60s TTL
- Caches are keyed by today's date and busted on new POSTs

## Routes

### POST/GET `/api/rate`

Rating must be integer 1-10. GET validates `?key=` against `/^\d{4}-\d{2}-\d{2}$/`, falls back to today.

### POST/GET `/api/vibe`

Vibes must be 1-3 valid labels (deduplicated server-side). GET validates `?key=` same as rate.

### POST/GET `/api/guess`

`?type=` param supports `puzzle` (default), `cover`, `heardle`, `lyric`, `scramble`. Max attempts vary: puzzle=6, cover=5, heardle=6, lyric=4, scramble=5. Daily limits are per game type (`guess-${type}`). Attempts must be integer 1-maxAttempts, solved is boolean, unsolved must have attempts=maxAttempts.

### GET `/api/stats`

Aggregate site statistics. 60s server cache.
