# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-07-22.

## What this is

Album Of The Day Club — a retro-2004-forum daily-album site. Live at
https://littlealbumclub.net on Railway (auto-deploys on push to `master`).
Next.js 16 + React 19 + SQLite (better-sqlite3, WAL). No auth, anonymous,
localStorage for client state. One-page app: `app/ForumPage.js` (~5.4k lines,
all UI/games) + `app/SoundtrackCorner.js`. See `CLAUDE.md` and `docs/` for the
domain-specific deep dives (games, api, components, album-data, performance,
gotchas, project, soundtrack-corner-research).

## Everyday commands

```bash
npm run dev                 # local dev
npm run build               # must pass before pushing
npm test                    # node:test — rotation + guess validation
npm run eval-site           # whole-site quality/guardrail pass
npm run soundtrack-corner-report  # corner coverage + air-date queue + generator floor
```

Deploy = push to `master`. Verify with `GET /api/health` (returns running
commit SHA, `volumeMounted`, uptime). CI (`.github/workflows/build.yml`,
Node 22) runs `npm test` then `npm run build`.

## Operational facts (important)

- **DB persistence:** a Railway volume is attached; `lib/db.js` writes to
  `RAILWAY_VOLUME_MOUNT_PATH`. Data survives deploys (verified).
- **Deploy "crashed" notifications:** fixed — `instrumentation.js` exits 0 on
  SIGTERM. If they return, check that file; confirm health via `/api/health`.
- **Backups — ACTION NEEDED (2 min):** `GET /api/backup` is built but **inert
  until you set `BACKUP_TOKEN`** in Railway + add `BACKUP_TOKEN` and
  `BACKUP_URL` as GitHub Actions secrets. Then `.github/workflows/backup.yml`
  keeps daily snapshots as 90-day artifacts. Steps in `docs/project.md`.
  Litestream is the documented continuous-replication upgrade (not wired).

## Recent work (this stretch of sessions)

- **Independent multi-agent review** (Opus/ultracode) produced a ranked report;
  its top 5 are all shipped: off-volume backup, the fetch crash class + error
  boundary, node:test + CI, cross-midnight fix (UTC-midnight reload), and the
  even-stride pair repeats + pixel-icon subset.
- **Crash class:** all GET loaders go through `lib/safe-fetch.js` `loadJson()`
  (throws on non-2xx / `{error}` bodies) so a 429/503 can't poison state;
  `app/error.js` is the route error boundary.
- **Soundtrack Corner:** cue vote (game/film/TV → community reveal), explainer,
  home teaser + play-today CTA, year-rotated extra angles, 3 new genre profiles
  (generator floor 110→23 albums), and **86 curated overrides (62.4% of the
  recognizable pool)**. Share button was removed by request.
- **Catalog:** 424 albums through 2026 (added acclaimed 2025/26 releases +
  human-made YouTube sets). All images populated; emoji/colors unique.
- **Landing polish:** fixed literal-emoji JSX bug, aligned Album-vs-Album
  buttons, replaced sparse bingo/soundtrack rows with richer MiniTeaser cards.
- **Easter eggs:** 33⅓ Club (33 vinyl spins), secret taglines, album-birthday
  badge, cue-streak whispers, now-spinning tab title. Konami code pre-existing.

## Open items / next steps

1. **Set `BACKUP_TOKEN`** (see above) — highest-value remaining action.
2. **Soundtrack Corner to 100%:** ~50 recognizable albums left, ~4 batches.
   Run `npm run soundtrack-corner-report`, write the top of the "Coming up in
   rotation" list (air-date-sorted) in the house voice, validate via
   `npm run eval-site`. Pipeline documented in `docs/soundtrack-corner-research.md`.
3. **Un-fixed review findings (lower severity, all in the review report):**
   - `lib/api-helpers.js` chunked-body size bypass (MED) — precheck only fires
     with a Content-Length header.
   - HeardleGame leaves its clip timer running on a non-final wrong guess;
     BlindTasteTest can mark a clip "heard" after switching away — both minor,
     self-healing (`app/ForumPage.js`).
   - Rate-limiter fails open at 2000 IPs; per-IP daily cap of 3 over-blocks NAT;
     vote tables have no TTL and `getSiteStats` full-scans (`lib/rate-limit.js`,
     `lib/db.js`).
   - Boiler Room Berlin/Tokyo share one cover image URL (`lib/albums.json`).
   - `scrambleArtist` anti-identity guard is a no-op when first two chars match
     (latent).
   - A11y: footer + some small text below AA contrast; some `role="button"`
     divs handle Enter but not Space.
4. **Suggested features (from the review, not built):** "Predict the Crowd"
   (guess the room's average before reveal), "Divisive Meter", Streak Freeze,
   "The Verdict" one-tap critical tag. Deliberately avoid: freeform shoutbox,
   real leaderboards.

## Gotchas worth knowing

- `lib/albums.js` imports JSON with `with { type: "json" }` so Node's test
  runner can load it. All date math is UTC.
- Permutation cache grows ~2 entries/day now (per-day Versus/Taste seeds);
  bounded, resets per deploy.
- Emoji in **bare JSX text** must be real characters, not `\uXXXX` escapes
  (those only decode inside JS strings).
