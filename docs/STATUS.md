# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-07-30.

## What this is

Album Of The Day Club — a retro-2004-forum daily-album site. Live at
https://littlealbumclub.net on Railway (auto-deploys on push to `master`).
Next.js 16 + React 19 + SQLite (better-sqlite3, WAL). No auth, anonymous,
localStorage for client state. One-page app: `app/ForumPage.js` (~4.4k lines,
all UI/games) + `app/SoundtrackCorner.js`. See `CLAUDE.md` and `docs/` for the
domain-specific deep dives (games, api, components, album-data, performance,
gotchas, project, soundtrack-corner-research).

## Everyday commands

```bash
npm run dev                 # local dev
npm run build               # must pass before pushing
npm test                    # node:test — rotation, sampler, guess validation
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
- **Backups — DONE (2026-07-23):** `BACKUP_TOKEN` is set in Railway and as a
  GitHub Actions secret (alongside `BACKUP_URL`). `GET /api/backup` verified
  live (404 without token, 200 SQLite snapshot with it, integrity `ok`);
  `.github/workflows/backup.yml` ran green and stored a 90-day artifact. Daily
  at 06:00 UTC from here on. Litestream is the documented continuous-replication
  upgrade (not wired).

## Recent work (this stretch of sessions)

- **Genre Bingo removed (2026-07-28).** The board was derived purely from the
  calendar — cells were non-interactive `div`s and `getMonthMatches()` read only
  the date, so progress was identical whether or not anyone ever visited.
  **Deliberately not replaced, and don't revisit it.** A replacement game was
  designed and built, then cut and deleted outright on the judgement that the
  home page already carries enough per-visit activity (Rate/Vibe, Playlist Poll,
  Album vs Album, Blind Taste Test, the rotating daily game, Soundtrack Corner)
  for a ~90-second visit. The standing conclusion is that this site is
  over-featured rather than under-featured: the bar for adding a seventh
  activity is that it beats improving the six that exist.
- **Catalog data repair (2026-07-30).** 8 of 88 lyric entries were not from the
  album they were filed under — most seriously _Kind of Blue_, an instrumental
  jazz record, served a rap verse containing a racial slur. Purged, with four
  ingest guards added to `scripts/fetch-lyrics.mjs` (instrumental denylist,
  translation-page filter, credits filter, minimum blankable words) so a re-run
  can't reimport them. Also fixed: a duplicate album colour, 24 lyric lines too
  short to blank, and the lyric blank-stride collision that silently halved the
  puzzle on any line with exactly 7 blankable words. Three new `eval-site`
  guardrails cover all of it.
- **Sampler:** `pickRotatingPoolAlbum` now indexes by appearance ordinal, not
  `dayOfYear`. See the gotcha below — this is load-bearing.
- **Easter eggs:** Still Spinning (tab-away title) and the Runout Groove
  (double-click the vinyl for a per-album matrix etching).
- **Zero-traffic honesty:** Album vs Album drew a 100%/0% bar labelled `(1)`/`(0)`
  for a lone voter and Vibe said "You and 100% felt X". Both now hold the split
  back until a second voter exists. Note `vibes` stores one row per _mood_, not
  per person, so `results.total` is not a headcount.
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
- **Landing polish:** fixed two literal-escape JSX bugs (bare JSX text _and_ a
  JSX attribute — escapes decode in neither), right-sized the versus/playlist/
  taste action buttons so their declared padding sets the height with the 44px
  tap target reapplied under `(pointer: coarse)`, aligned Album-vs-Album buttons,
  richer MiniTeaser cards.
- **Easter eggs:** 33⅓ Club (33 vinyl spins), secret taglines, album-birthday
  badge, cue-streak whispers, now-spinning tab title. Konami code pre-existing.

## Open items / next steps

1. ~~**Set `BACKUP_TOKEN`**~~ — DONE 2026-07-23 (see "Operational facts").
2. **Soundtrack Corner to 100%:** ~50 recognizable albums left, ~4 batches.
   Run `npm run soundtrack-corner-report`, write the top of the "Coming up in
   rotation" list (air-date-sorted) in the house voice, validate via
   `npm run eval-site`. Pipeline documented in `docs/soundtrack-corner-research.md`.
3. **Deferred by decision — community gates count rows, not people.**
   Neither `matchup_votes` nor `vibes` has a voter column or a uniqueness
   constraint, and `checkDailyLimit` allows 3 submissions per IP per endpoint
   per day, so one person can produce several rows: two tabs opened before
   voting (the localStorage guard only runs on mount), a retry after a lost
   response, cleared storage, or a second device. When that happens the
   "first one in today" gates open and the split renders as though a second
   person had voted. Fixing it properly means a submission/voter key plus a
   uniqueness rule and a server-derived participant count — a schema change and
   a migration to correct a cosmetic misfire that needs an uncommon trigger, so
   it was judged disproportionate at current traffic. **Revisit if traffic
   grows.** Cheap partial mitigation if it starts mattering: re-check
   localStorage at submit time rather than only on mount, which closes the
   multi-tab path. Found by `/adversarial-review` on `0b2f76e`; the two cheaper
   findings from that review (percentage denominator, restore validation) are
   fixed.
4. **Un-fixed review findings (lower severity, all in the review report):**
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
5. **Suggested features (from the review, not built):** "Predict the Crowd"
   (guess the room's average before reveal), "Divisive Meter", Streak Freeze,
   "The Verdict" one-tap critical tag. Deliberately avoid: freeform shoutbox,
   real leaderboards.

## Gotchas worth knowing

- `lib/albums.js` imports JSON with `with { type: "json" }` so Node's test
  runner can load it. All date math is UTC.
- Permutation cache grows ~2 entries/day now (per-day Versus/Taste seeds);
  bounded, resets per deploy.
- Emoji in **bare JSX text** must be real characters, not `\uXXXX` escapes
  (those only decode inside JS strings). The same applies to **JSX attribute
  values** — `label="📋 Share"` ships the escape verbatim, because
  attribute quotes are not a JS string literal either.
- **JSX can eat a leading space** in text that follows an element when that text
  contains an HTML entity: `<strong>{pct}%</strong> of today&apos;s vibes`
  rendered as `71%of`. Prettier collapses a `{" "}` fix back onto one line, so
  put the whole run in an expression: `{" of today's vibes"}`.
- **Never index a per-game pool by `dayOfYear`.** Each game airs every
  `GAME_TYPES.length` days, so `dayOfYear % pool.length` samples the pool at that
  stride and collapses annual variety to `pool/cadence` whenever the two share a
  factor — a pool of 80 would show 16 albums a year instead of 73, silently.
  `pickRotatingPoolAlbum` indexes by appearance ordinal for this reason, and
  `npm run eval-site` fails if that regresses.
- `results.total` on the vibe endpoint is a count of **mood rows, not people** —
  everyone picks up to three. It cannot be read as a headcount.
