# API Patterns

## Rate Limiting (`lib/rate-limit.js`)

Two layers of protection, both using in-memory Maps:

- **Per-minute**: `checkRateLimit(ip)` — 30 req/min sliding window per IP, hard cap at 2000 tracked IPs
- **Per-day**: `checkDailyLimit(ip, endpoint)` — max 3 submissions per IP per endpoint per day, hard cap at 20k entries
- **IP resolution**: `getRealIp()` prefers `x-real-ip` (set by Vercel/Netlify, not spoofable), falls back to the first valid `x-forwarded-for` hop, normalizes IPv4/IPv6 formats, and ignores junk header values instead of trusting them
- **Cleanup**: Deterministic `setInterval` every 60s purges stale entries from both maps. Additionally, probabilistic cleanup (~1% of requests) and size-based cleanup (>1000 IPs) run inline
- **Date validation**: `isValidDateKey()` validates `YYYY-MM-DD` format, real calendar date, not in the future
- Vote/game POST routes reject bodies over 1024 characters. `/api/chat` allows 4096 characters so it can carry short conversation context.
- POST routes now require the parsed JSON body to be an object. Arrays / primitives get a clean `400`.
- Public JSON routes now respond through shared helpers in `lib/api-helpers.js`, which add `Cache-Control: no-store` everywhere and `Retry-After` headers on `429` responses so browsers and clients do not cache stale vote/chat data.

## Database (`lib/db.js`)

- **SQLite** via better-sqlite3, WAL mode, singleton connection
- **Busy timeout**: `busy_timeout = 5000` reduces transient lock failures under overlapping writes
- **Prepared statements** cached at module scope (14 statements, created once on first `getDb()` call)
- **Covering indexes** on all query patterns: `(album_key, rating)`, `(album_key, vibe)`, `(puzzle_key, attempts, solved)`, `(album_key, vote)`, `(matchup_key, pick)`

Routes translate SQLite lock/open/corruption errors into safe public responses (`503` with retry language) instead of exposing raw internals.

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

Daily limits are per game type (`guess-${type}`). Attempts must be integer 1-maxAttempts, solved is boolean, unsolved must have attempts=maxAttempts. `429` responses now include `Retry-After`, and all responses opt out of browser caching.

### POST/GET `/api/playlist`

Binary poll: "Would you add this to your playlist?" Vote must be boolean. GET validates `?key=` same as rate. 30s in-memory cache, busted on POST.

### POST/GET `/api/matchup`

Shared endpoint for Album vs Album and Blind Taste Test. `?type=` param: `versus` or `taste`. POST body: `{ type, pick }` where pick is `"A"` or `"B"`. Returns `{ a, b, total }`. 30s in-memory cache per type, busted on POST. Daily limit shared across both types (`matchup` endpoint key). DB table: `matchup_votes` with `matchup_key` format `{type}-{date}`.

### GET `/api/stats`

Aggregate site statistics (total ratings, avg rating, albums rated, top vibes, puzzle stats). 5-minute double cache (route + db layer), but the HTTP response itself is `no-store` so clients always revalidate instead of hanging onto old totals.

### POST `/api/chat`

Server-only Crate Digger chat route with provider switching.

Body: `{ messages }` where `messages` is an array of recent `{ role, content }` items. Roles are limited to `"user"` and `"assistant"`, the route keeps the last 8 messages, each message is capped at 700 characters, and total body size is capped at 4096 characters.

Response: `{ reply, citations, usedTools, enabledTools, provider }`. `citations` contains web URLs or local knowledge-pack URLs, `usedTools` marks whether web search or knowledge-pack lookup actually ran, and `provider` is `"ollama"` or `"openai"`.

Rate limits: 12 requests/minute and 25 requests/day per IP via the shared in-memory limiter. The route adds today's album context server-side and does not trust client-provided album metadata. Burst and daily `429`s now send `Retry-After` so the client can back off intelligently.

Safety behavior: the route returns a brief boundary reply for requests that try to generate or endorse hateful content (for example racist or sexist jokes/insults). The latest user prompt is now checked through a shared moderation helper on both the client and the server, so obvious hateful asks get a consistent boundary even if client-side checks are bypassed. The same shared layer now redirects clearly off-topic film / TV / game / celebrity chatter back toward music, because Crate Digger is intentionally scoped to music material. The agent prompt also tells Crate Digger to acknowledge that it is a model, not a person, and to admit uncertainty instead of pretending it knows everything.

Reply shaping: the agent prompt now switches between lightweight reply modes based on the latest user turn (for example fact-check, recommendation, comparison, music-detail, debate, context, or chatty thread reply). This keeps answers shorter, less repetitive, and better matched to what the user actually asked.

Knowledge routing: local knowledge-file selection is now mode-aware too. Recommendation questions prefer recommendation/artist-arc notes, music-detail questions prefer analysis/context notes, context questions prefer scene/artist notes, and debate-style prompts prefer forum/debate guidance. The goal is to make local-mode answers feel more informed instead of just more verbose.

Development default: local Ollama (`CRATE_DIGGER_PROVIDER=ollama`, `OLLAMA_MODEL=gemma3:4b`, `OLLAMA_HOST=http://127.0.0.1:11434`). In Ollama mode, the route uses the local knowledge pack from `public/agent-knowledge/*.md` and does not perform live web search.

Production behavior: the route does **not** default to localhost Ollama. If `CRATE_DIGGER_PROVIDER` / `AI_PROVIDER` is unset, production prefers hosted OpenAI when `OPENAI_API_KEY` exists, otherwise it will use Ollama only when `OLLAMA_HOST` points at a real remote/self-hosted Ollama server. If neither is configured, `/api/chat` returns a clean unavailable state instead of trying `127.0.0.1`.

Availability check: the public `GET /api/chat` status route now does a quick Ollama health probe before advertising local chat as available. That keeps development and previews from showing a fake-live Chat Booth when `127.0.0.1:11434` is configured in theory but nothing is actually listening.

Optional hosted provider: OpenAI (`CRATE_DIGGER_PROVIDER=openai`). In OpenAI mode, web search is available with `tool_choice: "auto"`, and file search is added when `OPENAI_VECTOR_STORE_ID` exists. Run `npm run sync-crate-digger-knowledge` with `OPENAI_API_KEY` to create/refresh the vector store.

### GET `/api/chat`

Returns public chat availability for the Chat Booth UI so the client can disable posting cleanly when no provider is configured.

Response: `{ available, provider, model, enabledTools, reason }`
