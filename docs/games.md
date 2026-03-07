# Games

5-game daily rotation via `getGameType()` in `albums.js`: `dayOfYear % 5` → `["guess", "cover", "lyric", "heardle", "scramble"]`. Each game draws from recognizable albums with different seeds to avoid collisions with the featured album.

## Guess the Album (6 attempts)

Clue-based — genre, decade, word count, artist initial, year, artist name. Autocomplete from full album list.

## Cover Art Challenge (5 attempts)

Blurred cover art, blur decreases per wrong guess (`[5, 3, 2, 1, 0]`px). Autocomplete.

## Lyric Fill-in-the-Blank (4 attempts)

Random lyric line from `lyrics.json` with 1-2 words blanked. Hints after wrong guesses: word length, first letter, album title. Autocomplete.

## Heardle / Audio Intro (6 attempts)

YouTube audio clips via IFrame API, progressively longer (`[1, 2, 4, 8, 16, 30]`s). Player + timer cleaned up on unmount. Global `window.onYouTubeIframeAPIReady` set/cleared per mount cycle. Autocomplete.

## Artist Scramble (5 attempts)

Scrambled artist name displayed. Guess the album title. Progressive hints: Genre, Decade, Title starts with, Year. Autocomplete.

## Fallbacks

- LyricGame → CoverChallenge (if album has no lyrics in `lyrics.json`)
- HeardleGame → CoverChallenge (if album has no `youtubeId`)
- When falling back, stats save under `cover` type and localStorage uses `aotd_cover_` key. `checkDone()` handles this by checking all game type keys

## Share Buttons

All games + RateReveal + VibeCheck have copy-to-clipboard share with `shareBtnRef` pattern for "Copied!" feedback. Combined "Share My Day" button in Daily Wrap-up compiles all activities.
