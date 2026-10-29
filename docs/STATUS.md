# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-10-29.

This file holds **current state, open items and standing decisions** only.
How things work lives in the topic docs; what happened and when lives in git
history (`git log`, and this file's own history for the long-form narrative
it used to carry).

## Handoff — read this first

**Production is current: on 2026-10-29 `/api/health` reported `19db3e8`**,
which is `origin/master`. **Halloween week is live:** on 10-29, at
1440px wide, the poster was in its Halloween frame with the jack-o'-lantern,
the error box read Boo.exe, and a badge read "HALLOWEEN IN 2". The Vintage
Halloween poster measured 15.39:1 for body text and 8.18:1 for the headline.

The 10-22 deploy check, from 23:34 to 23:41 UTC on `4fd5c1d`, found:

- **Wider margin rails: right.** Measured at 1380px wide, both rails are
  166px and the badges stack one to a row. At 1600 and 1920 both are 240px
  and the badges tile two to a row at 88×31. Both stay 16px clear of the
  edge, with no sideways scroll.
- **The one-person Soundtrack Corner: right on a generated day.** This was
  10-22's corner, _Emotion_:
  - The vote brought up the no-call line and the "I'd cue it under…" box,
    with a film placeholder and a 0/120 counter.
  - A saved pitch read back with Edit, and focus moved to Edit.
  - The cue sheet filed the album under Film score and listed the pitch.
  - With past cues seeded in the browser, the shelves filled from
    `/api/soundtrack/days`. _Folklore_ (10-19, the club's call) had the gold
    edge, measured at `rgb(201,162,39)`. The tally read "agree on 1 of 2",
    and a 07-01 cue was left off.
  - The vote's POST was answered inside the page, so no test row reached
    production, and the test cues were cleared afterwards. Do the same on
    10-29.
- **Covers: right.** `npm run audit-covers` passes: 400 covers, none dead,
  and only the five known-right entries listed.
  - The 10-26 Nina Kraviz and 10-28 Utena images were checked by eye: the
    Cercle set under the Eiffel Tower, and Utena art.
  - _Korean R&B Playlist_ (10-24) and _KEXP Live Sessions: Khruangbin_
    (11-03) carry no image, so they fall back to their emoji on their colour.
- **Still to see, on its day** (in "Where to pick up" below): the first
  hand-written corner since the change (today, 10-29) and the 11-03 emoji
  day. Nobody saw 10-24's emoji, and that day has passed.

**One thing is in flight: the full-album video refetch** (open item 3),
which searches a batch a day into a log and has not touched the catalog yet.
Day 1 (10-20): 95 albums searched, 48 checked picks kept. 10-21 was not
run. Day 2 (10-22): 94 searched, 49 picks, five of them edits and turned
into rules. **No batch has run since 10-22:** `--plan` still shows 138 to
search, about two days' quota. **The owner runs it by hand: they open a new chat and say
"run today's batch."** Run `npm run fetch-youtube-ids`, read every new pick's
title and channel by eye (day 1's rules let seven edits through — a reversed
tracklist, a 432Hz retune, crossfades, a continuous mix, disguised titles),
add a tested rule in `lib/youtube-match.js` for any new shape, then commit
`scripts/youtube-refetch.json` by name and push. The quota resets at
midnight Pacific; a run that hits it stops cleanly and says so. They chose
this over GitHub Actions or a scheduled task; do not re-offer automation.

No PRs are open. Apart from `master`, the only branch is
`deadair-content-note` (PR #6, merged), on GitHub and checked out in another
worktree. Leave it to that session to remove.

**Shipped most recently (10-14 → 10-29)** — each is described in its topic
doc, and what is still unchecked is in the open items:

- **Dead Air matches Cozy's width (10-29):** from 1280px up, the panel
  breaks out of the 960px column to 1260px, and the frame grows to 1200
  wide by 620 tall. On the dev server both tabs measured the same at
  1440px, and 1280px had no sideways scroll. `docs/components.md` → "Dead
  Air".
- **Dead Air’s content note (10-27, PR #6):** it names the blood and no
  longer mentions gore.

- **A parody 125×125 square in the badge column every day (10-27):**
  seven era formats drawn in CSS in our own words (punch-the-monkey,
  millionth listener, tray balloon, fake search, fake download, CLICK
  HERE, fake warning), each a notice for a club tab, plus a credit line
  in the disclaimer linking the three exhibitions they were studied
  from. The real banners were not copied: the museum's screenshots are
  their owners'. Hidden on a 1380–1411px window under 780px tall, where
  it would not fit. `docs/components.md` → "Margin rails".
- **Margin rails audit (10-28),** on the owner's ask, fixed and shipped:
  the Vintage poster unreadable in four looks (Halloween included,
  1.19:1), the square repeating the day before one day in five, the
  column cut off at 1380×760–779, and a skip link that still landed on
  ten rail tab stops. Tests that could not fail were replaced, and wrong
  numbers in the docs corrected.
- **The poster changes costume every week (10-23):** eight 2004 ad
  formats in turn, each Monday (UTC). Halloween covers 10-24 to 10-31,
  tabloid has 11-01 alone, and y2k starts 11-02. `docs/components.md` →
  "Margin rails".
- **Every catalog cover checked (10-22):**
  - 47 covers were fixed: 43 that belonged to someone else's record (for
    example, _Akira_ had a 2024 remix album and _French House Mix_ had
    _Mickey Mouse Clubhouse_) and four dead links.
  - Entries with no correct cover are listed in `eval-site`'s `NO_COVER`
    (23).
  - `fetch-covers` no longer takes Apple's first search result on trust.
  - The new `npm run audit-covers` fails on a dead cover.
  - Details are in `docs/album-data.md` → "Catalog identity".
- **Catalog identity audit worked through (10-22):**
  - 26 of the 33 open entries are confirmed, each with its source in the
    audit's `DECIDED` map.
  - The Nina Kraviz set was renamed to the one that exists (owner
    decision).
  - Seven still wait on the owner (open item 1).
- **Bundle re-measured (10-22):** a fresh visit downloads 228KB, against
  213KB on 09-03 measured the same way. Nearly all of the growth is the app
  chunk (+8.8KB), which holds the record and the rails. The generator and
  lyrics stay off the home path, and nothing needs cutting. Method and
  breakdown are in `docs/performance.md` → Bundle Budget.
- **Your own pitch on generated days (10-21):** on a corner with no club
  call, the vote is followed by a one-line "I'd cue it under…" box, kept in
  this browser only (`aotd_cue_pitch_<date>`), and the cue sheet lists your
  pitches under the shelves. `docs/components.md` → "Built for one person".
- **Soundtrack Corner for one person (10-21):** every hand-written corner
  makes its own call after you vote, with a running agree tally, and a cue
  sheet files every album you have called on three shelves of covers.
  `docs/components.md` → "Built for one person".
- **Wider margin rails (10-21):** the poster and badge column grow into the
  margin, up to 240px, instead of a fixed 160px and 120px; the badges tile
  two to a row. `docs/components.md` → "Margin rails".
- **The full-album fetcher, rewritten (10-20):** searches the whole catalog,
  checks every result's title, length and playability before keeping one,
  logs everything, never edits the catalog. `docs/album-data.md` → the
  refetch.
- **A doc audit against the code (10-20):** this file cut to current state,
  stale counts in the topic docs replaced by pointers to `eval-site`, and
  open item 3 found not to be blocked — the YouTube key was in `.env` all
  along.
- **Margin rails (10-19):** 1990s sidebar junk in the empty margins on
  windows 1380px wide or more, written from the day's data so it never needs
  editing. Halloween week (24–31 Oct) dresses it up and bills Dead Air, by
  the date alone. `docs/components.md` → "Margin rails".
- **A Dead Air tab (10-18):** `/dead-air` frames the owner's music horror
  escape room from its own repo and deploy. `docs/components.md` → "Dead
  Air".
- **The record's adversarial review, run in full (10-18):** verdict PASS,
  four findings fixed and verified. Song-day clicks and arm drags aim at the
  song (10-16, 10-18). `docs/components.md` → "The record on the deck".
- **Cozy shelf (10-14):** _Welcome to Kagemi_ (itch embed 5062300) replaced
  the old Kamegi build.

**The record, as it stands** (how it works in `docs/components.md` → "The
record on the deck"). Every day's record does something, and nothing it does
claims more than is known — the owner's rules:

- **Whole-album video** (the audit's `FULL_ALBUM` and `FULL_SESSION`
  verdicts, `lib/full-album-videos.json`): the arm sweeps every song ring,
  then the run-out and "heard all the way through".
- **One song the audit placed for certain** (`lib/song-videos.json`,
  `lib/place-song.js`): the arm plays only that song's band, lit gold and
  named. Most one-song videos are the title track; the rules and the unplaced
  list are in `docs/album-data.md`.
- **Any other video**: a single — no song rings, the arm crosses the whole
  groove. No run-out or award on a song or a single: the needle lifts and the
  platter winds down.
- **No video**: no deck; the record wears a pattern by date (zoetrope, spiral
  or picture disc, `lib/record-art.js`), half out of its sleeve. Most days of
  the year are these, which is what open item 3 would change.
- **Re-record after any `youtubeId`, title or track-count change:**
  `npm run audit-youtube-ids -- --record` rewrites both lists and prints every
  placement to read before committing; `eval-site` fails when they go stale
  and prints the current split of stored videos. _Live at Pompeii_ stays off
  the album list (`PART_AFTER_REVIEW`).

**Keep each chat under ~300k tokens of context.** The owner is on the Pro
plan and was hitting the 5-hour limit too soon: every message re-reads the
whole context, and one session at ~400k had used 43% of a fresh 5-hour window.
A new chat here starts at ~60k. Check the size with the ccd `get_usage` tool;
at ~300k, write the handoff here, commit, push, and start a new chat. Keep
context lean on the way: this file first, files read by range, page text over
screenshots, and a `pattern` or `limit` on `read_console_messages`.

**Several Claude sessions share this folder's working tree.** Broad staging
(`git add -A`, `.`, `-u`, `git commit -a`) is blocked by a hook, so stage
files by name and read `git status` first. The rules are in `CLAUDE.md` →
Workflow; for long parallel work, use a worktree (verified to install, test
and build cleanly).

**Where to pick up, in this order:**

1. **Two dated looks at the live site** (Halloween was seen live on 10-29,
   above):
   - **10-29 (today): the first hand-written corner since the one-person change**
     (_Reasonable Doubt_; the club's call is TV). After the vote, check for
     "The club went TV. You went …", the TV pitch card tagged "The club's
     call", and the agree tally.
   - **11-03:** _KEXP Live Sessions: Khruangbin_ shows its emoji.
   - **11-01:** the poster leaves its Halloween frame for tabloid, the
     first costume seen to change on production. Y2k follows on Monday
     11-02.
2. **One phone check** — only a person can do it (open item 2). The day
   kinds below hold until the refetch's picks are applied; after that,
   recompute them.
   - **Blind Taste Test** on an iPhone and an Android phone.
   - **A song day** (10-29, 11-01): press Play; tap near the gold band — on
     a phone any tap on the grooves should play the song, not spin the
     record; tap the arm without moving it and the song should carry on
     where it was; drag the arm with a finger and watch the platter keep
     turning. Whole albums 10-27 and 10-30; the next single is 11-14
     (_Future Nostalgia_).
   - **A pattern day** (a picture disc 10-21, a zoetrope 10-22, a spiral
     10-23): tap the record and watch it spin.
   - **Dead Air** (`/dead-air`): start the game in the frame; Full screen and
     Esc on Android (iOS Safari should offer Play in New Tab instead); in
     Safari, check a save made in the frame shows on a direct visit.
3. **Today's refetch batch, when the owner asks (open item 3)** — the
   routine is in "One thing is in flight" above. When `--plan` shows nothing
   left, the review, audit and re-record steps are listed in the open item.
4. **The catalog's remainder** (open item 1):
   - Seven entries need the owner's ruling. Ask them; don't decide.
   - The _Wolf's Rain_ album facts describe OST 2 instead of the entry's
     OST 1.

   Then everything else below.

**The one open action that needs a human rather than code: nobody has put
the link anywhere** (open item 4). Re-measured 2026-10-20, the site's
activity is exactly what it was on 2026-08-22.

**Five things a new session will get wrong without warning:**

1. **Measure colour, never read it.** Four separate contrast "findings" were
   measurement artefacts — gradients, opacity, a frozen animation timeline,
   translucent backgrounds. `docs/gotchas.md` → "Verifying colour".
2. **Never hardcode a colour.** Backgrounds and text resolve through
   `--surface-*` / `--text-*` tokens; `eval-site` fails on a raw light hex.
   `docs/skins.md`.
3. **Verify by outcome.** `eval-site` guardrails have repeatedly caught what
   careful reading missed. Run it, and add a guardrail when you fix a class of
   bug rather than just the instance.
4. **Do not write content for records you do not know.** Wrong data costs more
   than missing data.
5. **The verification tool lies too.** A scripted tab-close skips `pagehide`;
   Chrome refuses fullscreen to a synthesized click; resource timing cannot see
   RSC fetches; a hidden pane clamps timers and can return blank screenshots; a
   scripted click is not a media gesture on mobile; desktop Chrome plays what
   a phone would block, so simulate the block — and YouTube's `seekTo` starts
   a cued clip by itself. A lazy image added after load can read as
   unloaded in the pane until a screenshot paints it (the cue sheet's
   covers, 10-22). `docs/gotchas.md` → "Verifying with browser
   automation" and "Process".

## What this is

Album Of The Day Club — a retro-2004-forum daily-album site. Live at
https://littlealbumclub.net on Railway (auto-deploys on push to `master`).
Next.js 16 + React 19 + SQLite (better-sqlite3, WAL). No auth, anonymous,
localStorage for client state. Seven tab routes render one client component,
`app/ForumPage.js`; see `CLAUDE.md` for the map and `docs/` for the deep dives.

## Everyday commands

```bash
npm run dev                 # local dev
npm run build               # must pass before pushing
npm test                    # node:test — rotation, sampler, guess validation
npm run eval-site           # whole-site quality/guardrail pass
npm run pin-schedule        # after ANY catalog/lyrics edit
npm run audit-catalog       # read-only catalog identity audit, ~5 min
npm run audit-covers        # every cover loads; whose record each URL names, ~1 min
npm run audit-youtube-ids   # read-only video-id audit, ~4 min
npm run soundtrack-corner-report  # corner coverage + air-date queue + generator floor
```

**Every edit to `lib/albums.json` or `lib/lyrics.json` needs
`npm run pin-schedule` and `lib/schedule.json` committed with it**
(`docs/album-data.md` → "The pinned schedule").

Deploy = push to `master`. Verify with `GET /api/health` (running commit SHA,
`volumeMounted`, uptime). CI (`.github/workflows/build.yml`, Node 22) runs
`npm test`, `npm run eval-site`, then `npm run build`.

## Operational facts

- **DB persistence:** a Railway volume is attached; `lib/db.js` writes to
  `RAILWAY_VOLUME_MOUNT_PATH`. Data survives deploys (verified).
- **Backups:** `GET /api/backup` (Bearer token only) is pulled daily by
  `.github/workflows/backup.yml` into a 90-day artifact. Checked 2026-10-20:
  every run succeeds and uploads a real SQLite file. The cron says 06:00 UTC;
  GitHub starts it a few hours late. Details in `docs/project.md` → Database
  Backups.
- **Deploy "crashed" notifications: rare, not gone.** `instrumentation.js`
  exits 0 on SIGTERM, which is why these stopped being routine after 2026-07.
  One still arrived on 2026-08-13. **What the evidence supports:** the exit
  code alone does not predict them. The `npm error ... signal SIGTERM` line
  prints after `Stopping Container` on _every_ rollout — it is the `npm`/`sh`
  wrapper, not Node — yet four deploys that day produced one email. **What is
  only a hypothesis:** that overlapping deploys trigger it (the flagged
  container died 53s in while a second push's deploy overlapped it — one
  correlated event, never isolated). Three practices follow regardless:
  - **Batch commits; don't push twice within a few minutes.**
  - **Leave the notification on.** Muting is the only option that can hurt.
  - **Judge health by `GET /api/health` with a climbing `uptimeSeconds`**,
    never by log severity — Railway tags all stderr `error`. A single-replica
    deploy has a real few-second 502 gap mid-swap.
  - **A push can fail to start a deploy.** `3dba7b9` (2026-10-20) got no
    deployment at all — not waiting, not skipped — though CI passed; the
    next push deployed normally in under five minutes and carried it. If
    `/api/health` has not shown a new SHA after ~5 minutes, look at the
    service's deployments (the `railway` MCP's `list-deployments`) before
    assuming a slow build. Railway's GitHub check suite always reads
    "queued", so it is no signal.

  **If a crash email ever follows a single isolated deploy, that refutes the
  timing hypothesis — it does not confirm any replacement.** One candidate fix
  is verified and deliberately shelved: starting without the npm/sh wrapper
  (`node node_modules/next/dist/bin/next start`, serves correctly and exits 0
  on a real SIGTERM, checked locally 2026-08-13). It changes the production
  start path to chase a mechanism the evidence does not support.

- **Server Action probe traffic is external and inert.** Bursts of
  `Failed to find Server Action "x"` in the deploy logs are a scanner
  fingerprinting Next.js. This app defines **no** server actions and has no
  middleware, so the request dies at the manifest lookup. It stops being inert
  the day a server action is added.
- **Railway agent tooling is installed.** The `use-railway` skill and a local
  `railway mcp` server authenticate through the existing CLI login. `get_logs`
  needs an explicit `service_id` when you also pass a `deployment_id`. **Both
  repos live in one Railway project** — `album-club` and `cozyfun`. The server
  also exposes destructive tools (`remove_volume` would target the SQLite
  volume); do not call that class without asking.

## Open items

Only what is still open. Completed work lives in git history and the topic
docs.

1. **Catalog identity — audited and ruled on (2026-09-27), a remainder to
   confirm.** `npm run audit-catalog` (method and its pitfalls in
   `docs/album-data.md`). The rulings are standing decisions below; the
   metadata ones are: _Weightless_ is a single (fine under the mixes ruling)
   and _Madvillainy_ stays 2004, the official release, though MusicBrainz
   dates the 2002 leak. A year fix does not break recorded days; a rename or
   removal does. Still open, none urgent:
   - **The 33 "real but unconfirmed" were worked through on 2026-10-22.**
     25 are confirmed, each with its source in the audit's `DECIDED` map,
     alongside the four sessions confirmed on 10-07. Eight could not be
     confirmed. The owner ruled on one: _Cercle: Nina Kraviz at Château de
     Fontainebleau_ is renamed _Cercle: Nina Kraviz at Tour Eiffel_ (2018),
     her documented Cercle set, and it has that set's cover back. It is
     confirmed now and airs 10-26. What happens to the other seven is **the
     owner's call**. Each could be renamed or removed, and since none of them
     has aired, neither would break a recorded day:
     - _Essential Mix: Four Tet_ (2022): he has Essential Mixes from 2010,
       2015 (with Jamie xx), 2018 and 2026, but none from 2022.
     - _KEXP Live Sessions: Khruangbin_ (2019): KEXP has sessions from
       April 2018 and 2025-11-19, but none from 2019.
     - _Boiler Room: Berlin_: a city's night, with no performer to tie it to.
     - _jinsang — everything perfect is already here_: that title is claire
       rousay's 2022 album. Jinsang's 2018 album is _in flight_.
     - _Ravi Shankar — Midnight Ragas_, _Liniker — Mãe_ and _Lofi Girl —
       Jazz Vibes_: no release by that name under that artist, in MusicBrainz
       or Apple's catalog.
   - **Covers: 21 of the 37 wore someone else's record** (list and method in
     `docs/album-data.md` → "Catalog identity").
     - 11 now carry their own cover.
     - 10 lost their cover and went into `NO_COVER`: six sessions and
       broadcasts, and the four releases that could not be found. Nina
       Kraviz's came back with the rename, which leaves 9.
     - _Cercle: Solomun at Théâtre Antique_ is now dated 2018, from Cercle's
       dated announcement.
     - **Every cover was then checked (also 10-22).** 22 more belonged to
       someone else's record, and four were dead links:
       - 13 were replaced, among them _MAYHEM_ (it had _Chromatica_), _SIMBI_,
         _GOLLIWOG_ (it had Yo-Yo Ma) and _Debí Tirar Más Fotos_ (it had a
         piano covers album).
       - 13 mood mixes lost art that named somebody else's record.
       - `NO_COVER` now has 23 entries.
       - `fetch-covers` no longer takes Apple's first search result on
         trust.
       - The new `npm run audit-covers` fails on a dead cover. Method and
         rules are in `docs/album-data.md` → "Catalog identity".
     - **Found and not fixed:** `lib/album-facts.json` matched _Wolf's Rain
       O.S.T._ (2003) to **O.S.T. 2** (2004, 23 tracks), so its track count
       and runtime describe the wrong record. Its cover is now OST 1's.

   Adding albums is unblocked. Add each for a reason; a new 2026 release
   should get a set air date or the yearly shuffle may not reach it while it
   is new. Later ideas from the catalog reviewer: per-game eligibility instead
   of one `recognizable` flag; distinct artists in Artist Scramble; measure
   "the next 30 days are ready" rather than every field for every entry.

2. **A phone check only a person can do.** The dates to use are in "Where to
   pick up" above.
   - **Tap through the Blind Taste Test on an iPhone and an Android phone.**
     "Playing" and the one-minute "heard" timer now start only when YouTube
     reports PLAYING, and the button stays tappable until then, so a blocked
     first play can be retried with a real tap. Verified on desktop with a
     simulated block; automation cannot produce a real phone tap.
     `docs/components.md` → "Blind Taste Test players are lazy".
   - **The turntable on a real phone.** Verified in a 375px emulation
     (centred, no sideways scroll, plays, needle drops) and with a mouse;
     a finger dragging the arm has not been tried on a device.
   - **Dead Air on a phone and in Safari (2026-10-18).** Full screen with a
     real tap (the pane cannot grant it), iOS Safari's Play in New Tab, a
     save shared between the frame and a direct visit in Safari, and a 360px
     phone, whose 314px frame is under the 323px the game was tested at.
   - **An arm held past the run-out** should stay held until playback
     starts. Not browser-checked — it needs a whole-album day and a
     seven-second hold.

3. **Album audio: the full-album refetch is under way (started 2026-10-20).**
   Most stored videos are one song, not the whole album (details in
   `docs/album-data.md`), so most days have no video and wear a pattern
   instead of the turntable. `scripts/fetch-youtube-ids.mjs` is rewritten:
   it searches the whole catalog for full albums and keeps one only if its
   title and length check out (`lib/youtube-match.js`, tested). It never
   edits the catalog — every search, pick and rejection is logged in
   `scripts/youtube-refetch.json`, how it works is in `docs/album-data.md`.
   The key is in `.env` and works (this item once said it was blocked on
   one). The free tier's 100 searches a day make it about four days of runs;
   `npm run fetch-youtube-ids -- --plan` shows what is left. **Run
   `npm run fetch-youtube-ids` once a day** and commit the log. When nothing
   is left:
   - read `--near-misses`, and approve any in `REVIEWED_PICKS` only after
     watching it;
   - write the candidate with `--candidate <file>` and audit it with
     `npm run audit-youtube-ids -- --albums <file>`;
   - copy it over `lib/albums.json`, re-record with
     `npm run audit-youtube-ids -- --record` and read every placement it
     prints;
   - run `npm run pin-schedule` and commit `lib/schedule.json` with it: an
     album gaining an id changes the catalog fingerprint and reshuffles
     future Heardle and Taste Test picks.

4. **There is no audience yet, and that governs what is worth building.**
   `GET /api/stats` reported **one rating, one puzzle play and zero vibes** on
   2026-08-22, and exactly the same on 2026-10-20, two months and ~30
   feature commits later (judge pageviews by GoatCounter). Every community
   gate holds back below two participants, correctly, so the cue vote's room
   split, the Archive's Room column and "what the club is hearing" all render
   nothing. **The bar for the next community feature is not "is it good" but
   "who is in the room".** Solo-working features still pay off. **What would
   move it is not code:** submitting the sitemap and putting the link in
   front of anyone needs a human with the accounts.

5. **Shared layout — measure before building (raised 2026-09-09).** Every tab
   route renders the whole `ForumPage`, so a tab change remounts the banner,
   nav and every piece of shell state, and a `loading.js` would flash the whole
   page. Moving the shell into a shared App Router layout is the right
   long-term shape and a large refactor. What is **not** yet known is what a
   cold tab click costs a real visitor. Measure that on a real device first;
   build only if it is felt.

6. **Deferred by decision — community gates count rows, not people.** Neither
   `matchup_votes` nor `vibes` has a voter column or uniqueness constraint, and
   `checkDailyLimit` allows several submissions per IP per day, so one person
   can produce several rows (two tabs opened before voting, a retry, cleared
   storage, a second device) and open a "second voter" gate alone. A proper fix
   is a schema change and migration for a cosmetic misfire. **Revisit if
   traffic grows.** The cheap partial fix is in (2026-09-30): all six votes
   re-read their stored vote at submit (`lib/stored-vote.js`), so a second
   tab shows the first tab's vote instead of casting another. Still open by
   design: cleared storage, a second device, and two tabs clicking in the
   same instant.

7. **The record — what is left, if wanted.** Everything built is in
   `docs/components.md` → "The record on the deck".
   - **Real song boundaries.** Only the track count is known, so the rings
     are evenly spaced and the needle cannot say which song it is on.
     MusicBrainz has each track's length; with it the rings would sit where
     songs really change and a needle dropped on a ring would start that
     song. Needs a check that the video plays the release's running order
     (the Hayley Williams bootleg did not).
   - **KEXP's full Khruangbin performance** (`0PsOJ_fRckg`, 35.7 min) passes
     the audit's `FULL_SESSION` rule. However, KEXP's description says it was
     recorded on 2025-11-19, and the catalog entry is dated 2019. Attach it
     only if the entry is meant to be that session (open item 1).
   - **Skip:** anything audio-reactive (the YouTube iframe is opaque to Web
     Audio — the Club Player's spectrum was costume for this reason), another
     flip (the Runout Groove is one), and 45 rpm for EPs (only 3 entries).
   - The Hayley Williams "full album" (`bVQ-J6J44Ts`) was removed as an
     unofficial upload (2026-09-30). If a fetch ever offers that id again, it
     is the same bootleg.

## Standing decisions — do not "fix" these

- **No new community features (owner, 2026-10-21).** Design for one person
  using the site alone. The room-gated pieces already built stay as they
  are; nothing new waits on a second visitor.
- **No sharing, permanently (2026-08-25).** Not a backlog item and not a
  trade-off to revisit when traffic arrives. The rule and its boundary (the
  Open Graph card stays) are in `CLAUDE.md`; `eval-site` enforces it. **An
  activity that ends without a share button is finished, not unfinished.**
- **Dead Air is framed, not built here (2026-10-18).** The owner's own game,
  in its own repo and deploy; album-club gives it a tab and a frame and
  nothing else. It is not a seventh activity under the over-featured rule
  below. Change the game in `dead-air`, never by copying code in.
- **Mixes and playlists belong in the catalog (2026-09-27).** Not every entry
  has to be a released album — DJ sets, sessions, mood playlists and singles
  are fine, including mixes named after a real record ("Geogaddi Ambient
  Mix", "Vespertine Chill Mix", recorded in `audit-catalog`'s `DECIDED` map).
  What is not fine is an entry with nothing real behind it. `audit-catalog`
  reports these as `MOOD_COMPILATION` without failing; do not "clean them
  up".
- **The site is over-featured, not under-featured (2026-07-28).** Genre Bingo
  was removed and a designed replacement was cut. The bar for a seventh
  activity is that it beats improving the six that exist. Parked ideas from the
  2026-07 review — "Predict the Crowd", "Divisive Meter", Streak Freeze, "The
  Verdict" — all need a room (open item 4). Never: a freeform shoutbox or real
  leaderboards.
- **The Club Player is not coming back (2026-09-03).** A 2004 media-player view
  of the hero was built and deleted: it could not play on most days, over half
  its height was scenery, and it replaced real cover art with an emoji.
  Playback lives in the hero (`app/AlbumPlayback.js`); Webamp is the retro
  view. Reasoning in `docs/components.md`.
- **Soundtrack Corner's cue vote sits above the pitch cards**, with a "just
  read the pitches" skip link. `eval-site` fails if the order is reversed.
- **Soundtrack Corner's curated pass over the recognizable pool is complete
  (checked 2026-10-20)** — but `recognizable` is a games flag and every
  album airs, so most days still show a generated corner (the report's
  "Generated corners on air" line; since 2026-10-21 its queue lists every
  uncovered album by air date). Two recognizable albums are uncovered on
  purpose: _BTS — Arirang_ and
  _Olivia Rodrigo — You Seem Pretty Sad for a Girl So In Love_. Scene-work
  for an album the author has not heard is invention; they get an honest
  generated corner. **Whoever knows those records should write them; do not
  fill the gap from a press release.** Curating the rest of the catalog is
  the owner's call, not a backlog item. If the corner feels weak, measure the
  rendered output before writing more overrides. Append new generator
  profiles; never edit an existing regex
  (`docs/soundtrack-corner-research.md`).
- **Album facts use consensus across editions**, not earliest, median or
  minimum — each of those produced confident wrong numbers (_Kind of Blue_ at 3
  tracks). `docs/album-data.md`.
- **The Cozy "Full screen" button sits below the fold at common desktop
  sizes.** Moving it above the frame was offered and declined.
- **Two commits share a subject line** (`ae1314c`, `e25fa7b`). Fixing it means
  force-pushing rewritten SHAs onto the branch that auto-deploys production.
  Leave it.
