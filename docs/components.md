# Components & Features

ForumPage.js is a single client component (~4900 lines) containing most of the UI. Shared components are defined at the top of the file, game components in the middle, and the main render at the bottom.

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

## Genre Bingo

### `BingoMini({ onNavigate })`

Home page widget showing match count and near-bingo status. Clickable — navigates to Bingo tab via `onNavigate("bingo")`. Has `role="button"` and `tabIndex={0}` for keyboard accessibility.

### `BingoSection()`

Full 5x5 bingo grid for the current month. Each cell is a genre category. Matched cells highlighted green, today's genre has enhanced glow, near-bingo cells have dashed gold border. Shows "Almost there!" message when 4/5 in a line. Confetti on first bingo per month (tracked in `aotd_bingo_celebrated_{month}`). Share button copies emoji grid to clipboard.

### `useBingoData()`

Shared hook between BingoMini and BingoSection. Returns `{ card, matched, hasBingo, nearLines }`. Uses `getBingoCard()`, `getMonthMatches()`, `checkBingo()`, `getNearBingoLines()` from `lib/albums.js`.

## Album vs Album (`VersusMatchup`)

Daily head-to-head matchup. Shows two album covers side by side with title/artist/year/genre info and "Pick this one" buttons. After voting, shows community vote split as animated percentage bar (blue-A vs pink-B). Confetti on vote. Uses `renderCard(album, side, btn)` helper for DRY card rendering. Posts to `/api/matchup` with `type: "versus"`. State: `aotd_versus_{date}`.

## Blind Taste Test (`BlindTasteTest`)

Two 60-second mystery audio clips via YouTube IFrame API. Two `YT.Player` instances (`taste-player-a`, `taste-player-b`) — only one plays at a time. Pick buttons disabled until both clips heard (`listenedA && listenedB`). After voting, reveals both albums with cover art + community preference bar + confetti. YouTube API script shared with HeardleGame — checks `window.YT` before loading, chains `onYouTubeIframeAPIReady`. Posts to `/api/matchup` with `type: "taste"`. State: `aotd_taste_{date}`.

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

## Chat Agent (`CultureChatAgent`)

Separate Chat Booth nav tab for the Crate Digger chat. The client persists the current tab's transcript in `sessionStorage`, stores the user's chat handle/avatar choice in `localStorage`, sends the latest 8 `{ role, content }` messages to `/api/chat`, and caps user input at 500 characters. Prompt chips call the same submit path as the form.

The chat renders as a little forum thread: Crate Digger and the user each have a pixel avatar/profile row, messages render in paragraph blocks instead of one long slab, and the loading state uses the same post layout. A small thread card at the top anchors the current album plus provider/tool readiness, prompt chips now read more like real conversation starters, and the composer makes the Enter vs Shift+Enter behavior explicit. Crate Digger is now intentionally music-only: albums, artists, production, lyrics, scenes, credits, and recommendations. Chat posts render simple inline markdown for `**bold**`.

User handles are moderated client-side before posting. The handle field blocks reserved/staff-like names, hateful/abusive handles, and unsupported characters; posting is disabled until the handle passes moderation. The moderation helper normalizes separators, common leetspeak, and diacritics before checking for slurs/hate symbols, so obvious evasions like spaced-out or `n1gg3r`-style handles are rejected too.

The chat composer also preflights the latest prompt through the same moderation layer. Clear hateful requests now get an immediate in-thread Crate Digger boundary reply with a safety-note citation instead of disappearing into a vague error or quietly hitting the model. Clearly off-topic prompts about general film / TV / games / celebrity chatter get an in-thread redirect back to music instead of going out of lane.

On mount, the client requests `GET /api/chat` to learn whether the deployment actually has a working chat provider. If the route reports `available: false`, the tab shows a warm status note, disables prompt chips/composer submit, and avoids the fake-broken "looks alive until you click" behavior.

Assistant messages can include `citations`, `usedTools`, and `provider`. Citations render as visible source links below a message; tool pills show `Local model` or `Hosted model`, plus `Checked the crates` and `Searched the web` when relevant. The loading state mirrors the server-advertised provider/tool availability instead of assuming local Ollama.

When chat is unavailable, the tab now swaps to **Soundtrack Corner** instead of leaving a disabled quasi-chat UI in place. The fallback gives album-specific game / film / TV scene cards, two rotating extra angles (for example boss-fight energy or best-fit game studio), a short "listen for" list, and a clickable "listen next" recommendation row with one-line reasons plus YouTube links for today's album and each follow-up pick.

Heardle and Lyric Challenge no longer fail over silently. If a game slot has to roll over, the user now sees a clear note explaining why Cover Art Challenge appeared. Lyric Challenge also picks from the lyric-backed subset first, so the fallback should be noticeably rarer instead of feeling random.

Most albums still use the deterministic generator in `lib/soundtrack-corner.js`, but a shortlist of marquee records and cult favorites now has hand-authored overrides in `lib/soundtrack-corner-data.js` so the biggest canonical albums feel curated instead of procedural.

Authoring notes for those overrides live in `docs/soundtrack-corner-research.md`, which collects paraphrased review/interview patterns plus Reddit fan associations for future tuning without copying source prose into runtime content.

Use `npm run soundtrack-corner-report` to see how many albums currently have curated overrides, how much of the recognizable/priority pool is covered, and which priority albums are still good next candidates.

Use `npm run eval-site` for the broader Batch 6 pass: chat scope checks, album-pool variety summary, game-source coverage, soundtrack coverage, and a handful of UI/API guardrails.

The route owns today's album context, provider selection, curated knowledge access, and any hosted credentials server-side; the client should not send API keys or trusted album metadata.
