# Games

5-game daily rotation via `getGameType()` in `albums.js`: `dayOfYear % 5` → `["guess", "cover", "lyric", "heardle", "scramble"]`. Each game draws from recognizable albums (126 of 403) with different seeds to avoid collisions with the featured album.

## Guess the Album (6 attempts)

Clue-based — starts with 2 clues (genre + decade), reveals progressively on wrong guesses: word count, artist initial, year, artist name. First-time instruction text shown before first guess. Uses `AlbumAutocomplete`.

## Cover Art Challenge (5 attempts)

Blurred cover art, blur decreases per wrong guess (`[5, 3, 2, 1, 0]`px). Uses `AlbumAutocomplete`.

## Lyric Fill-in-the-Blank (4 attempts)

Random lyric line from `lyrics.json` (~88 entries) with 1-2 words blanked. Hints after wrong guesses: word length, first letter, album title. Free-text input (not AlbumAutocomplete). Uses `GuessHistory` with custom `checkFn` that normalizes whitespace/punctuation.

## Heardle / Audio Intro (6 attempts)

YouTube audio clips via IFrame API, progressively longer (`[1, 2, 4, 8, 16, 30]`s). Player + timer cleaned up on unmount. Global `window.onYouTubeIframeAPIReady` set/cleared per mount cycle. Uses `AlbumAutocomplete`. Requires `youtubeId` on album (126 albums have it).

## Artist Scramble (variable attempts)

Scrambled artist name displayed. Guess the album title. Progressive hints: Genre, Decade, Title starts with, Year. Uses `AlbumAutocomplete`.

## Shared Components

All games use extracted components (see `docs/components.md` for full API):

- **`ShareResultButton`** — clipboard share with "Copied!" feedback (all 5 games)
- **`GuessHistory`** — attempt list with correct/wrong styling (all 5 games)
- **`AlbumAutocomplete`** — filterable dropdown (4 games, not LyricGame)

## Activity Completion Events

Each game's `saveState()` dispatches `window.dispatchEvent(new Event("aotd-activity"))` when `isGameOver === true`. This triggers `checkDone()` in ForumPage to detect daily wrap-up eligibility. See `docs/components.md` for the full event flow.

## Fallbacks

- LyricGame → CoverChallenge (if album has no lyrics in `lyrics.json`)
- HeardleGame → CoverChallenge (if album has no `youtubeId`)
- When falling back, stats save under `cover` type and localStorage uses `aotd_cover_` key
- `checkDone()` handles this by checking all game type keys

## State Persistence

Each game saves to localStorage (`aotd_{type}_{todayKey}`) on every guess via `saveState()`. On reload, state is restored without re-animating (animation guards via `justRevealed` booleans). Game results POST to `/api/guess` with `?type=` param for per-game stats tracking.
