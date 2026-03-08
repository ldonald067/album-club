# Games

5-game daily rotation via `getGameType()` in `albums.js`: `dayOfYear % 5` → `["guess", "cover", "lyric", "heardle", "scramble"]`. Each game draws from recognizable albums (126 of 403) with different seeds to avoid collisions with the featured album.

## Guess the Album (6 attempts)

Clue-based — reveals progressively: genre, decade, word count, artist initial, year, artist name. Autocomplete from full 403-album list.

## Cover Art Challenge (5 attempts)

Blurred cover art, blur decreases per wrong guess (`[5, 3, 2, 1, 0]`px). Autocomplete.

## Lyric Fill-in-the-Blank (4 attempts)

Random lyric line from `lyrics.json` (~88 entries) with 1-2 words blanked. Hints after wrong guesses: word length, first letter, album title. Free-text input (not autocomplete).

## Heardle / Audio Intro (6 attempts)

YouTube audio clips via IFrame API, progressively longer (`[1, 2, 4, 8, 16, 30]`s). Player + timer cleaned up on unmount. Global `window.onYouTubeIframeAPIReady` set/cleared per mount cycle. Autocomplete. Requires `youtubeId` on album (126 albums have it).

## Artist Scramble (variable attempts)

Scrambled artist name displayed. Guess the album title. Progressive hints: Genre, Decade, Title starts with, Year. Autocomplete.

## Fallbacks

- LyricGame → CoverChallenge (if album has no lyrics in `lyrics.json`)
- HeardleGame → CoverChallenge (if album has no `youtubeId`)
- When falling back, stats save under `cover` type and localStorage uses `aotd_cover_` key
- `checkDone()` in ForumPage handles this by checking all game type keys

## Autocomplete Performance

All game components share the same optimized autocomplete pattern:

1. **`ALBUM_SEARCH`** — pre-lowercased index at module scope (title + artist)
2. **`excluded` useMemo** — Set of already-guessed titles, depends on `[guesses]` (rebuilds max 4-6×)
3. **`filtered` useMemo** — filters ALBUM_SEARCH against query + excluded, depends on `[currentGuess, excluded]`
4. Results capped at 5 suggestions via `.slice(0, 5)`

## Share Buttons

All games + RateReveal + VibeCheck have copy-to-clipboard share with `shareBtnRef` pattern for "Copied!" feedback. Combined "Share My Day" button in Daily Wrap-up compiles all activities into a single clipboard block.

## State Persistence

Each game saves to localStorage (`aotd_{type}_{todayKey}`) on every guess. On reload, state is restored without re-animating (animation guards via `justRevealed`/`justSubmitted` booleans). Game results POST to `/api/guess` with `?type=` param for per-game stats tracking.
