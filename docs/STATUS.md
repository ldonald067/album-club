# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-10-07.

This file holds **current state, open items and standing decisions** only.
How things work lives in the topic docs; what happened and when lives in git
history (`git log`, and this file's own history for the long-form narrative
it used to carry).

## Handoff — read this first

**Nothing is in flight.** `master` is clean and deployed. `GET /api/health`
returns the running commit SHA — it should match `git rev-parse --short
origin/master` — and `uptimeSeconds` should climb. No PRs are open; `master`
is the only branch, locally and on GitHub. Checked 2026-10-07: production had
run the turntable build for six days without a restart, and today's album
(_Daydream Nation_) has audio, so the deck is live on the home page.

**Keep each chat under ~300k tokens of context.** The owner is on the Pro
plan and was hitting the 5-hour limit too soon: every message re-reads the
whole context, and one session at ~400k had used 43% of a fresh 5-hour window.
A new chat here starts at ~60k. Check the size with the ccd `get_usage` tool;
at ~300k, write the handoff here, commit, push, and start a new chat. Keep
context lean on the way: this file first, files read by range, page text over
screenshots, and a `pattern` or `limit` on `read_console_messages`.

**Several Claude sessions share this folder's working tree.** That is now
guarded: broad staging (`git add -A`, `.`, `-u`, `git commit -a`) is blocked
by a hook, so stage files by name and read `git status` first. The rules are
in `CLAUDE.md` → Workflow; for long parallel work, use a worktree (verified to
install, test and build cleanly).

**What changed 2026-09-29 → 10-01**, all live:

- **The record shows today's tracklist** — one faint ring between each pair
  of songs, from the real track count (rings on 328 of 423 albums; none rather
  than a guess on the rest).
- **Anniversary pressing** — in an album's round-number year the record is
  coloured vinyl in its accent colour (83 albums in 2026; live today on
  _ATLiens_, 30 this year).
- **A second tab can't vote twice.** All six votes re-check the stored vote
  at submit; proved with two real tabs (open item 6).
- **Two project hooks fixed and proved live:** the broad-staging block (new)
  and the `data/` database guard, which had never blocked anything — it
  exited 1, and hooks block only on exit 2 or a JSON deny.
- **The Hayley Williams bootleg is gone** — an unofficial upload, songs in
  alphabetical order, one missing. Removed on the owner's call; the album now
  shows no player and wears its real Cover Art Archive cover (its image had
  been that video's thumbnail). Pinned through 2026-10-02.
- **A turntable you can play by hand** (owner asked for each piece). On
  playable days a silver deck stands beside the sleeve. Play slides the record
  all the way out onto the platter and the tonearm tracks progress. **Click
  the grooves** to drop the needle there; **drag the arm** to scrub, or off
  the record to stop; **hear an album through** and the needle rides the
  run-out while side A's etching appears and the album joins a private "heard
  all the way through" count; **the needle is remembered** for the rest of
  the day. Geometry in `lib/tonearm.js`, memory in `lib/needle.js`, both
  tested; details in `docs/components.md` → "The record on the deck" (open
  item 7).

Earlier (09-27 → 09-28): PR #5 pinned each day's picks — **every edit to
`lib/albums.json` or `lib/lyrics.json` needs `npm run pin-schedule` and
`lib/schedule.json` committed with it** (`docs/album-data.md` → "The pinned
schedule"); the catalog identity audit (`npm run audit-catalog`) ran and was
ruled on — mixes stay; every adversarial-review finding was fixed; the docs
were cut to current state.

**Where to pick up, in this order:**

1. **One phone check** — tap through the Blind Taste Test on an iPhone and an
   Android phone, and while there, on an audio day, press Play, tap the
   grooves and drag the tonearm with a finger (open item 2). Audio days
   coming up: 10-07, 10-09, and 10-13 through 10-16.
2. The catalog audit's remainder (open item 1), then everything else below.

Two open actions need a human rather than code: **nobody has put the link
anywhere** (open item 4), and **album audio needs a YouTube Data API key**
(open item 3).

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
localStorage for client state. Six tab routes render one client component,
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

Deploy = push to `master`. Verify with `GET /api/health` (running commit SHA,
`volumeMounted`, uptime). CI (`.github/workflows/build.yml`, Node 22) runs
`npm test`, `npm run eval-site`, then `npm run build`.

## Operational facts

- **DB persistence:** a Railway volume is attached; `lib/db.js` writes to
  `RAILWAY_VOLUME_MOUNT_PATH`. Data survives deploys (verified).
- **Backups:** `GET /api/backup` (Bearer token only) is pulled daily at 06:00
  UTC by `.github/workflows/backup.yml` into a 90-day artifact. Details in
  `docs/project.md` → Database Backups.
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

1. **Catalog identity — audited and mostly ruled on (2026-09-27).**
   `npm run audit-catalog` (method and its pitfalls in `docs/album-data.md`).
   345 entries are verified against MusicBrainz. Ruled: **mixes and playlists
   stay** (see Standing decisions), including the two that borrow a real
   album's name ("Geogaddi Ambient Mix", "Vespertine Chill Mix" — recorded in
   the script's `DECIDED` map); "Tiny Desk Concert Collection — Waiting for
   the Sun to Rot", which had nothing real behind it, was removed before it
   aired. Still open, none urgent:
   - **Metadata:** _SIMBI_'s year corrected 2024 → 2021. _Weightless_ is a
     single (fine under the mixes ruling). _Madvillainy_ stays 2004, the
     official release; MusicBrainz dates the 2002 leak. A year fix does not
     break recorded days; a rename or removal does.
   - **Real but unconfirmed (37):** 11 named sessions (Boiler Room, Essential
     Mix, Cercle, Tiny Desk, KEXP — confirm each performance exists), 24 real
     artists whose release is under a native-script title (mostly the anime
     soundtracks), 2 Various Artists compilations under shortened titles
     (_Tropicália_, _EGOLI_). Confirm when convenient.

   Adding albums is unblocked. Add each for a reason; a new 2026 release
   should get a set air date or the yearly shuffle may not reach it while it
   is new. Later ideas from the catalog reviewer: per-game eligibility instead
   of one `recognizable` flag; distinct artists in Artist Scramble; measure
   "the next 30 days are ready" rather than every field for every entry.

2. **A phone check only a person can do.** Everything else from the
   2026-09-26 adversarial review is fixed and verified.
   - **Tap through the Blind Taste Test on an iPhone and an Android phone.**
     "Playing" and the one-minute "heard" timer now start only when YouTube
     reports PLAYING, and the button stays tappable until then, so a blocked
     first play can be retried with a real tap. Verified on desktop with a
     simulated block; automation cannot produce a real phone tap.
     `docs/components.md` → "Blind Taste Test players are lazy".
   - **The turntable on a real phone.** Verified in a 375px emulation
     (centred, no sideways scroll, plays, needle drops) and with a mouse;
     a finger dragging the arm has not been tried on a device.
   - **Done 2026-09-30: the Hayley Williams video is removed.** _Ego Death at
     a Bachelorette Party_'s "full album" (`bVQ-J6J44Ts`) was an unofficial
     upload — songs in alphabetical order, "Love Me Different" missing, 51 of
     67 minutes, a channel claiming the rights to her record. If a fetch ever
     offers that id again, it is the same bootleg.

3. **Album audio needs a proper refetch — blocked on a YouTube Data API key.**
   Only a minority of stored videos are whole albums; most are one song, and 21
   dead or wrong ids were removed after the 2026-09-24 audit (details in
   `docs/album-data.md`). The inline player therefore works on roughly a
   quarter of days. The fix is a rewritten `fetch-youtube-ids.mjs` that
   searches for full albums, checks title and duration before storing
   anything, and covers the whole catalog — not just the `recognizable` albums
   it was written for. The free tier's 100 searches a day make that four to
   five days of runs. Audit the result with
   `npm run audit-youtube-ids -- --albums <candidate>` before it replaces the
   catalog. It now demands evidence a long upload is the right album.

4. **There is no audience yet, and that governs what is worth building.**
   As of 2026-08-22, `GET /api/stats` reported **one rating, one puzzle play and
   zero vibes**, and Railway's request volume matched (judge pageviews by
   GoatCounter). Every community gate holds back below two participants,
   correctly, so the cue vote's room split, the Archive's Room column and "what
   the club is hearing" all render nothing. **The bar for the next community
   feature is not "is it good" but "who is in the room".** Solo-working
   features still pay off. **What would move it is not code:** submitting the
   sitemap and putting the link in front of anyone needs a human with the
   accounts.

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
   traffic grows.** The cheap partial fix is in (2026-09-30): all six votes —
   rating, playlist, Album vs Album, Taste Test, Vibe Check, the cue vote —
   re-read their stored vote at submit (`lib/stored-vote.js`), so a second
   tab shows the first tab's vote instead of casting another. Proved with two
   real tabs: tab B sent nothing and showed tab A's pick. Still open by
   design: cleared storage, a second device, and two tabs clicking in the
   same instant.

7. **The record — built out (2026-09-29 → 10-01).** The owner asked for fun
   things the hero vinyl could do beyond spinning; the bar applied is motion
   that says something true about the day's record. Details and limits in
   `docs/components.md` → "The record on the deck".
   - **Built: grooves drawn from the tracklist.** One ring between each pair
     of songs. Rings on 328 of 423 albums; the rest honestly show none.
   - **Built: a turntable and a tonearm that is the progress bar.** Audio
     days only (~27%). The owner found the first version (record 70px out,
     arm squeezed beside it) cramped and asked for more room: the record now
     comes all the way out onto a platter on a silver deck, 40px clear of the
     details. Below ~800px wide the details wrap under the deck on audio
     days, as on phones.
   - **Built: playing it by hand** — click the grooves to drop the needle,
     drag the arm, the run-out and side A's etching for an album heard
     through (90% actually played), and the needle remembered for the day.
   - **Next, if wanted: real song boundaries.** Only the track count is
     known, so the rings are evenly spaced and the needle cannot say which
     song it is on. MusicBrainz has each track's length; with it the rings
     would sit where songs really change and a needle dropped on a ring would
     start that song. Needs a check that the video plays the release's
     running order (the Hayley bootleg did not).
   - **Built: an anniversary pressing (2026-09-30).** Coloured vinyl in the
     album's accent colour in its round-number year. Not built: 45 rpm for
     EPs — only 3 entries.
   - **Skip:** anything audio-reactive (the YouTube iframe is opaque to Web
     Audio — the Club Player's spectrum was costume for this reason), and
     another flip (the Runout Groove is one).

## Standing decisions — do not "fix" these

- **No sharing, permanently (2026-08-25).** Not a backlog item and not a
  trade-off to revisit when traffic arrives. The rule and its boundary (the
  Open Graph card stays) are in `CLAUDE.md`; `eval-site` enforces it. **An
  activity that ends without a share button is finished, not unfinished.**
- **Mixes and playlists belong in the catalog (2026-09-27).** Not every entry
  has to be a released album — DJ sets, sessions, mood playlists and singles
  are fine, including mixes named after a real record. What is not fine is an
  entry with nothing real behind it. `audit-catalog` reports these as
  `MOOD_COMPILATION` without failing; do not "clean them up".
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
- **Two 2026 albums are deliberately uncovered in Soundtrack Corner** — _BTS —
  Arirang_ and _Olivia Rodrigo — You Seem Pretty Sad for a Girl So In Love_.
  Scene-work for an album the author has not heard is invention; they get an
  honest generated corner. **Whoever knows those records should write them; do
  not fill the gap from a press release.** If the corner feels weak, measure
  the rendered output before writing more overrides. Append new generator
  profiles; never edit an existing regex (`docs/soundtrack-corner-research.md`).
- **Album facts use consensus across editions**, not earliest, median or
  minimum — each of those produced confident wrong numbers (_Kind of Blue_ at 3
  tracks). `docs/album-data.md`.
- **The Cozy "Full screen" button sits below the fold at common desktop
  sizes.** Moving it above the frame was offered and declined.
- **Two commits share a subject line** (`ae1314c`, `e25fa7b`). Fixing it means
  force-pushing rewritten SHAs onto the branch that auto-deploys production.
  Leave it.
