# Album Of The Day Club

Retro forum-style site — new album daily, anonymous rating/vibes/games. Next.js 15 + SQLite.

## Commands

```bash
npm install              # Install deps (includes better-sqlite3 native build)
npm run dev              # Dev server on localhost:3000
npm run build            # Production build (must pass before committing)
```

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
app/api/{rate,vibe,guess,stats,playlist,matchup}/  # API routes
lib/albums.json       # 403 albums (source of truth)
lib/albums.js         # Seeded shuffle, game logic, matchup pairing
lib/db.js             # SQLite queries (singleton, prepared statements)
lib/rate-limit.js     # IP-based rate limiter
```

## IMPORTANT: Read docs before starting any task

Identify which docs are relevant and read them first. Load the full context before making changes.

| Task involves...       | Read first            |
| ---------------------- | --------------------- |
| Games or puzzles       | `docs/games.md`       |
| API routes or database | `docs/api.md`         |
| UI components or state | `docs/components.md`  |
| Album data or imports  | `docs/album-data.md`  |
| CSS or rendering       | `docs/performance.md` |
| Build errors or quirks | `docs/gotchas.md`     |
| Skills or production   | `docs/project.md`     |

## Workflow

After every change: `git add -A && git commit -m "description" && git push`
