# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-08-20.

## Handoff — read this first

**Nothing is in flight.** `master` is clean, pushed, and deployed; verify with
`GET /api/health`, which returns the running commit SHA. The last stretch
(2026-08-09 → 08-13) was all Cozy Vibes and housekeeping: the terrarium embed
widened and given a working fullscreen path, an adversarial review whose one
real finding shipped, Next.js bumped to 16.3.0, and Railway's agent tooling
installed. Since then (08-16 → 08-20) **nothing has changed but documentation**:
a second adversarial review that found no code defects and six doc ones, then a
sweep that fixed the stale facts in README and `api.md`. The stretch before the
Cozy work (08-04 → 08-07) covered the lyric pool refill,
every outstanding code review finding, the Vintage skin and the colour-token
system underneath it, a landing-page reorder, a real mobile pass, and Soundtrack
Corner taken to effectively complete. Details below and in git history.

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
   code. `docs/gotchas.md` → "Verifying with browser automation".

**Where to pick up:** the open items below. None is a task — item 2 is a
standing decision and the rest are context. Nothing is urgent.

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

- **Cozy embed widened, and fullscreen moved to the site (2026-08-09 → 08-13).**
  At
  viewports ≥1280px the Cozy panel breaks out of the 960px column so the
  terrarium frame widens to up to 1200×730 (`min(viewport − 94px, 1200px)`,
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
