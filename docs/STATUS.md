# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-09-27.

This file holds **current state, open items and standing decisions** only.
How things work lives in the topic docs; what happened and when lives in git
history (`git log`, and this file's own history for the long-form narrative
it used to carry).

## Handoff — read this first

**Nothing is in flight.** `master` is clean and deployed at `e8da79d` (PR
[#5](https://github.com/ldonald067/album-club/pull/5), merged 2026-09-27);
verify with `GET /api/health`, which returns the running commit SHA.

**Each day's picks are pinned now.** Every edit to `lib/albums.json` or
`lib/lyrics.json` needs `npm run pin-schedule` and `lib/schedule.json`
committed with it — `eval-site` (also run by CI) fails until you do. Re-run
`pin-schedule` before merging any PR that sat overnight. Details in
`docs/album-data.md` → "The pinned schedule".

**Where to pick up, in this order:**

1. The review findings in open item 2, cheapest first.
2. The catalog audit's remaining small items (open item 1).
3. Everything else below.

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
   scripted click is not a media gesture on mobile. `docs/gotchas.md` →
   "Verifying with browser automation".

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

2. **Adversarial review findings 2–8 (raised 2026-09-26).** From a four-reviewer
   Codex pass over every unreviewed commit since `c6fd733`, verdict CONTESTED; finding 1 (High) was
   fixed by PR #5. All accepted, none fixed yet, none urgent.
   - **2 [Medium] Taste Test on a phone may play nothing.** The lazy players
     start the clip from YouTube's `onReady`, after the tap has ended, and
     mobile browsers block sound not started by a tap — yet the UI says
     "Playing…" and credits the clip as heard after 60s. Not verified on a real
     phone. Fix: start the timer and show "Playing" only on the player's
     PLAYING state; if blocked, re-enable Play so a second tap works.
   - **3 [Medium] The audit passes any long video as `FULL_ALBUM`** — a 30–60
     minute unrelated video is never listed. That defeats open item 3's
     refetch check. Require evidence it is the right album, else `UNVERIFIED`.
   - **4 [Medium] `KEPT_AFTER_REVIEW` matches on video id alone**, so an
     approved film would pass under the wrong album. Key it on artist, album
     and id.
   - **5 [Medium] The record is put away without Stop.** Paused is inferred
     from `elapsed > 0`, so seeking to 0 while paused, or pausing in the first
     half-second, sleeves it. Track paused from what was pressed.
   - **6 [Medium] Resume after pause jumps to full speed** — the spin-down's
     last step resets the rate to 1 (`spin()?.updatePlaybackRate(1)` in the
     vinyl deck). Resuming was never tested.
   - **7 [Low] Play during the 450ms put-away** lets the old WAAPI animation
     fight the new spin; nothing cancels it.
   - **8 [Low] The audit fetches a MusicBrainz tracklist for every id**,
     including decided ones, and one failed request aborts the run.

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
   catalog, after fixing finding 3 above.

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
   traffic grows.** Cheap partial mitigation: re-check localStorage at submit
   time rather than only on mount, which closes the multi-tab path.

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
