# Components & Features

ForumPage.js is a single client component (~5200 lines) containing most of the UI. Shared components are defined at the top of the file, game components in the middle, and the main render at the bottom.

## Shared Components

Four small shared components eliminate duplication across the core game/activity flows:

### `ShareResultButton({ getText, label })`

Clipboard copy button with "Copied!" feedback. `getText` returns the share string, `label` is the button text. Used by all 7 activity components + Daily Wrap-up "Share My Day".

### `GuessHistory({ guesses, checkFn })`

Renders guess attempt list with correct/wrong styling. `checkFn` defaults to exact title match, but LyricGame passes a custom `isCorrectGuess` that normalizes whitespace/punctuation.

### `ActivityStatusNote({ children, tone })`

Small inline status callout for authored loading/error/fallback states. Used for game detours and stats empty/error copy so those states feel like part of the site instead of generic placeholders.

### `AlbumAutocomplete({ guesses, currentGuess, onGuessChange, onSubmit, shaking, inputRef })`

Filterable album dropdown with keyboard navigation. Uses `ALBUM_SEARCH` (pre-lowercased index). Excluded set (already-guessed titles) is computed internally from `guesses`. Used by GuessGame, CoverChallenge, HeardleGame, ScrambleGame. LyricGame uses free-text input instead. Dropdown escapes `.panel` container (panel has no `overflow: hidden`).

## Rate & Reveal UX (`RateReveal`)

After submitting a rating, two contextual badges appear:

### Hot Take Badge

`getHotTake()` compares the user's rating to the community average and returns one of four badges:

- **Hot take** (>=4 difference): "Hot take! You said 9, crowd says 4.2" — fiery orange styling
- **Bigger fan** (you rated higher): "Bigger fan — you went 8 vs the crowd's 5.5"
- **Tough critic** (you rated lower): "Tough critic — you went 3 vs the crowd's 7.2"
- **Crowd pleaser** (within 1 point): "Crowd pleaser — you and the hive mind agree" — green styling

Hidden when `results.total <= 1` (no comparison possible with a single rating).

## Vibe Check UX (`VibeCheck`)

### Vibe Agreement %

After submitting vibes, shows a pill for each selected vibe with the community agreement percentage: "You and 73% felt Melancholy." Rendered between the top vibe narrative and the vibe grid. Only shown when `results.total > 0`.

## Playlist Poll (`PlaylistPoll`)

Binary "add or skip" vote with lock-in animation (500ms pulsing button), confetti on vote, and animated split bar showing yes/no percentages. Posts to `/api/playlist`. After voting, shows streak tracking ("5 adds in a row") and monthly add rate ("8/12 added"). State tracked via `aotd_playlist_{date}` in localStorage. Helper functions: `getPlaylistStreak()` scans backward up to 60 days, `getMonthlyAddRate()` counts current month.

## Cozy Vibes (`CozyVibesSection`, `CozyMini`)

Own nav tab, not a home-page panel — the home page already renders ~25 blocks and a game iframe is the heaviest thing that could go on it. These are the anti-activity (no score, no timer), so they don't compete with the daily loop; a `MiniTeaser` row on home links across, same pattern as Soundtrack Corner.

Games live in the `COZY_GAMES` array. **Adding one is a single entry.**

- `featured: true` → full playable frame. Currently just the self-hosted Night Desk Terrarium at `pixelfun.littlealbumclub.net`. The frame is 700×620 in the normal column (520px tall under 640px viewport), but at viewports ≥1280px the `.cozy-panel` breaks out of the 960px column so the frame widens to **up to 1200×770**. The width is a range, not a constant: it works out to `min(viewport − 94px, 1200px)`, so the band 1280–1293px yields 1186–1199px and only ≥1294px reaches the full 1200. Every value in that range clears the game's collapse threshold, which is `max-width: 1180px` — not 1200 — so the desktop layout holds throughout; verified at 1186px wide, where the game renders three columns with no internal scrolling.

**The height is a budget, and it is the thing most likely to regress.** The game's materials tray scrolls internally once its content outgrows the panel, which puts the last row of materials behind a fold nobody thinks to scroll — the same shape as the bug that made the game's own fullscreen button unreachable. Measured against the live game at 1200px wide, 730px left only **8px** of slack in that tray; 770px measures **48px**, roughly one extra material row. **Re-measure if the game gains materials**: load it at the frame size and compare the last `.tool-group`'s bottom against the `.tool-panel`'s inner edge — `scrollHeight` is useless here, it returns `max(content, box)` and reads as a perfect fit at any headroom. Width table in `cozyfun/docs/EMBEDDING.md`.

- otherwise → itch.io compact card via `embedId`, the number in itch's embed URL (Share → Embed on the game's page), **not** the URL slug. The card only loads the game on click and already opens itch in a new tab, so several cost little.

The shelf and its credit line don't render at all when no card games exist.

Things about the featured embed that should not be "tidied":

- `src` points at `/embed.html`, a ~4.8 KB poster. The site root pulls ~9 MB on load.
- `allow="autoplay; fullscreen"` is required for the ambience audio; without it it fails silently. It also permits fullscreen from inside the frame, which is what lets the game render its own button — but **the site's button below is the primary path**, not the game's. Either way, Esc or the back gesture lands the player back on this tab.
- **No `sandbox` attribute.** Without `allow-same-origin` it would cut the game off from browser storage and silently break saved scenes.
- The **site's own "Full screen" button** (`CozyFeaturedGame`) calls `requestFullscreen()` on the iframe element from the parent page. It exists because the game's own fullscreen button is only reachable in its wide desktop layout: measured at a 700×620 frame, that control sits **535px below the frame's fold**, inside the iframe's own scroll. Relying on it — as this panel briefly did — means most visitors have no fullscreen at all. Don't remove it in favour of the game's.
- **`fullscreenchange` sets the frame's size inline** (`100vw`/`100vh`). This is load-bearing, not belt-and-braces: `.cozy-frame iframe` pins an explicit height, and author styles outrank the UA's sizing for a fullscreen element, so without it the game letterboxes at 620px on a black screen. Inline styles also dodge a specificity race with the ≥1280px breakout rule.
- The "Play in New Tab" link renders under **two** conditions: where `document.fullscreenEnabled` is false (in practice: iOS Safari), **and** after a `requestFullscreen()` call is actually refused (`fullscreenRefused`). It is absent otherwise, because a second open surface is a second live simulation diverging from the same autosave (`cozyfun/docs/EMBEDDING.md` → "One window at a time"). **Both conditions are load-bearing — do not simplify this to the capability check alone.** `fullscreenEnabled` reports permission, not the outcome of a request; dropping the refusal arm restores the silent dead-end an adversarial review already caught once.

## Album vs Album (`VersusMatchup`)

Daily head-to-head matchup. Shows two album covers side by side with title/artist/year/genre info and "Pick this one" buttons. After voting, shows community vote split as animated percentage bar (blue-A vs pink-B). Confetti on vote. Uses `renderCard(album, side, btn)` helper for DRY card rendering. Pairing seed, endpoint and state key live in `docs/games.md` — don't restate them here.

## Blind Taste Test (`BlindTasteTest`)

Two 60-second mystery audio clips via YouTube IFrame API. Two `YT.Player` instances (`taste-player-a`, `taste-player-b`) — only one plays at a time. Pick buttons disabled until both clips heard (`listenedA && listenedB`). After voting, reveals both albums with cover art + community preference bar + confetti. YouTube API script shared with HeardleGame — checks `window.YT` before loading, chains `onYouTubeIframeAPIReady`. Pairing seed, endpoint and state key live in `docs/games.md` — don't restate them here.

## Skin Picker (`ThemePicker`)

A `<select>` in the info bar switching the default 2004 forum look and the
**Vintage** 1990s-desktop skin. The component is deliberately thin: it sets
`data-theme` on `<html>` and writes `aotd_theme`, and knows nothing about what
the skin changes. All styling lives in one block at the end of `globals.css`.

A pre-paint script in `app/layout.js` applies the saved skin before React
hydrates, so a returning visitor never sees the wrong look flash. That is why
`<html>` carries `suppressHydrationWarning`.

**Read `docs/skins.md` before touching any colour.** Every background and text
colour resolves through a `--surface-*` / `--text-*` token, and `eval-site`
fails on a raw light hex.

## Retention Features (localStorage-only, no backend)

### Streak Milestones

`STREAK_MILESTONES` array (3/7/14/30/60/100 days). On first hit: double confetti burst + gold message. On revisit: message only (no re-fire). Celebrated milestones tracked in `aotd_milestones_celebrated` localStorage array. Pre-computed `STREAK_MILESTONES_DESC` (reversed) avoids array copy per effect run.

### Visit Rank Progress Bar

`getVisitRank()` returns `{ label, emoji, count, nextRank, progress }`. Progress bar in info-bar uses `transform: scaleX()` (GPU-composited). 7 tiers: Lurker → Newbie → Regular → Familiar → Enthusiast → Veteran → Legend.

### Welcome-Back Banner

Detects returning users (streak reset after gap). Old streak captured BEFORE `updateStreak()` call (critical — streak data gets overwritten). Shows days away + previous best streak. Dismissed via sessionStorage (`aotd_welcome_back_dismissed`).

### NextAlbumCountdown (memo)

Live countdown to midnight UTC. Wrapped in `React.memo()` — owns its own `setInterval(1000)` so parent re-renders don't cascade. Shows `Xh Xm` when >5min, `Xm Xs` in final minutes.

### Personal Stats Summary

`computePersonalStats()` scans all `aotd_*` localStorage keys. Returns `{ ratedCount, avgRating, puzzlesSolved, puzzlesAttempted, favoriteVibe }`. Computed via `useMemo([allDone])` — only recomputes when all activities complete.

### Enhanced Tomorrow Teaser

Shows tomorrow's album emoji + genre + decade (e.g., `🎷 Tomorrow's Album — Jazz · 1960s`). Uses `getAlbumForDate()` with tomorrow's date.

## Activity Completion Detection

**Event-driven, not polling.** Each activity dispatches `window.dispatchEvent(new Event("aotd-activity"))` on completion:

- Rating submit → after `localStorage.setItem("aotd_rated_...")`
- Vibe submit → after `localStorage.setItem("aotd_vibed_...")`
- Game over → after `saveState()` when `isGameOver === true`

`checkDone()` listens for `aotd-activity` events + 10s fallback poll. `setAllDone` is guarded with `prev === done` check to prevent cascading re-renders through `personalStats` and milestone effects.

## State Management Patterns

- **Per-activity localStorage**: `aotd_rated_{date}`, `aotd_vibed_{date}`, `aotd_{gameType}_{date}`, `aotd_versus_{date}`, `aotd_taste_{date}`
- **Streak**: `aotd_streak` → `{ count, lastDate, best }`
- **Visit count**: `aotd_visit_count` (integer string)
- **Milestones**: `aotd_milestones_celebrated` → `[3, 7, 14, ...]`
- **Session state**: `sessionStorage` for welcome-back dismissal (resets per tab)
- **Animation guards**: `justRevealed`/`justSubmitted` booleans prevent re-animating on reload

## Soundtrack Corner (`SoundtrackCornerPanel` → `app/SoundtrackCorner.js`)

Its own nav tab (formerly the Chat Booth — the AI chat was removed in July 2026). Renders today's album as game / film / TV cue music: album-specific scene cards, two rotating extra angles (for example boss-fight energy or best-fit game studio), a short "listen for" list, and a clickable "listen next" recommendation row with one-line reasons plus YouTube links for today's album and each follow-up pick. Loaded with `next/dynamic` (`ssr: false`) so its weight stays off the main page.

**The vote comes before the pitches, and that is deliberate (2026-08-20).** `CueVote` asks "where does this one belong tonight?" directly under the kicker; the three pitch cards and the "two more angles" section wait until you have either voted or taken the "Or just read the pitches" link. Read three pitches first and the vote turns into a review of the pitches — asked cold it is an instinct, which is the thing the corner invites you to argue with, and it is the way Rate & Reveal already works. At 375px this moved the buttons roughly 490px up the page, from below two screens of copy to inside the first. `eval-site` fails if `<CueVote` ever renders below `soundtrack-corner-grid` again.

Only those two blocks wait. The intro, the listen button, the bridge note, "listen for" and "listen next" stay visible, and the skip link is one press — the room's split is a reward for committing, but the club's own writing is not held hostage. Skipping unmounts the button that was pressed, so focus is moved to the revealed lead-in; letting it fall to the body is the fault the Cozy fullscreen button was fixed for.

One tap on Game / Film / TV reveals the community percentages with bars (my pick highlighted). Votes POST to `/api/soundtrack`; `aotd_soundtrack_{date}` in localStorage keeps it one-vote-per-day per browser and re-fetches results on reload.

**What the club is hearing (2026-08-21).** `ClubRead` pulls today's rating average and top vibe words from `/api/rate` and `/api/vibe` — the corner had ignored data the same page collected hours earlier. It is the only album-specific knowledge in the generated tier that comes from people rather than a template, which is exactly why it must not be faked: both floors subtract the visitor's own rows first. The vibes table stores **one row per mood** and everyone picks up to three, so `total` is never a headcount; a malformed localStorage entry subtracts the maximum of three rather than zero, because overshooting hides the block and undershooting reports a lone voter as a room. The closing "mood words are scene directions" line only renders with mood words — an average alone says nothing about scene work, and "the room agrees" is a claim a mean cannot make.

**The vote has a memory (2026-08-20).** Underneath the bars: a verdict line ("The room went TV. You went game. Hold your position."), held back below two votes and on a tie — one row is one row, the same floor Album vs Album and Vibe use. Then exactly one line of personal history — the consecutive-day streak if there is one, otherwise a lean across the last 30 days ("5 of your last 7 cues went to film"), never both, because a streak and a lean are the same fact told twice. The lean needs five stored picks and a clear leader; a "lean" that flips daily reads as the site guessing.

The Archive's **cue log** reads the same two records back: a `Room` column fed by `GET /api/soundtrack/history` (a 30-day window of `soundtrack_votes`, matching the 30 days the table already lists) and a `You` column from localStorage, hidden at mobile like genre and year. It shows words, not the vote's emoji — "🎮🎬" in an 11px table is a cipher with its meaning hiding in a title attribute. Its padding rule has to be written `.archive-table th.archive-cue-head`: a bare class loses to `.archive-table th` at (0,1,1), and without it the table overflows 375px by a pixel.

The corner is cross-linked with the daily loop in both directions: `SoundtrackMini` on the home page (a `MiniTeaser` row) teases the vote and flips to "You cast it for X — see the room →" after voting, and the corner ends with a "play today's game" CTA (`onPlayToday`) that names the actual rotation game and jumps back to the home section.

Heardle and Lyric Challenge no longer fail over silently. If a game slot has to roll over, the user now sees a clear note explaining why Cover Art Challenge appeared. Lyric Challenge also picks from the lyric-backed subset first, so the fallback should be noticeably rarer instead of feeling random.

Most albums still use the deterministic generator in `lib/soundtrack-corner.js`, but a shortlist of marquee records and cult favorites now has hand-authored overrides in `lib/soundtrack-corner-data.js` so the biggest canonical albums feel curated instead of procedural.

**The generated tier's problem was length and repetition, not vocabulary (2026-08-21).** It ran a median 332 words against curated's 250 and said less, because every pitch was location + action + coda with a decade note on top — four clauses where a curated card uses two. Each card now takes **at most one** flourish, and the coda and scene-note carriers are different cards, so one pitch of the three lands bare (median 295 words now). Separately, three phrases appeared in 290 of 290 generated corners — "feels built for scene work", "lands best on screen when", "stay louder than generic background mood". `INTRO_FRAMES` and `BRIDGE_FRAMES` are seeded pools now; **add to them rather than editing one**, the same rule the genre profiles follow. Nothing in `INTRO_FRAMES` may assert that the album suits scene work: the vote sits above the pitches and asks exactly that. `COLON_INTRO_FRAME` is skipped for the 23 catalog titles that already contain a colon.

**The generator has facts now, not just inferences (2026-08-21).** Everything else it writes is derived from two fields, genre and year. `lib/album-facts.json` adds sourced ones — track count, runtime, longest track, and the MusicBrainz release type — and the corner uses them two ways. A **fact line** takes the coda's slot on its carrier card, so a live album is described as a live album ("the room and the crowd come with it") and a 4-track, 42-minute record is not discussed like a 22-track mixtape; release type outranks shape, because it changes what the record _is_ rather than how much of it you would use. And **shape affinity** joins the "Listen next" scorer at 3 against genre's 7 — a nudge between comparable candidates, never an override, and silent whenever either side lacks facts.

`buildFactLine` is exported and unit-tested against shapes the catalog does not necessarily hold yet: the facts file is fetched, partial and growing, so testing against whatever it currently contains would test the fetch instead of the logic. Facts are absent for roughly a quarter of the catalog by design — see `docs/album-data.md`.

Two `eval-site` guardrails hold this. One renders all 424 corners and fails on a repeated recommendation reason, a doubled article, or a structurally thin corner. The other counts six-word runs across every generated intro and bridge and fails if one exceeds the largest decade bucket — **counted as word runs, not sentences, because all three of the original offenders sat inside a sentence that was unique per album.** A sentence-level version of this check passed a deliberately collapsed pool and had to be rewritten. Pitch-card skeletons are deliberately outside its scope; that repetition is grammar, not a claim.

The authoring pipeline for overrides and generator profiles lives in `docs/soundtrack-corner-research.md` (source policy, schedule-aware batch flow, floor-raising via genre profiles).

Use `npm run soundtrack-corner-report` to see how many albums currently have curated overrides, how much of the recognizable/priority pool is covered, and which priority albums are still good next candidates.

Use `npm run eval-site` for the broader quality pass: album-pool variety summary, game-source coverage, soundtrack coverage, and a handful of UI/API guardrails.
