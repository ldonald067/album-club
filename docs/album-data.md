# Album Data

## Source of Truth

`lib/albums.json` — 403 album entries. Each has:

| Field          | Type    | Notes                                             |
| -------------- | ------- | ------------------------------------------------- |
| `title`        | string  | Album name (no artist prefix)                     |
| `artist`       | string  | Primary artist or band                            |
| `year`         | number  | Release year                                      |
| `genre`        | string  | Primary genre                                     |
| `cover`        | string  | Single emoji, unique across all albums            |
| `color`        | string  | Hex color, unique across all albums, R+G+B < 600  |
| `recognizable` | boolean | True if a general listener could guess from clues |
| `image`        | string  | Cover art URL (all 403 populated)                 |
| `youtubeId`    | string? | Optional YouTube video ID for Heardle game        |

## Quality Rules

- **Title must be a real album** — no singles, tracks, or fabricated names. Verify on RYM/Discogs
- **Title should not contain the artist name** — "Clandestino" not "Manu Chao: Clandestino"
- **Title should not contain "Soundtrack"** — shorten to just the show/film name
- **Year = release year**, not recording year (e.g., Sam Cooke live album: 1985 not 1963)
- **Color hex must be dark/muted** — R+G+B sum < 600 so white text is readable
- **Color must be unique** — no two albums share the same hex
- **Emoji must be unique** — single codepoint only (no flags 🇫🇷, ZWJ ❤️‍🔥, or keycaps 3️⃣)
- **`recognizable: true`** only for albums a general listener could guess from clues. Niche/experimental = false
- **`image` must not be null** — fetch via MusicBrainz/iTunes before committing. All 403 currently populated
- **No duplicates** — check artist+title before adding. Run `/add-album` skill for validation
- After renaming an album, set `image` to `null` and re-run fetch-covers to get correct artwork

## Lyrics Data

`lib/lyrics.json` stores 5-8 lyric lines per album, keyed by `"artist - title"`. ~88 entries. Populated via `npm run fetch-lyrics` (Genius API). Lines filtered for quality (>15 chars, <120 chars, no metadata, no section headers).

## Daily Rotation

Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally. Rotates through all 403 albums before repeating.

## External APIs

All optional — site runs without them, games fall back to Cover Art Challenge.

- **MusicBrainz + Cover Art Archive**: Free (no key), primary source for album cover art
- **iTunes Search API**: Free (no key), fallback for cover art
- **Last.fm**: `LASTFM_API_KEY=xxx npm run fetch-covers` — legacy cover art fetcher
- **Genius**: `GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics` — lyric lines for recognizable albums
- **YouTube Data API v3**: `YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids` — video IDs for Heardle game (free tier: 100 searches/day)
