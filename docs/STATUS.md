# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-09-25.

## Handoff — read this first

**Nothing is in flight.** `master` is clean, pushed, and deployed; verify with
`GET /api/health`, which returns the running commit SHA.

**2026-09-08 → 09-25 was one long stretch of reviews, each one fixed and
shipped.** In order, all live on `master`:

- **Every tab became a URL** (below) — six routes, one component.
- **Five project skills were brought back in line** with the code; two gave
  advice that would have caused harm (`add-album` said to sort a catalog whose
  order drives the rotation).
- **A UX review** found that a tab switch now discarded half-finished answers,
  that nine section titles were not headings, and that four of five game inputs
  missed the 44px touch rule. All five findings fixed.
- **An adversarial review** (three Codex reviewers) found `/soundtrack` served
  a crawler nothing, the routing guardrail proved only that folders existed,
  and three smaller faults. Fixed; the shared-layout question it raised is
  still open (open item 10).
- **A perf check** found the Blind Taste Test built two YouTube players on
  every home load, and that the nav's `prefetch` was buying nothing — which
  corrected a claim made twice, that tab clicks cost no request.
- **A design review** with the bar "meaningful": the solo Rate & Reveal, the
  vinyl that turns at 33⅓ while the album plays, and a daily header tint strong
  enough that each day finally looks like itself.
- **An audio audit** of all 135 stored video ids: only 39 are whole albums, 13
  were dead in the embed and 8 were not the album's music. The dead ones were
  breaking two games on ~1 day in 6; both now handle a dead video, and the 21
  bad ids are gone. The real fix is open item 7 and needs an API key.
- **An API hardening pass**: IPv6 was rate-limited per address (a /64 holder
  could rotate past every limit); now per /64. The backup token is header-only
  and compared in constant time.
- **The audio audit became a project script**, `npm run audit-youtube-ids`,
  after the session scratchpad holding the original was cleared. Run on the
  live catalog: 0 dead, 0 clips, 0 wrong-album ids.
- **An adversarial review of 09-25's work did not run** — the Codex account hit
  its usage limit (resets 2026-09-29 08:27). No verdict exists; open item 11.

Details for each are in Recent work below. Last deploy verified: `ca78471`.

**2026-09-08: every tab is a URL.** The six sections — Home, Soundtrack Corner,
Cozy Vibes, Archive, Stats, FAQ — were `activeSection` state on a single route,
which meant the entire site lived at `/`. Nothing could be linked to or
bookmarked, a reload always landed on Home, the back button left the site, and a
crawler only ever saw the home page. They are real routes now (`/soundtrack`,
`/cozy`, `/archive`, `/stats`, `/faq`), each with its own title, description and
Open Graph card, all six in the sitemap. `ForumPage` takes the tab as a prop.
(An earlier claim here, that tab switching cost no network because the nav
links prefetched, was wrong — see the perf check in Recent work.) Full write-up in
`docs/components.md` under "Routing". Two things it turned up: image metadata
files are **not** inherited by nested segments, and `ForumPage` now unmounts on
every tab change, which is what made the borrowed-page-title ref a bug.

Live and verified as `456544a`: all six routes return 200 with their own titles,
`/archive/opengraph-image` returns a real PNG, and `sitemap.xml` lists six URLs.

**2026-09-02 → 09-03 was the album-hero player stretch, and it ended with less
code than it started.** A hand-built "Club Player" — a 2004 media-player view of
the hero — was built, polished twice, and then **deleted**, because Webamp
landed beside it and beat it on looks while the plain album view beat it on
substance. What survived is the one thing it did that nothing else did: today's
record now plays **inline in the default album hero**. The `View` dropdown is
Album / Webamp. Two adversarial review rounds followed and both found real
defects — see Recent work.

**2026-08-20 → 08-22 was one long stretch on Soundtrack Corner and on being
findable at all.** In order: the generated tier repaired and guarded (two faults
were live in it and nothing had ever rendered a corner to see them); the daily
vote given a memory; the vote moved above the pitch cards it used to sit under;
a copy pass that cut the preamble and broke up three phrases appearing in 290 of
290 generated corners; "what the club is hearing", which quotes today's real
ratings and vibe words; sourced album facts from MusicBrainz (345/424) wired
into the corner and the recommendation scorer; and a metadata and share-surface
pass. Four catalog years were corrected along the way and Blade Runner was
curated. Details in Recent work below.

**The single most important thing learned that day is not a feature.** The site
has **one rating, one puzzle play and zero vibes** on record. Every
community-gated feature therefore renders nothing, correctly, including two
built that same day. Before building anything else that needs a room, read open
item 6.

The stretch before (2026-08-09 → 08-20) was Cozy Vibes and housekeeping: the
terrarium embed widened and given a working fullscreen path, two adversarial
reviews, Next.js bumped to 16.3.0, Railway's agent tooling installed, the
terrarium frame raised to 770px, and a fourth game added to the Cozy shelf.
Before that (08-04 → 08-07): the lyric pool refill, the Vintage skin and the
colour-token system underneath it, a landing-page reorder and a real mobile
pass. Details below and in git history.

**No sharing, and this one is a standing rule (2026-08-25).** Nothing on this
site broadcasts what a visitor did on it. Eight share buttons were removed —
Share Rating, Share Vibes, five Wordle-style game result grids and Daily
Wrap-up's "Share My Day" — along with the component behind them. Poll results
and how someone voted are not shareable, by decision, and the owner feels
strongly about it. The non-negotiable is in `CLAUDE.md` and `eval-site` fails
if a share button, a clipboard copy of user activity or the old style
reappears. **An activity that ends without a share button is finished, not
unfinished.** The line is the button, not the metadata: the Open Graph card and
`twitter:` tags stay, because they carry today's album and nothing about any
visitor.

**Five things a new session will get wrong without warning:**

1. **Measure colour, never read it.** Four separate contrast "findings" this
   week were measurement artefacts — gradients, opacity, a frozen animation
   timeline, and translucent backgrounds. Three would have led to darkening
   colours that were already fine. `docs/gotchas.md` → "Verifying colour".
2. **Never hardcode a colour.** Backgrounds and text both resolve through
   `--surface-*` / `--text-*` tokens; `eval-site` fails on a raw light hex.
   `docs/skins.md`.
3. **Verify by outcome.** `eval-site` guardrails have repeatedly caught what
   careful reading missed — a self-recommending album, a stray CJK character in
   a card title, contaminated lyric entries. Run it, and add a guardrail when
   you fix a class of bug rather than just the instance.
4. **Do not write content for records you do not know.** Two 2026 albums are
   deliberately uncovered in Soundtrack Corner for this reason. Wrong data
   costs more than missing data.
5. **The verification tool lies too.** A scripted tab-close skips `pagehide`;
   Chrome refuses fullscreen to a synthesized click; the preview pane's
   screenshot lags a programmatic scroll. Each produced a confident wrong
   answer this stretch, and one nearly became a change request against working
   code. Four more in September: resource timing cannot see RSC fetches (which
   produced a wrong "tab clicks are free" claim, twice), a hidden pane clamps
   timers to one second, a scripted click is not a media gesture on mobile, and
   a hidden pane can return blank screenshots. `docs/gotchas.md` → "Verifying
   with browser automation".

**Where to pick up:** the open items below. Two genuinely open actions both need
a human rather than code. **Nothing has put the link anywhere** — submitting the
sitemap and telling anyone the site exists needs someone with the accounts, and
until that happens the community features have no room to hold. And **album
audio needs a YouTube Data API key** (open item 7): without one the refetch
cannot run, and inline playback stays at roughly a quarter of days. The one open
_coding_ question is item 10, the shared layout — measure before building. And
once Codex's limit resets on **2026-09-29**, run the adversarial review that did
not happen (item 11) before building anything new on top of it.

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
- **Deploy "crashed" notifications: rare, not gone.** `instrumentation.js` exits
  0 on SIGTERM, which is why these stopped being routine after 2026-07. One
  still arrived on 2026-08-13. **What the evidence supports:** the exit code
  alone does not predict these. The `npm error ... signal SIGTERM` line prints
  after `Stopping Container` on _every_ rollout — the fix governs Node's exit
  code, not the `npm`/`sh` wrapper Railway's log shows dying by signal — yet
  four deploys that day produced one email, so that line cannot be the whole
  condition. **What is only a hypothesis:** that overlapping deploys are the
  trigger. The one thing observably different about the flagged deploy was two
  pushes three minutes apart, which killed a container 53 seconds into its life
  while a second deploy overlapped it. That is a single correlated event; the
  variable was never isolated, and Railway's actual notification condition is
  undocumented here. Treat it as the leading guess, not a finding. Three
  practices follow, none of which depend on the hypothesis being right:
  - **Batch commits; don't push twice within a few minutes.** Cheap regardless,
    and it removes the one variable currently suspected.
  - **Leave the notification on.** An occasional false positive is worth hearing
    about a real crash; muting is the only option here that can actually hurt.
  - **Judge health by `GET /api/health` with a climbing `uptimeSeconds`**, never
    by the log's severity tags — Railway marks anything on stderr `error`, the
    same tag it gives `npm warn config production`. Note also that a
    single-replica deploy has a real few-second 502 gap mid-swap.

  **If a crash email ever follows a single isolated deploy, that refutes the
  timing hypothesis — it does not confirm any replacement.** Investigate what
  Railway actually keys on before changing anything; do not treat the wrapper as
  guilty by elimination. One candidate fix is already verified and waiting:
  starting the container without the npm/sh wrapper —
  `node node_modules/next/dist/bin/next start`, which serves correctly and exits
  0 on a real SIGTERM (both checked locally 2026-08-13). Deliberately not
  shipped: it changes the production start path and wants a
  `railway.json` that can affect builder selection, to chase a mechanism the
  evidence does not support.

- **Server Action probe traffic is external and inert.** Bursts of
  `Failed to find Server Action "x"` appear in the deploy logs (four bursts of
  ~12 across 2026-08-10/11). A real action id is a 40-char hash, so `x` is a
  scanner fingerprinting for Next.js. This app defines **no** server actions
  (`"use server"` appears nowhere) and has no middleware, so there is nothing to
  reach and the request dies at the manifest lookup. Not a fault, and a
  framework bump will not stop it. It stops being inert the day a server action
  is added.
- **Railway agent tooling is installed (2026-08-13).** `railway setup agent` put
  the `use-railway` skill and a local stdio MCP server into `~/.claude.json`
  (`railway mcp`), authenticating through the existing CLI login — no separate
  credential. It exposes read tools worth knowing (`get_logs`,
  `list_deployments`, `service_metrics`, `http_requests`) so logs can be queried
  directly instead of exported to CSV. `get_logs` needs an explicit
  `service_id` when you also pass a `deployment_id`, because the project is
  linked but no service is. **Both repos live in one Railway project** —
  `album-club` and `cozyfun` (the game) — so the game's logs are reachable the
  same way. The same server also exposes destructive tools (`remove_volume`
  would target the SQLite volume); do not call that class without asking.
- **Backups — DONE (2026-07-23):** `BACKUP_TOKEN` is set in Railway and as a
  GitHub Actions secret (alongside `BACKUP_URL`). `GET /api/backup` verified
  live (404 without token, 200 SQLite snapshot with it, integrity `ok`);
  `.github/workflows/backup.yml` ran green and stored a 90-day artifact. Daily
  at 06:00 UTC from here on. Litestream is the documented continuous-replication
  upgrade (not wired).

## Recent work (this stretch of sessions)

- **The audit is a script now (2026-09-25, `ca78471`).** The first audit ran from
  the session scratchpad, which was cleared before the day was out — script and
  raw results both gone. Rewritten as `scripts/audit-youtube-ids.mjs`
  (`npm run audit-youtube-ids`, read-only, ~4 minutes), and corrected where the
  first version's calls had been fixed by hand: short track titles match as
  whole words (it had flagged SZA's "SOS", Charli's "360" and Kendrick's "gnx"),
  bracketed and " - Remastered" suffixes are stripped, and a sub-minute video
  naming no track is its own CLIP verdict. **Validated against 22bfdec's
  catalog from git: it flags exactly the 21 removed ids plus the 2 films, and
  none of the four false alarms.** The two films sit in `KEPT_AFTER_REVIEW`, so
  exit 1 keeps meaning something new broke. On the live catalog (114 ids): 37
  full albums, 72 songs, 2 kept, 3 unverified by design, and nothing dead,
  clipped or wrong — exit 0. `--albums <file>` audits a candidate catalog; that
  is how item 7's refetch should land.

- **Adversarial review of 09-25 — did not run (2026-09-25).** Three Codex
  reviewers were given the three 09-25 commits (`d42081c`, `bc81a38`,
  `f199106`) and each read ~37k tokens of the diff before failing with a usage
  limit. `codex exec` still exited 0 and wrote empty output files; the skill's
  non-empty check is what caught it, exactly as intended. Nothing was
  substituted — a same-model review is what the skill exists to avoid. See open
  item 11.

- **API hardening (2026-09-25, `bc81a38`).** Every route attacked directly: 27
  malformed payloads (including a 1MB chunked body with no declared length),
  future date keys, a 32-request flood, a ballot-stuffing run. Validation, body
  caps, bound SQL, safe error bodies and the caches all held. Four fixes:
  **IPv6 is now limited per /64** (`ipv6Prefix64` in `lib/rate-limit.js`) —
  per-address keys let one holder rotate past every limit, shown locally when
  `::2` got 200 right after `::1` got 429; **`/api/backup` is Bearer-only**, the
  unused `?token=` path removed as a leak into logs; the token compare **hashes
  both sides** (`lib/token-match.js`, unit-tested) so a wrong length answers no
  faster; three comments claiming a daily cap of 3 now defer to
  `checkDailyLimit` (it is 12). Accepted by design: one address can still cast
  12 votes a day per endpoint (the NAT allowance), and the Guess "solved" flag
  is client-reported. Tests 34 → 44. The backup auth path was exercised end to
  end with a throwaway token in a temporary `.env.local`; on production only
  the reject paths were probed, so the first real proof is the next scheduled
  backup run.

- **Audio audit (2026-09-24/25, `d42081c`).** All 135 stored `youtubeId`s checked
  by title, watch-page length, MusicBrainz tracklist and a real load in the
  site's embedded player: **39 full albums, 73 single songs, 13 dead (error
  150), 8 not the album's music, 2 music-video films.** The fetcher had kept the
  first search result for "artist title official audio", unchecked, and only
  for `recognizable` albums — the ids were for the games; the hero reused them.
  The dead ones broke two games: run through every day of 2026, the Blind Taste
  Test drew a dead clip on **59 of 365 days** (stuck, voting locked) and Heardle
  on 6 of 73. Both now handle a dead video (`docs/components.md`), and the 21
  bad ids are removed — re-simulated to 0 and 0. Full breakdown in
  `docs/album-data.md`; the refetch is open item 7.

- **Design review (2026-09-24, `22bfdec`).** Bar: motion and colour that say
  something true about the day and the record, not more novelty. **Solo
  reveal** — a room of one now gets the visitor's number and one line, not four
  stats restating it and nine empty histogram bars. **The record on the deck**
  — Play slides the vinyl out and spins it at a real 33⅓ rpm with today's cover
  as its label; Pause spins it down and parks it; Stop puts it away. Testing
  caught three faults (it covered 35px of the title; Stop snapped and replayed
  the load spin; touch screens would have stopped it). **The day's colour** —
  the header tint was measurably the same every day (Nevermind and Blue one RGB
  step apart); mixing into a neutral ink doubled the spread with white text
  still ≥4.67:1 for all 424 albums, now an `eval-site` guardrail. Details in
  `docs/components.md` and `docs/skins.md`.

- **Perf check (2026-09-24, `7ce59e2`).** The Blind Taste Test built both
  YouTube players on mount — two cross-origin embeds on every home load; now
  built on first Play. The nav's `prefetch` fired five requests per page load
  that each returned a ~235-byte stub, and the click still made its own
  request; now `prefetch={false}`, explicitly (omitting it leaves Link
  prefetching). This corrected a claim made twice that tab clicks were free —
  resource timing had hidden the requests. No `loading.js`: while every route
  renders the whole shell, its fallback would flash the banner and nav.

- **Adversarial review (2026-09-09, `c6fd733`).** Three Codex reviewers, verdict
  PASS. Fixed: `/soundtrack` served a crawler only "Opening Soundtrack
  Corner..." (`ssr: false` removed — home page unchanged at 13 requests,
  215KB → 212KB — though the panel still streams in behind a Suspense
  fallback); the routing guardrail now checks each route's identity, proved by
  breaking one on purpose; Vibe Check's restore path made storage-safe; the
  sitemap only dates routes that change daily; `sectionPath` throws on a typo.
  Deferred: the shared-layout question (open item 10).

- **UX review (2026-09-09, `84e60be`).** Five fixes: unsubmitted answers now
  survive a tab switch (`useDraft`, plus inline drafts in Vibe Check); section
  titles are real headings (home 2 → 9, FAQ 1 → 9); the game text input meets
  44px on touch in all five games, not one; the Archive table has `scope`; the
  content is a `<main>` landmark. Contrast came back clean — 12 apparent
  failures, 11 of them measurement artefacts.

- **Five skills repaired (2026-09-09, `6ea0171`).** `add-album` said to keep the
  catalog sorted by artist (it is not sorted, and reordering rewrites the
  rotation); `deploy` still guessed the Railway volume was unmounted;
  `reset-day` cleared 3 of 6 vote tables; `perf-check` forbade code splitting
  "because the app is a single page"; `ux-review` never mentioned the
  no-sharing rule. All five now match the code.

- **Every section became a route (2026-09-08).** Six tabs, six URLs, one
  component. `app/sections.js` is the list the nav, the route folders and the
  sitemap share, so a new tab is one entry plus a two-line `page.js`; the per-tab
  copy lives in `app/section-page.js`. The nav items and both `MiniTeaser` rows
  became `next/link` anchors — the teaser had been a `div` with `role="button"`
  and a hand-rolled Enter/Space handler, all of which the link does natively.

  **Two things were only found by measuring.** Image metadata files are not
  inherited by nested segments: `/archive` served a text-only card while `/` had
  the image, so every tab folder now re-exports the root `opengraph-image` (and
  has to declare `dynamic` itself — Next rejects a re-exported one). And
  `ForumPage` unmounts on every tab change now, which turned `pageTitleRef` into
  a live bug: it held a borrowed title forever after the first vinyl spin, so the
  unmount cleanup painted the previous tab's title over the new route's.
  `restoreTitle()` clears it on every restore; verified by spinning the record
  and navigating away inside the three-second window.

  ~~Tab switching costs no network — the nav links carry `prefetch`, so a click
  issues no request at all.~~ **Wrong, corrected 2026-09-24:** that measurement
  used resource timing, which does not record RSC fetches. The network log
  showed five prefetch requests per page load and a fresh request on the click
  anyway; prefetch is now off (see the perf check above). A cold server render
  of any tab route is ~5ms — that part stands.

  **Behaviour change worth knowing:** unpersisted `ForumPage` state now resets on
  a tab switch — the clicked-through secret tagline, an in-flight vinyl spin.
  Everything that matters is in localStorage and survives, and the two day-guarded
  writes (`updateStreak`, `incrementVisitCount`) are idempotent, so remounting
  cannot inflate a streak or a visit rank. Checked before shipping, not after.

  Verified in production after the deploy: six routes at 200 with their own
  titles, a real PNG at `/archive/opengraph-image`, six URLs in `sitemap.xml`.

- **The album hero learned to play, and a player was deleted to get there
  (2026-09-02 → 09-03).** Built, then removed, in that order.

  **The Club Player** was a third view of the hero styled as a 2004 media
  player: LCD strip, scrolling marquee, transport, spectrum, and an EQ panel
  with a graph window and five presets. Real: play/pause/stop, seek, volume and
  the clock, all on the YouTube IFrame API. Costume, and labelled as such: the
  spectrum and the equaliser, because a cross-origin YouTube iframe is opaque to
  Web Audio and the API has no EQ.

  **Then it was deleted (2026-09-03).** It could not play on the **68% of days**
  whose album has no video id, over half its height shaped nothing, and it
  replaced real cover art with an emoji. Once Webamp existed it sat between two
  neighbours that each did its job better. `AlbumPlayback` now puts play/pause,
  stop, a clock and a seek bar in the default hero where the cover art already
  is; albums without audio get a link. Net **1,075 lines deleted against 39
  added**. **Do not rebuild it** — playback belongs where the album is.

  **Webamp (`captbaritone/webamp`, MIT) is a third view now**, opt-in. It
  **cannot play the album of the day** and nothing will change that: it needs
  audio files it can fetch, and YouTube's is sealed off. It opens empty and takes
  files dragged into it. Three integration facts in `docs/components.md`, two of
  them found by breaking: it attaches to `document.body`; React must never render
  children into its mount node; and `onClose` has to switch the view back.

  **`next/dynamic` was not enough for the bundle.** Turbopack prefetches dynamic
  chunks, so a 295KB Webamp chunk went over the wire on the _default_ view for
  everyone who never opened it — measured in production. It loads from
  `/vendor/webamp.bundle.min.js` via a script tag now, copied by a `predev` /
  `prebuild` step. Measuring that also caught an unrelated regression: the Club
  Player had imported `getAlbumFacts` from `lib/soundtrack-corner.js` and dragged
  the 348KB generator onto the home page. Hence `lib/album-facts.js`. Fresh
  production visit is back to **212KB, biggest chunk 70KB**.

- **Two adversarial review rounds, and the second one earned its keep
  (2026-09-03).** Three Codex reviewers per round.

  Round one found five real defects: a clean clone could not open Webamp at all
  (the vendored bundle was `prebuild`-only while `public/vendor` is gitignored);
  a failed script load became a permanent spinner because the loader attached
  listeners to an already-settled `<script>`; the copy script exited 0 when
  webamp was missing, so a broken install could still deploy; inline playback had
  no failure path whatsoever; and the Webamp copy pointed at the "Player" view
  deleted an hour earlier.

  **Round two reviewed the fixes and found two of mine wrong.** The failure
  fallback called `getListenUrl`, which returns the _stored video URL_ whenever
  an id exists — so after an error it sent the visitor back to the same dead
  video. And a ten-second timeout turned a slow connection into permanent
  failure, could not be taken back by a late `onReady`, and removed the player's
  DOM node without cancelling initialisation. **Both replaced by real signals
  only** — the script erroring, or the player reporting the video unplayable.
  The lesson worth keeping: a timeout that converts "slow" into "broken" looks
  responsible and is not.

  **The skill itself was broken and is fixed.** All three reviewers ran twenty
  minutes and wrote nothing, and `2>/dev/null` in its template hid why.
  `.claude/skills/adversarial-review/SKILL.md` now builds prompts as files fed on
  stdin, keeps stderr in a `.log`, and verifies outputs are non-empty rather than
  merely present. **The root cause was never isolated** — an initial diagnosis
  blaming backtick expansion was tested and disproved — so the note says so
  rather than leaving a confident wrong cause for the next person.

- **Cozy embed widened, and fullscreen moved to the site (2026-08-09 → 08-13).**
  At
  viewports ≥1280px the Cozy panel breaks out of the 960px column so the
  terrarium frame widens to up to 1200×770 (`min(viewport − 94px, 1200px)`,
  so 1186px at the 1280px boundary — still above the game's real 1180px
  collapse threshold) — the game's desktop layout on a single screen
  instead of 2178px of content stacked inside a 700×620 frame (its grid
  collapses below ~1180px of frame width; table in `cozyfun/docs/EMBEDDING.md`).

  **The first version of this leaned on the game's own fullscreen button and was
  wrong.** That button only exists on screen in the game's wide layout: at a
  700×620 frame it sits 535px below the frame's fold, inside the iframe's own
  scroll. So every visitor under 1280px — the reporter included — had no
  reachable fullscreen at all, and the shipped copy pointed at a control they
  could not see. The site now renders its own "Full screen" button that calls
  `requestFullscreen()` on the iframe, visible at every width, with a
  `fullscreenchange` handler that sizes the frame inline (author CSS otherwise
  letterboxes it at 620px). "Play in New Tab" renders where
  `document.fullscreenEnabled` is false (iOS Safari) **and** after a refused
  request — see the next paragraph; both arms are load-bearing.

  **A refused request now uncovers the fallback (2026-08-13).** This was the one
  real finding from an adversarial review, and all three reviewer lenses landed
  on it independently: `requestFullscreen()`'s rejection was swallowed, so on a
  browser that advertises support and then refuses (an in-app webview, a managed
  browser) the only full-size path died silently with the new-tab link still
  hidden. Both arms of the promise are handled now — a refusal reveals the link
  and rewrites the note, a later success takes it back down. The button stays
  mounted across that transition on purpose: unmounting what the player just
  pressed would drop keyboard focus to the body exactly when they are owed an
  explanation.

  **Fullscreen engagement cannot be verified by automation.** Chrome refuses the
  grant for synthesized clicks — the in-app pane and the Chrome extension both
  reject with "not granted", and a control test on a plain page with no iframe
  rejected identically, so it is not the embed. Verify the preconditions
  (`fullscreenEnabled` in-frame, the `featurePolicy` delegation, the inline
  resize on a dispatched `fullscreenchange`) and have a human press the button.
  **Done — pressed by hand on 2026-08-13 and it works.** The feature is closed;
  only re-test by hand if the button or the frame sizing changes.

  **The game moved under us, and the embed still fits (checked 2026-08-13).**
  Re-verified against a cozyfun build ten commits newer: its breakpoints are
  still 1180/860, so the ≥1280px arithmetic holds, and it still gates its own
  fullscreen button on `document.fullscreenEnabled`. Its window-ownership cycle
  was exercised through a **navigation-triggered** departure: a second surface
  claims the terrarium, the first pauses, and it **hands back automatically**
  when the holder fires `pagehide`. That auto-handback already exists; do not
  "add" it (see gotcha 5 above). Not verified: departure by a real human
  closing the tab. The spec fires `pagehide` there too, and the same listener
  serves both, so this is very likely fine — but it is reasoning, not a
  measurement, and it is the exact action that first looked broken.

  **Frame height 730 → 770, and why (2026-08-20).** Re-checked against a cozyfun
  build fourteen commits newer. The breakpoints still hold, but measuring the
  game's materials tray at 1200×730 found only **8px** of slack left — one added
  material row from its last row sliding behind the tray's internal scroll,
  silently, in the same shape as the bug that made the game's own fullscreen
  button unreachable. 770px measures 48px. **The technique matters more than the
  number:** `scrollHeight` returns `max(content, box)`, so it reports a perfect
  fit at any headroom — compare the last `.tool-group`'s bottom against the
  `.tool-panel`'s inner edge instead. Details in `docs/components.md`.

  **Standing decision: the "Full screen" button sits below the fold, and that is
  fine (2026-08-20).** At a maximized 1512×982 window the frame starts 351px
  down, so 631px of 770 is visible and the button needs a ~231px scroll. Raising
  the height cost 40px of that. Considered and **deliberately not changed** —
  moving the button above the frame was offered and declined. Don't "fix" it.

- **Soundtrack Corner, three passes (2026-08-20).** Coverage was already closed,
  so none of this was more overrides.

  **The generated tier was broken and nothing could see it.** Neither
  `eval-site` nor the report had ever called `buildSoundtrackCorner` — every
  check read the curated overrides as data — so two faults sat in the 290
  uncurated corners: 33 bridge notes read "when **the the** pocket" (the
  template supplied the article and one profile's `bridgeFocus` starts with
  one), and **63%** of generated corners printed at least two identical "Listen
  next" reasons, 11% the same sentence three times in one view. The reasons now
  carry three phrasings picked by position and three distinct traits — an index,
  not a better hash, because the trait pools hold three entries and two picks
  routinely share a branch. A new `eval-site` section renders all 424 corners
  and fails on a repeat, a doubled article or a thin corner; both faults were
  reintroduced to prove it bites.

  **The vote now remembers.** Two records already existed unread: 30 days of
  picks in localStorage and a per-date distribution only today's row queried.
  They feed a verdict line ("The room went TV. You went game."), one line of
  personal history — streak or 30-day lean, never both — and a cue log in the
  Archive (`Room` / `You` columns, new `GET /api/soundtrack/history`). The
  verdict holds back below two votes and on a tie, the floor Album vs Album and
  Vibe already set.

  **The corner asks before it argues.** `CueVote` sits under the kicker now;
  the three pitch cards and "two more angles" wait for a vote or the "Or just
  read the pitches" link. At 375px the buttons moved ~490px up, out from under
  two screens of copy. Everything that is not a pitch stays visible — the
  skip link exists because the club's writing is not worth holding hostage for
  a one-tap vote. `eval-site` fails if the order is ever reversed. **Deliberate,
  not a bug: do not "fix" it back.**

- **Soundtrack Corner copy pass (2026-08-21).** Followed the three passes above,
  and all of it was measured rather than read. The page stated its premise four
  times in 123 words before anyone could vote — explainer, intro, kicker,
  prompt — so the explainer lost its 58-word table of contents (written when the
  vote still sat below the cards) and the preamble is 87 words. Generated
  corners ran a median **332 words against curated's 250** and said less; each
  pitch card now takes at most one flourish instead of a guaranteed coda, and
  the median is 295. Three phrases appeared in **290 of 290** generated corners;
  seeded intro and bridge frame pools replaced them, and none of the new intro
  frames asserts that the album suits scene work — the vote above it asks that.
  **The guardrail for this had to be rewritten:** counting whole sentences
  passed a deliberately collapsed pool, because every offending phrase sat
  inside a sentence that was unique per album. It counts six-word runs now,
  capped at the largest decade bucket, and both old templates fail it.

- **Metadata and share surface (2026-08-21).** The site has **one rating, one
  puzzle play and zero vibes** on record (`/api/stats`), with Railway request
  volume to match — so every community gate is permanently closed, including
  two shipped earlier the same day. Meanwhile a shared link rendered as a bare
  URL: no Open Graph tags, no card image, no favicon, no sitemap, and a title
  that never named the day's album on a site whose whole premise is the day.
  Fixed: per-day `generateMetadata`, a 1200×630 card drawn from the album's
  accent colour and cover emoji, `metadataBase`, robots, sitemap, icon. Details
  and the reasoning in `docs/project.md` → Discoverability.

  **The remaining step is not code.** Nothing here submits the sitemap or puts
  the link anywhere; that needs a human with the accounts. Judge this by
  GoatCounter, not by the rating count.

- **The corner stopped writing from two fields (2026-08-21 → 08-22).** Two additions,
  both about where knowledge comes from rather than how it reads.

  **What the club is hearing.** The corner ignored the rating average and vibe
  words the same page collected hours earlier. It quotes them now — the only
  album-specific knowledge in the generated tier that comes from people. Both
  floors subtract the visitor's own rows first, reusing Vibe Check's rule: the
  vibes table stores one row per mood and everyone picks up to three, so the
  total is not a headcount.

  **Sourced album facts — 345/424 (81.4%), committed 2026-08-22.** Of the 80
  still missing, 70 have no MusicBrainz release group at all — re-running the
  fetch cannot fill them.
  `npm run fetch-album-facts` pulls track count, runtime, longest track and
  release type from MusicBrainz into `lib/album-facts.json`. A fact line takes the coda's slot on one pitch card,
  and shape affinity nudges "Listen next". **Partial by design** — a quarter of
  this catalog is DJ sets and curated playlists with no MusicBrainz release
  group, and the matcher refuses to guess rather than force a match. The run is
  resumable; coverage lives in `npm run soundtrack-corner-report`.

  **Which release the numbers come from took three rules to get right**, and the
  wrong ones all produced confident, plausible-looking numbers. Earliest-official
  gave _Lonerism_ 26 tracks and 110 minutes (a year-only box set sorts before any
  dated day in the same year). Median gave _Structures from Silence_ 7 tracks
  instead of 3. Minimum gave _Kind of Blue_ 3 tracks and 26 minutes — on the one
  record this repo can least afford to get wrong. Consensus across editions is in
  use, measured 9/11 against known shapes. Table and reasoning in
  `docs/album-data.md`; **do not "simplify" it back to earliest.**

  **Two faults the run itself caught, both worth knowing.** Passing a candidate
  object where its title string belonged rejected _every_ album — the guards
  failed closed, which is the right direction. And _Purple Rain_ matched
  Prince's **single**: same artist, title, year, score 100, three tracks, 19
  minutes. Hence the primary-type filter and an `eval-site` check that fails any
  Album-typed record of single size. Release country was collected and then
  dropped: it is the earliest _pressing_'s country, so _Nevermind_ came back
  `SA` — a fact that functions as a lie.

- **Next.js 16.2.10 → 16.3.0 (2026-08-13).** Routine hygiene, not a response to
  the probe traffic above. React 19 already satisfied the peer range, so only
  `next` moved. Verified on the new version: unchanged route table, all tabs
  rendering, every API route 200 with `no-store`, and a `POST /api/rate`
  round-tripping through better-sqlite3 and persisting.

- **Skins (2026-08-06).** A "Skin" dropdown switches between the default 2004
  forum and a **Vintage** 1990s desktop. Every colour in the stylesheet now
  resolves through a `--surface-*` / `--text-*` token, so a skin overrides a
  palette rather than chasing selectors, and `eval-site` fails on a raw hex.
  Read `docs/skins.md` before touching it — the traps are specific and
  expensive. The default skin was proved unchanged by comparing computed
  colours for 311 selectors across five tabs, before and after.

- **Soundtrack Corner finished (2026-08-07).** Every recognizable album but two
  is curated, and every genre now routes to a real profile instead of the bland
  default. Angle labels are derived from their key rather than restated in the
  data. Figures come from `npm run soundtrack-corner-report`.

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
  Soundtrack Corner's cue vote, explainer and teaser, plus the first large batch
  of curated overrides; and the catalog reaching full coverage on images, emoji
  and accent colours. Current counts come from `npm run eval-site`.

## Open items / next steps

Completed work is not listed here — it lives in git history and in the topic
docs. This section is only what is still open.

1. **Soundtrack Corner — effectively finished (2026-08-07).** Every recognizable
   album is curated except two. Get exact figures from
   `npm run soundtrack-corner-report`, never from prose; pipeline in
   `docs/soundtrack-corner-research.md`.

   **"Finished" meant coverage, and only coverage.** The 2026-08-20 pass found
   two shipped faults in the generated tier and rebuilt the vote's shape around
   it (see Recent work). If the corner feels weak again, the lever is unlikely
   to be more overrides: measure the rendered output first, the way that pass
   did, and check what the vote's own data could pay back before writing
   anything new.

   **The two left are a judgement call, not a backlog.** _BTS — Arirang_ and
   _Olivia Rodrigo — You Seem Pretty Sad for a Girl So In Love_ are 2026
   releases past the point where this writing can be grounded in the actual
   records, and scene-work for an album the author has not heard is invention.
   Wrong data costs more than missing data, and an uncovered album still gets a
   generated corner — a worse one, but an honest one. **Whoever knows those two
   records should write them; do not fill the gap from a press release.**

   **The generator floor is closed too (2026-08-07).** Seven new profiles —
   neon-nostalgia, lofi-chill, global-roots, heavy-atmos, minimal-process,
   britpop-swagger, mixtape-live — took the DEFAULT_PROFILE count from 21 to 0.
   Most were near-misses rather than missing genres: the patterns use word
   boundaries, so `\bmetal\b` never matched Metalcore and `\bpop\b` never
   matched Britpop. **Append new profiles, never edit an existing regex** —
   they match in array order, so appending can only catch what everything else
   missed, and editing silently re-routes albums that already read well.

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
   shoutbox, real leaderboards. **Every one of these needs a room** — see item 6
   before picking one up.

6. **There is no audience yet, and that governs what is worth building
   (measured 2026-08-22).** `GET /api/stats` reports **one rating, one puzzle play and
   zero vibes**, and Railway's request volume matches. Judge this by
   GoatCounter, which measures pageviews, rather than by the rating counter —
   but the interaction record is what it is.

   **The consequence is concrete, not philosophical.** Every community gate
   holds back below two participants, correctly, so the cue vote's room split,
   the Archive's Room column and "what the club is hearing" all render nothing
   today. Two of those were built on 2026-08-21 and nobody has seen them. The
   Archive's cue columns were subsequently made conditional for exactly this
   reason: a column of "·" thirty rows deep reads as a broken feature rather
   than a quiet one.

   **So the bar for the next community feature is not "is it good" but "who is
   in the room".** Solo-working features still pay off — the corner's streak and
   lean lines, the You column, the whole generated tier. Room-dependent ones are
   speculative until traffic exists.

   **What would actually move it is not code.** The share surface shipped that
   day (per-day metadata, a 1200×630 card, robots, sitemap, favicon), so a
   pasted link finally shows today's record. Nothing has submitted the sitemap
   or put the link in front of anyone; that needs a human with the accounts.

7. **Album audio needs a proper refetch (2026-09-24).** Only 39 of the
   catalog's videos are whole albums; most of the rest are one song, and 21 dead
   or wrong ids were removed after an audit (details in `docs/album-data.md`).
   Today 114 of 424 albums have any audio, and the inline player therefore
   works on roughly a quarter of days. The fix is a rewritten
   `fetch-youtube-ids.mjs` that searches for full albums, checks title and
   duration before storing anything, and covers all 424 — not just the
   `recognizable` ones it was written for. **Blocked on a YouTube Data API key**,
   which needs the owner; the free tier's 100 searches a day make the full
   catalog four to five days of runs. Audit the result with
   `npm run audit-youtube-ids -- --albums <candidate>` before it replaces the
   catalog.

8. **Sharing is closed, permanently (2026-08-25).** Not a backlog item and not
   a trade-off to revisit when traffic arrives: the club is somewhere to have
   an opinion, not somewhere to perform having had one. This removes the
   obvious growth lever that a site with no audience would normally reach for,
   which is the point — see the rule in `CLAUDE.md` before proposing anything
   adjacent to it.

9. **The Club Player is not coming back (2026-09-03).** A 2004 media-player view
   of the album hero was built and deleted in the same stretch. It could not
   play on the 68% of days with no video id, over half its height was scenery,
   and it replaced real cover art with an emoji. Webamp does the retro look
   better and the plain hero does the information job better; there is no gap
   between them for it to fill. Playback lives in the hero now
   (`app/AlbumPlayback.js`). Reasoning in `docs/components.md`.

10. **Shared layout — measure before building (raised 2026-09-09).** Every tab
    route renders the whole `ForumPage`, so a tab change remounts the banner,
    nav and every piece of shell state. The adversarial review's three
    reviewers all flagged it, and it is why a `loading.js` would flash the
    whole page. Moving the shell into a shared App Router layout is the right
    long-term shape and a large refactor of a ~5,200-line client component.
    What is **not** yet known is what a cold tab click costs a real visitor —
    it could not be measured this stretch (the pane was hidden, which clamps
    timers). Measure that on a real device first; build only if it is felt.

11. **Adversarial review pending — run on or after 2026-09-29 (raised
    2026-09-25).** The review of 09-25's commits failed on Codex's usage limit,
    which resets **2026-09-29 08:27**. When it runs, widen the scope to
    **`7ce59e2..HEAD`**: the perf fixes and the three design changes from 09-24
    — the turning record's ramp and put-away code, the daily tint and its
    guardrail — have never had an adversarial review either. The prompts
    rebuild from git in a minute, and the evidence for the 21 removed ids comes
    from running the audit on the old catalog:
    `git show 22bfdec:lib/albums.json > /tmp/before.json` then
    `npm run audit-youtube-ids -- --albums /tmp/before.json`.

## Gotchas worth knowing

Full list lives in `docs/gotchas.md` — read it before touching JSX text, the
game samplers, or the lyric data. The three most expensive ones:

- **Escapes never decode in JSX** — not in bare text, not in attribute values.
  Use real characters. This shipped twice.
- **Never index a per-game pool by `dayOfYear`** — it collapses annual variety
  whenever the pool size shares a factor with the rotation cadence.
  `pickRotatingPoolAlbum` uses the appearance ordinal; `eval-site` guards it.
- **Vote totals count rows, not people** — see open item 2.
- **`next/dynamic` is not a bundle guarantee (2026-09-03).** Turbopack
  prefetches dynamic chunks, so a "lazy" 295KB Webamp chunk shipped on the
  default view to everyone who never opened it. For anything genuinely heavy,
  load it from `/vendor` with a script tag and **measure a fresh production
  visit** — the chunk names are hashed, so grepping the filename for the
  library's name proves nothing.
- **Two commits share a subject line, deliberately (2026-09-08).** `ae1314c`
  and `e25fa7b` both read "Club Player: make the equalizer look like an
  equalizer". Their bodies differ, they describe a component deleted four commits
  later, and fixing it means force-pushing eight rewritten SHAs onto a branch
  that auto-deploys production. Decided: leave it. Do not tidy this.
- **The session scratchpad is not durable (2026-09-25).** It was cleared
  between one morning and the next, taking the only copy of the audit script
  and its results. Anything you would want tomorrow — a script, a data file,
  evidence behind a data change — goes in the repo, not the scratchpad.
- **`codex exec` exits 0 when it fails on a usage limit** and writes an empty
  output file. Check the output is non-empty and read the `.log`; the exit code
  says nothing.
- **A stored `youtubeId` is not a playable album (2026-09-24).** Only 39 of
  135 were whole albums; the rest were single songs, clips, teasers or dead in
  the embed, and nothing checked. Any new player needs an `onError`, and any
  refetch must verify title and duration before storing — see open item 7.
- **Fail on evidence, never on a stopwatch (2026-09-03).** A ten-second timeout
  added to inline playback turned a slow connection into permanent failure, and
  a late success could not undo it. Real signals only: the script erroring, the
  player reporting the media unplayable. A timeout that converts "slow" into
  "broken" looks responsible and is not.
