# Album Data

## Source of Truth

`lib/albums.json` — 383 album entries. Each has: `title`, `artist`, `year`, `genre`, `cover` (emoji), `color` (hex), `recognizable` (boolean), `image` (cover art URL or null), optionally `youtubeId`.

## Quality Rules

- **Title must be a real album** — no singles, tracks, or fabricated names. Verify on RYM/Discogs
- **Title should not contain the artist name** — "Clandestino" not "Manu Chao: Clandestino"
- **Year = release year**, not recording year (e.g., Sam Cooke live album: 1985 not 1963)
- **Color hex must be dark/muted** — R+G+B sum < 600 so white text is readable
- **`recognizable: true`** only for albums a general listener could guess from clues. Niche/experimental = false
- **No duplicates** — check artist+title before adding. Run `/add-album` skill for validation
- After renaming an album, set `image` to `null` and re-run fetch-covers to get correct artwork

## Lyrics Data

`lib/lyrics.json` stores 5-8 lyric lines per album, keyed by `"artist - title"`. ~88 entries. Populated via `npm run fetch-lyrics` (Genius API). Lines filtered for quality (>15 chars, <120 chars, no metadata, no section headers).

## Daily Rotation

Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally. Rotates through all 383 albums.

## External APIs

All optional — site runs without them, games fall back to Cover Art Challenge.

- **Last.fm**: `LASTFM_API_KEY=xxx npm run fetch-covers` — album cover art
- **Genius**: `GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics` — lyric lines for recognizable albums
- **YouTube Data API v3**: `YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids` — video IDs for Heardle game (free tier: 100 searches/day)
