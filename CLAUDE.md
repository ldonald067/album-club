# Album Of The Day Club

Retro forum-style site — new album daily, anonymous rating/vibes/games. Next.js 15 + SQLite.

## Commands

```bash
npm install              # Install deps (includes better-sqlite3 native build)
npm run dev              # Dev server on localhost:3000
npm run build            # Production build
```

## Workflow

After every change: `git add -A && git commit -m "description" && git push`

## Stack

- **Next.js 15 App Router** — single-page app, server + client components
- **SQLite** (better-sqlite3) — WAL mode, auto-creates `data/aotd.db` on first request
- **No auth** — anonymous interactions, localStorage tracks daily participation
- **CSS** — all in `globals.css`, retro 2004 forum aesthetic, no Tailwind

## Structure

```
app/page.js           # Server component — resolves today's album
app/ForumPage.js      # Client component — all UI + game components
app/globals.css       # All styling
app/api/{rate,vibe,guess,stats}/  # API routes
lib/albums.json       # 403 albums (source of truth)
lib/albums.js         # Seeded shuffle, game logic, VIBES, CAROUSEL_ICONS
lib/lyrics.json       # ~88 lyric entries for Lyric game
lib/db.js             # SQLite queries
lib/rate-limit.js     # IP-based rate limiter
scripts/              # fetch-albums, fetch-covers, fetch-lyrics, fetch-youtube-ids
docs/                 # Detailed docs (read before relevant tasks)
```

## IMPORTANT: Read docs before working on specific areas

- `docs/games.md` — 5-game rotation, rules, fallbacks, share buttons
- `docs/api.md` — rate limiting, caching, route validation
- `docs/gotchas.md` — hydration, build issues, data quirks
- `docs/album-data.md` — album format, quality rules, external APIs

## Skills

- `/add-album` (auto) — add album to rotation with validation
- `/preview-schedule` (auto) — check upcoming album schedule
- `/ux-review` (auto) — accessibility + mobile review after UI changes
- `/api-harden` (auto) — security review after API changes
- `/perf-check` (auto) — performance review after new features
- `/deploy` — production build + deploy
- `/reset-day` — clear today's data for testing

## Repository

GitHub: https://github.com/ldonald067/album-club (public)
Git config: user `ldonald067`, email `ldonald067@users.noreply.github.com`
