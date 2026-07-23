# Album Of The Day Club

Retro forum-style site — new album daily, anonymous rating/vibes/games. Next.js 16 + SQLite.

## Commands

```bash
npm install              # Install deps (includes better-sqlite3 native build)
npm run dev              # Dev server on localhost:3000
npm run build            # Production build (must pass before committing)
```

## Stack

- **Next.js 16 App Router** — single-page app, server + client components
- **SQLite** (better-sqlite3) — WAL mode, auto-creates `data/aotd.db` on first request
- **No auth** — anonymous interactions, localStorage tracks daily participation
- **CSS** — all in `globals.css`, retro 2004 forum aesthetic, no Tailwind

## Structure

```
app/page.js           # Server component — resolves today's album
app/ForumPage.js      # Client component — all UI, games, retention features
app/globals.css       # All styling
app/api/{rate,vibe,guess,stats,playlist,matchup,health}/  # API routes
lib/albums.json       # 424 albums (source of truth)
lib/albums.js         # Seeded shuffle, game logic, matchup pairing
lib/db.js             # SQLite queries (singleton, prepared statements)
lib/rate-limit.js     # IP-based rate limiter
lib/api-helpers.js    # Shared route validation/error helpers
lib/soundtrack-corner*.js  # Soundtrack Corner generator + curated overrides
app/SoundtrackCorner.js    # Soundtrack Corner tab component
scripts/              # Data fetch + eval tools (see docs/project.md)
```

## IMPORTANT: Read docs before starting any task

**New session? Read `docs/STATUS.md` first** — current state, what shipped, open items, and action needed (e.g. backups). Then identify which docs below are relevant and read them before making changes.

| Task involves...       | Read first            |
| ---------------------- | --------------------- |
| Where things stand     | `docs/STATUS.md`      |
| Games or puzzles       | `docs/games.md`       |
| API routes or database | `docs/api.md`         |
| UI components or state | `docs/components.md`  |
| Album data or imports  | `docs/album-data.md`  |
| CSS or rendering       | `docs/performance.md` |
| Build errors or quirks | `docs/gotchas.md`     |
| Skills or production   | `docs/project.md`     |

## Workflow

**Pushing to `master` deploys production** (Railway auto-deploys — see `docs/project.md`).

After every change: run `npm run build`, and only if it passes: `git add -A && git commit -m "description" && git push`. For risky changes, use a feature branch + PR instead of pushing straight to `master`.
