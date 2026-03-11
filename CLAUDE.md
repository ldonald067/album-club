# Album Of The Day Club

Retro forum-style site — new album daily, anonymous rating/vibes/games. Next.js 15 + SQLite.

## Commands

```bash
npm install              # Install deps (includes better-sqlite3 native build)
npm run dev              # Dev server on localhost:3000
npm run build            # Production build (must pass before committing)
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
app/ForumPage.js      # Client component — all UI, games, retention features
app/globals.css       # All styling
app/api/{rate,vibe,guess,stats}/  # API routes
lib/albums.json       # 403 albums (source of truth)
lib/albums.js         # Seeded shuffle, game logic, VIBES, CAROUSEL_ICONS
lib/lyrics.json       # ~88 lyric entries for Lyric game
lib/db.js             # SQLite queries (singleton, prepared statements)
lib/rate-limit.js     # IP-based rate limiter
scripts/              # fetch-albums, fetch-covers, fetch-lyrics, fetch-youtube-ids
```

## IMPORTANT: Read docs before working on specific areas

Before starting any task, identify which docs below are relevant and read them first.

| Task involves...       | Read first            |
| ---------------------- | --------------------- |
| Games or puzzles       | `docs/games.md`       |
| API routes or database | `docs/api.md`         |
| UI components or state | `docs/components.md`  |
| Album data or imports  | `docs/album-data.md`  |
| CSS or rendering       | `docs/performance.md` |
| Build errors or quirks | `docs/gotchas.md`     |

## Skills

- `/add-album` (auto) — add album to rotation with validation
- `/preview-schedule` (auto) — check upcoming album schedule
- `/ux-review` (auto) — accessibility + mobile review after UI changes
- `/api-harden` (auto) — security review after API changes
- `/perf-check` (auto) — performance review after new features
- `/deploy` — production build + deploy
- `/reset-day` — clear today's data for testing

## Production

- **Live site**: https://littlealbumclub.net (Railway, auto-deploys on `git push`)
- **Analytics**: https://littlealbumclub.goatcounter.com (GoatCounter, script in `layout.js`)
- **Contact**: rainbowpudding@littlealbumclub.net (mailto link in footer)

## Repository

GitHub: https://github.com/ldonald067/album-club (public)
Git config: user `ldonald067`, email `ldonald067@users.noreply.github.com`
