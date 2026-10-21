# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-10-21.

This file holds **current state, open items and standing decisions** only.
How things work lives in the topic docs; what happened and when lives in git
history (`git log`, and this file's own history for the long-form narrative
it used to carry).

## Handoff — read this first

**One thing is in flight: the full-album video refetch** (open item 3),
which searches a batch a day into a log and has not touched the catalog yet.
Day 1 (10-20): 95 albums searched, 48 checked picks kept, about 220 left —
three more days. **The owner runs it by hand: they open a new chat and say
"run today's batch."** Run `npm run fetch-youtube-ids`, read every new pick's
title and channel by eye (day 1's rules let seven edits through — a reversed
tracklist, a 432Hz retune, crossfades, a continuous mix, disguised titles),
add a tested rule in `lib/youtube-match.js` for any new shape, then commit
`scripts/youtube-refetch.json` by name and push. The quota resets at
midnight Pacific; a run that hits it stops cleanly and says so. They chose
this over GitHub Actions or a scheduled task; do not re-offer automation.
`master` is deployed. `GET /api/health`
returns the running commit SHA — it should match `git rev-parse --short
origin/master` — and `uptimeSeconds` should climb. No PRs are open; `master`
is the only branch, locally and on GitHub.

**Shipped most recently (10-14 → 10-21)** — each is described in its topic
doc, and what is still unchecked is in the open items:

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

1. **Halloween week goes live on its own on 10-24.** Load the live site that
   day in a window at least 1380px wide and 700px tall: the poster should be
   orange and black with a jack-o'-lantern label, Dead Air billed every other
   day, a badge counting down the nights, and the error box as Boo.exe.
   `test/margin-rails.test.mjs` renders every Halloween day; nobody has seen
   it on production yet.
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
   routine is in the first paragraph above. When `--plan` shows nothing
   left, the review, audit and re-record steps are listed in the open item.
4. **Re-measure the bundle** (open item 8), then the catalog audit's
   remainder (open item 1), then everything else below.

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
   a cued clip by itself. `docs/gotchas.md` → "Verifying with browser
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
    next push deployed normally in under five minutes and carried it.
    On 2026-10-21 it happened twice running: neither `13f7e4d` nor
    `da30d99` started one, so it is not a one-off. If
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
   - **Real but unconfirmed (33):** 7 named sessions (Boiler Room, Essential
     Mix, Cercle, KEXP — confirm each performance exists; both Tiny Desk sets
     and Boiler Room Tokyo and Montreal are confirmed by the series' own
     uploads, 2026-10-07), 24 real artists whose release is under a
     native-script title (mostly the anime soundtracks), 2 Various Artists
     compilations under shortened titles (_Tropicália_, _EGOLI_). Confirm
     when convenient.

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
     the audit's `FULL_SESSION` rule, if someone wants that entry to have
     audio.
   - **Skip:** anything audio-reactive (the YouTube iframe is opaque to Web
     Audio — the Club Player's spectrum was costume for this reason), another
     flip (the Runout Groove is one), and 45 rpm for EPs (only 3 entries).
   - The Hayley Williams "full album" (`bVQ-J6J44Ts`) was removed as an
     unofficial upload (2026-09-30). If a fetch ever offers that id again, it
     is the same bootleg.

8. **The bundle has not been measured since 2026-09-03** (212KB then,
   `docs/performance.md` → Bundle Budget). The turntable, tonearm, needle
   memory, record patterns and the Dead Air frame have all added client code
   since. Measure a fresh production visit from the network log; the
   `perf-check` skill covers it.

## Standing decisions — do not "fix" these

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
  (checked 2026-10-20).** The report's "Coming up in rotation" queue holds
  only two albums, and they are uncovered on purpose: _BTS — Arirang_ and
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
