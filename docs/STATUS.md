# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-07-31.

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
- **Data repair (2026-07-30).** 8 of 88 lyric entries were not from the album
  they were filed under — most seriously _Kind of Blue_, an instrumental jazz
  record, served a rap verse containing a racial slur. Purged; `fetch-lyrics.mjs`
  now enforces four ingest guards. Also fixed: a duplicate album colour, 24
  unblankable lyric lines, and a blank-stride collision that silently halved the
  lyric puzzle. Five new `eval-site` guardrails cover all of it, and the sampler
  moved to appearance-ordinal indexing (load-bearing — see `docs/gotchas.md`).
  Refilled 2026-07-31 to **122 of 133 (91.7%)**. Took three attempts: the first
  returned 24 entries of which ~5 were right, because Genius ranks by popularity;
  the fix that actually worked was sourcing tracklists from MusicBrainz and
  looking up those songs directly.
- **Cozy Vibes (2026-07-31).** jsmonzani's Greenhouse embed removed — that panel
  no longer hosts their game, so the byline went with it. Replaced by a Cozy
  Vibes tab holding the self-hosted Night Desk Terrarium sandbox plus three
  itch.io cards. Moved off the home page deliberately: that page carries ~25
  blocks and this is the heaviest thing on it. Adding a game is one entry in
  `COZY_GAMES` — see `docs/components.md`.
- **Zero-traffic honesty.** Album vs Album drew a 100%/0% bar labelled
  `(1)`/`(0)` for a lone voter and Vibe claimed a share of _people_ it cannot
  measure. Both now hold back until a second voter exists, and the vibe copy
  states what its number really is.
- **Easter eggs.** Still Spinning (tab-away title) and the Runout Groove
  (double-click the vinyl) joined the 33⅓ Club, secret taglines,
  album-birthday badge, cue-streak whispers, and the Konami code.
- **Housekeeping.** Two literal-escape JSX bugs fixed, action buttons right-sized
  with the tap target moved to `(pointer: coarse)`, and ~550 lines of dead CSS
  removed from the retired chat agent.
- **Earlier in this stretch:** a multi-agent review whose top 5 all shipped
  (off-volume backup, the `loadJson()` crash class + error boundary, node:test +
  CI, the UTC-midnight reload, even-stride pair repeats + icon subset);
  Soundtrack Corner's cue vote, explainer, teaser and 86 curated overrides
  (62.4% of the recognizable pool); and the catalog reaching 424 albums with all
  images populated and unique emoji/colours.

## Open items / next steps

1. ~~**Set `BACKUP_TOKEN`**~~ — DONE 2026-07-23 (see "Operational facts").
2. ~~**Refill the lyric pool**~~ — DONE 2026-07-31, 80 → **122 of 133
   (91.7%)**. The remaining 11 are 4 instrumentals that can never have lyrics
   plus 7 Genius won't resolve (Abbey Road, VU & Nico, Homework, both Jay-Z,
   Souvlaki, Bitches Brew). That is 94.6% of the achievable ceiling; the rest
   would need hand-curation. **Always read `git diff lib/lyrics.json` before
   committing a refill** — the guards catch the known failure shapes, not
   novelty.

3. **Two lyric entries need re-fetching.** *Frank Ocean — Blonde* and
   *Arcade Fire — Funeral* were removed 2026-08-01: both carried another
   album's song, found by the strengthened cross-album guardrail after every
   hand audit had missed them (they were older entries, and the refills only
   re-checked what they added). The next `fetch-lyrics` run picks them up.
   Pool is 120/133.
4. **Soundtrack Corner to 100%:** ~50 recognizable albums left, ~4 batches.
   Run `npm run soundtrack-corner-report`, write the top of the "Coming up in
   rotation" list (air-date-sorted) in the house voice, validate via
   `npm run eval-site`. Pipeline documented in `docs/soundtrack-corner-research.md`.
4. **Deferred by decision — community gates count rows, not people.**
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
5. **Un-fixed review findings (lower severity, all in the review report):**
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
6. **Suggested features (from the review, not built):** "Predict the Crowd"
   (guess the room's average before reveal), "Divisive Meter", Streak Freeze,
   "The Verdict" one-tap critical tag. Deliberately avoid: freeform shoutbox,
   real leaderboards.

## Gotchas worth knowing

Full list lives in `docs/gotchas.md` — read it before touching JSX text, the
game samplers, or the lyric data. The three most expensive ones:

- **Escapes never decode in JSX** — not in bare text, not in attribute values.
  Use real characters. This shipped twice.
- **Never index a per-game pool by `dayOfYear`** — it collapses annual variety
  whenever the pool size shares a factor with the rotation cadence.
  `pickRotatingPoolAlbum` uses the appearance ordinal; `eval-site` guards it.
- **Vote totals count rows, not people** — see open item 3.
