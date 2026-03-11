# Components & Features

ForumPage.js is a single client component (~3100 lines) containing all UI. Shared components are defined at the top of the file, game components in the middle, and the main render at the bottom.

## Shared Components

Three extracted components eliminate duplication across all 5 games + RateReveal + VibeCheck:

### `ShareResultButton({ getText, label })`

Clipboard copy button with "Copied!" feedback. `getText` returns the share string, `label` is the button text. Used by all 7 activity components + Daily Wrap-up "Share My Day".

### `GuessHistory({ guesses, checkFn })`

Renders guess attempt list with correct/wrong styling. `checkFn` defaults to exact title match, but LyricGame passes a custom `isCorrectGuess` that normalizes whitespace/punctuation.

### `AlbumAutocomplete({ guesses, currentGuess, onGuessChange, onSubmit, shaking, inputRef })`

Filterable album dropdown with keyboard navigation. Uses `ALBUM_SEARCH` (pre-lowercased index). Excluded set (already-guessed titles) is computed internally from `guesses`. Used by GuessGame, CoverChallenge, HeardleGame, ScrambleGame. LyricGame uses free-text input instead. Dropdown escapes `.panel` container (panel has no `overflow: hidden`).

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

- **Per-activity localStorage**: `aotd_rated_{date}`, `aotd_vibed_{date}`, `aotd_{gameType}_{date}`
- **Streak**: `aotd_streak` → `{ count, lastDate, best }`
- **Visit count**: `aotd_visit_count` (integer string)
- **Milestones**: `aotd_milestones_celebrated` → `[3, 7, 14, ...]`
- **Session state**: `sessionStorage` for welcome-back dismissal (resets per tab)
- **Animation guards**: `justRevealed`/`justSubmitted` booleans prevent re-animating on reload
