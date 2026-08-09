# Album Data

## Source of Truth

`lib/albums.json` — the catalogue, one entry per album:

| Field          | Type    | Notes                                              |
| -------------- | ------- | -------------------------------------------------- |
| `title`        | string  | Album name (no artist prefix)                      |
| `artist`       | string  | Primary artist or band                             |
| `year`         | number  | Release year                                       |
| `genre`        | string  | Primary genre                                      |
| `cover`        | string  | Single emoji, unique across all albums             |
| `color`        | string  | Hex color, unique across all albums, R+G+B < 600   |
| `recognizable` | boolean | True if a general listener could guess from clues  |
| `image`        | string  | Cover art URL, https only — all populated          |
| `youtubeId`    | string? | YouTube video ID for Heardle/Taste Test (see note) |

## Quality Rules

- **Title must be a real album** — no singles, tracks, or fabricated names. Verify on RYM/Discogs
- **Title should not contain the artist name** — "Clandestino" not "Manu Chao: Clandestino"
- **Title should not contain "Soundtrack"** — shorten to just the show/film name
- **Year = release year**, not recording year (e.g., Sam Cooke live album: 1985 not 1963)
- **Color hex must be dark/muted** — R+G+B sum < 600 so white text is readable
- **Color must be unique** — no two albums share the same hex
- **Emoji must be unique** — single codepoint only (no flags 🇫🇷, ZWJ ❤️‍🔥, or keycaps 3️⃣)
- **`recognizable: true`** only for albums a general listener could guess from clues. Niche/experimental = false
- **`youtubeId` coverage is intentionally partial across the full catalog**: many albums are mixtapes, lofi compilations, DJ sets, or niche releases without obvious full-album uploads. That is expected. The current recognizable pool is fully covered, which keeps Heardle and Blind Taste Test on stable daily picks.
- **`image` must not be null, and must be https** — fetch via MusicBrainz/iTunes before committing. `eval-site` fails on a missing, duplicated, or `http://` cover: production is https, so an insecure URL is mixed content and local dev cannot reveal it
- **No duplicates** — check artist+title before adding. Run `/add-album` skill for validation
- After renaming an album, set `image` to `null` and re-run fetch-covers to get correct artwork

## Lyrics Data

`lib/lyrics.json` stores 3-8 lyric lines per album, keyed by `"artist - title"`. Coverage moves; `npm run eval-site` prints the current figure. Populated via `npm run fetch-lyrics` (Genius API, needs `GENIUS_ACCESS_TOKEN`).

The fetcher asks **MusicBrainz** (free, no key) for the album's real tracklist, then looks up those exact songs on Genius. A track MusicBrainz places on the album is on the album, so a title+artist match needs no further checking — this routes around Genius's album metadata, which is missing or wrong for much of the catalogue and was the hard ceiling on coverage.

**Four albums can never have lyrics** and are denylisted: _Kind of Blue_, _A Love Supreme_, _Music for Airports_, _Endtroducing....._ — all instrumental. Chasing them is what produced a rap verse on a Miles Davis record.

Lines are filtered on ingest: >15 and <120 chars, no metadata or section headers, no liner-note credits, not from a translation page, and **at least two words over 3 characters** — the game blanks two words, and a line without two blankable ones silently degrades to a single blank.

Lyric Challenge now picks from the lyric-backed recognizable subset first instead of choosing from the full recognizable pool and hoping a lyric entry exists. That makes the game steadier and turns Cover Art Challenge into a rarer fallback instead of a random-feeling swap.

## Daily Rotation

Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally. Rotates through the whole catalog before repeating, so adding an album shifts which record lands on which day.

**The per-game sampler is different and the difference matters.** `pickRotatingPoolAlbum` indexes by _appearance ordinal_ — how many times that game has aired — not by `dayOfYear`. Indexing on the day samples the pool at a stride of `GAME_TYPES.length`, which collapses a pool sharing that factor to `pool/cadence` distinct albums a year (a pool of 80 gives 16, not 73) with no visible symptom. `npm run eval-site` fails if this regresses.

## External APIs

All optional: the site runs without them, and missing media sources now degrade gracefully. Heardle / Lyric Challenge can roll over to Cover Art Challenge with an explicit note instead of failing silently.

Keys live in a gitignored `.env` at the repo root (`cp .env.example .env`). The
fetchers below load it automatically, so the inline `KEY=xxx npm run …` form is
only needed to override what's already in the file.

- **MusicBrainz + Cover Art Archive**: Free (no key), primary source for album cover art
- **iTunes Search API**: Free (no key), fallback for cover art
- **Last.fm**: `LASTFM_API_KEY=xxx npm run fetch-covers` — legacy cover art fetcher
- **Genius**: `GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics` — lyric lines for recognizable albums
- **YouTube Data API v3**: `YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids` — video IDs for Heardle game (free tier: 100 searches/day)

Use `npm run eval-site` for a quick read on pool spread, recognizable/source coverage, and how healthy the game + soundtrack data layers are before a bigger content pass.
