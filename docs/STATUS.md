# Project Status & Handoff

Living snapshot of where the site is and what's next. Start here in a new
session. Last updated: 2026-08-04.

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

1. ~~**Set `BACKUP_TOKEN`**~~ — DONE 2026-07-23 (see "Operational facts").
2. ~~**Refill the lyric pool**~~ — DONE 2026-07-31, 80 → 122, then 120 after two
   contaminated entries were pulled, now **124 of 133 (93.2%)** — see item 3.
   The gap is 4 instrumentals that can never have lyrics plus 5 Genius won't
   resolve (Homework, both Jay-Z, Souvlaki, Bitches Brew). That is 96.1% of the
   achievable ceiling; the rest would need hand-curation. **Always read
   `git diff lib/lyrics.json` before committing a refill** — the guards catch
   the known failure shapes, not novelty.

3. ~~**Two lyric entries need re-fetching**~~ — DONE 2026-08-04. _Frank Ocean —
   Blonde_ and _Arcade Fire — Funeral_ (removed 2026-08-01 for carrying another
   album's song) are back, and the same run also resolved two albums the
   previous list had written off: _Abbey Road_ and _VU & Nico_. All four were
   verified by outcome, not by eye — each stored line was traced to a Genius
   track page that MusicBrainz places on that album. No existing entry changed.

   Two things that run surfaced, neither fixed:
   - `fetchTracklist` in `scripts/fetch-lyrics.mjs` catches every error and
     returns `[]`, which is indistinguishable from "album not found". Funeral
     failed on the first pass for exactly this reason — a transient MusicBrainz
     hiccup dropped it to the weak album-search fallback — and succeeded on an
     immediate re-run with nothing changed. **A failure in that log is not
     evidence an album is unresolvable; re-run before concluding anything.**
   - The _VU & Nico_ entry is 4 lines from "Femme Fatale", each carrying the
     same parenthetical refrain. It passes every guard (the repeat check is
     exact-match only) but makes a thin puzzle, since the blankable words are
     nearly the same line to line. Worth hand-swapping to another track.

4. **Soundtrack Corner to 100%:** ~50 recognizable albums left, ~4 batches.
   Run `npm run soundtrack-corner-report`, write the top of the "Coming up in
   rotation" list (air-date-sorted) in the house voice, validate via
   `npm run eval-site`. Pipeline documented in `docs/soundtrack-corner-research.md`.
5. **Deferred by decision — community gates count rows, not people.**
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
6. ~~**Un-fixed review findings**~~ — ALL FIXED 2026-08-04. What changed, and
   what to know about each:
   - **Chunked-body bypass (MED).** `readJsonBody` now reads the stream by hand
     and aborts at the first chunk over the cap, instead of letting
     `request.text()` buffer an undeclared body in full. The parsing half moved
     to `lib/request-body.js` — free of `next/server` so node:test can reach it;
     `lib/api-helpers.js` re-exports it, so route imports are unchanged.
     `test/api-helpers.test.mjs` covers it, and the chunked case was confirmed
     to fail against the old implementation.
   - **Audio timers.** Heardle stops the clip on every guess via one `stopClip`
     helper (the non-final wrong-guess branch was the one missing it), and
     Blind Taste Test clears the other side's timer when you switch players, so
     a clip you abandoned no longer gets marked heard a minute later.
   - **Rate limiter.** Evicts the coldest 10% instead of going unlimited when
     full, and the table cap is now 10000. Its per-request `size > 1000` sweep
     was an O(n) walk on every call — now time-throttled to once per 5s, which
     took the fill test from 2682ms to 20ms. Daily cap 3 → 12, since it is
     per address and NAT puts many people on one.
   - **Vote retention.** `VOTE_RETENTION_DAYS` (default 365) prunes
     playlist/matchup/soundtrack votes at startup. Those three are only ever
     read `WHERE key = ?` on a day-scoped key and feed nothing on the stats
     board. **`ratings`, `vibes` and `guess_stats` are deliberately excluded** —
     they back lifetime totals, and pruning them would walk the stats board
     backwards. Set to 0 to keep everything.
   - **Stats scan.** Only the vibes GROUP BY was genuinely bad — it built a temp
     B-tree because the existing index leads with `album_key`. `idx_vibes_vibe`
     fixes it; the other three stats queries already used covering indexes.
   - **Boiler Room.** Tokyo now has its own cover (a real set from the official
     Boiler Room channel, `T1tcUfUhR5U`) plus that `youtubeId`, matching how the
     Montreal entry is sourced. Year corrected 2023 → 2025 to match the source.
     New `eval-site` guardrail fails on any shared or missing cover URL.
   - **`scrambleArtist`.** Swaps with the first character that actually differs.
     Confirmed genuinely latent first: across 302 catalog artists × 400 seeds the
     old code never once leaked the answer, though crafted names like "aab" hit
     it on 642 of 2000 seeds. Covered by tests now.
   - **A11y.** 13 colour changes, all measured rather than eyeballed — footer
     body was 2.87:1 and `.forum-sig` an effective 1.98:1 once its 0.5 opacity
     was accounted for. Everything checked now clears AA 4.5. **`.clue.hidden`
     was left alone on purpose** — that text is meant to be unreadable until the
     clue is revealed. The banner tagline and est line already passed. Space now
     activates the tagline (it was Enter-only) and both it and the recap header
     call `preventDefault` so Space no longer scrolls the page as it fires.
   - Also cleared: `MODULE_TYPELESS_PACKAGE_JSON` on every script run, via
     `"type": "module"`. Verified nothing in the repo uses CommonJS first.

7. **Found by looking at the running site (2026-08-04), all fixed.** These were
   invisible to every check that reads code or data rather than pixels:
   - **8 cover URLs were `http://`** (coverartarchive.org). Production is https,
     so those are mixed content — and local dev can never show it, because
     localhost is http itself. All upgraded; the cover guardrail now fails on
     any `http://` URL.
   - **The soundtrack generator repeated itself.** `decadeFlavor.sceneNote` was
     appended to all three pitch cards, so every album without a curated
     override closed game, film and TV with the same sentence. Now one card
     carries it. **The first fix was wrong in an instructive way:** it keyed the
     choice off the card's seed, but `getAlbumSeed(album, kind)` salts per
     medium, so all three still elected themselves independently and ~26% of
     albums kept a duplicate. It has to key off the album. Verified across all
     338 generated albums: exactly one copy each.
   - **12 lyric lines gave their own answer away** — every blankable word the
     same, so whatever got hidden was still printed beside it ("Okay (Okay,
     okay, okay)"). Removed, with a new guardrail. Note the wider class was
     left alone deliberately: 134 lines contain _a_ repeated blankable word, but
     those only leak on some seeds and purging them would cost 15% of the pool.
   - `lib/soundtrack-corner.js` imported `"./albums"` without an extension —
     fine for Next's bundler, unresolvable for Node, which is why that module
     could not be exercised from a script. Extensions added.
8. **Suggested features (from the review, not built):** "Predict the Crowd"
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
- **Vote totals count rows, not people** — see open item 5.
