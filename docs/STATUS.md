# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-08-06.

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

- **Skins (2026-08-06).** A "Skin" dropdown switches between the default 2004
  forum and a **Vintage** 1990s desktop. Every colour in the stylesheet now
  resolves through a `--surface-*` / `--text-*` token, so a skin overrides a
  palette rather than chasing selectors, and `eval-site` fails on a raw hex.
  Read `docs/skins.md` before touching it — the traps are specific and
  expensive. The default skin was proved unchanged by comparing computed
  colours for 311 selectors across five tabs, before and after.

- **Landing page reordered (2026-08-05).** Rate & Reveal, Vibe Check and the
  daily puzzle now follow the album directly; the poll, matchup, taste test and
  teasers sit below them. Rate & Reveal moved from 1259px to 569px — it had
  been a screen and a half down, below every secondary widget, on a page whose
  own copy promises "three ways to join today".

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
  Refilled 2026-07-31 to 122 of 133, now 120 after an adversarial review found two contaminated entries. Took three attempts: the first
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

Completed work is not listed here — it lives in git history and in the topic
docs. This section is only what is still open.

1. **Soundtrack Corner — effectively finished (2026-08-07).** Every recognizable
   album is curated except two. Get exact figures from
   `npm run soundtrack-corner-report`, never from prose; pipeline in
   `docs/soundtrack-corner-research.md`.

   **The two left are a judgement call, not a backlog.** _BTS — Arirang_ and
   _Olivia Rodrigo — You Seem Pretty Sad for a Girl So In Love_ are 2026
   releases past the point where this writing can be grounded in the actual
   records, and scene-work for an album the author has not heard is invention.
   Wrong data costs more than missing data, and an uncovered album still gets a
   generated corner — a worse one, but an honest one. **Whoever knows those two
   records should write them; do not fill the gap from a press release.**

   What is worth doing next here is the **generator floor**, not the last two
   overrides: albums whose genre matches no profile fall to `DEFAULT_PROFILE`
   and read blandest. One new profile improves dozens of albums at once. The
   report's "Generator floor" section tracks which genre clusters have piled up.

2. **Deferred by decision — community gates count rows, not people.** Neither
   `matchup_votes` nor `vibes` has a voter column or uniqueness constraint, and
   `checkDailyLimit` allows several submissions per IP per day, so one person
   can produce several rows: two tabs opened before voting (the localStorage
   guard only runs on mount), a retry after a lost response, cleared storage, a
   second device. The "first one in today" gates then open and the split renders
   as though a second person voted. Fixing it properly means a submission/voter
   key, a uniqueness rule and a server-derived participant count — a schema
   change and migration for a cosmetic misfire that needs an uncommon trigger.
   **Revisit if traffic grows.** Cheap partial mitigation: re-check localStorage
   at submit time rather than only on mount, which closes the multi-tab path.

3. ~~**Pre-existing contrast failures in the default skin**~~ — RESOLVED
   2026-08-07, and mostly by correcting the measurement rather than the CSS.

   An earlier version of this item listed four failures. **Three were not real.**
   `.playlist-btn` and the four `.vibe-label` variants sit on translucent tints
   — `rgba(...,0.15)` and `rgba(...,0.25)` over cream — and the audit had been
   treating those as opaque. Composited properly the buttons measure 10.56:1 and
   10.10:1, the labels 6.6–6.99:1. `.rank-progress-text` was likewise 5.05:1,
   not 3.73:1.

   One was real: `.activity-intro` at 4.22:1. `--text-intro` moved `#776` →
   `#6f6f5e`, giving 4.73:1 — the smallest darkening that clears AA, chosen so
   the band still reads as a soft aside.

   The lesson is in `docs/gotchas.md`: a contrast finding is not real until you
   have the **composited** background.

4. **Mobile verified (2026-08-07).** Checked at 375x812 with real touch
   emulation — mobile UA, five touch points, `(pointer: coarse)` active. No
   horizontal overflow on any tab in either skin, the Archive table fits, and
   vintage has zero contrast failures at that size. Two touch targets were
   fixed: the skin picker (20px) and the Guess row's input and button (20px),
   which are unclassed elements so every class-based rule in the
   `(pointer: coarse)` block had been missing them — the primary control of
   the daily game. `.banner-tagline` and `.footer-link` stay under 44px and
   are exempt: WCAG 2.5.8 excludes targets inline in a block of text.

   **A correction for anyone who read the old version of this file:** it said no
   in-session browser tool could emulate a viewport. That was wrong. The in-app
   Browser pane's `resize_window` mobile preset does full device emulation;
   only the Chrome extension's resize leaves the CSS viewport at desktop width.

5. **Suggested features (from the 2026-07 review, not built):** "Predict the
   Crowd" (guess the room's average before reveal), "Divisive Meter", Streak
   Freeze, "The Verdict" one-tap critical tag. Deliberately avoid: freeform
   shoutbox, real leaderboards.

## Gotchas worth knowing

Full list lives in `docs/gotchas.md` — read it before touching JSX text, the
game samplers, or the lyric data. The three most expensive ones:

- **Escapes never decode in JSX** — not in bare text, not in attribute values.
  Use real characters. This shipped twice.
- **Never index a per-game pool by `dayOfYear`** — it collapses annual variety
  whenever the pool size shares a factor with the rotation cadence.
  `pickRotatingPoolAlbum` uses the appearance ordinal; `eval-site` guards it.
- **Vote totals count rows, not people** — see open item 2.
