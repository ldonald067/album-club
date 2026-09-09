---
name: add-album
description: Add a new album to the daily rotation
---

# Add Album

Add one or more albums to `lib/albums.json` (the source of truth — `lib/albums.js` just imports it and exports it as `ALBUMS`).

## Arguments

The user provides album name(s) and/or artist(s). If details are incomplete, search the web to fill in: title, artist, year, genre.

## Steps

1. Read `lib/albums.json` to see the current album list and format
2. For each album to add:
   - Validate it's not already in the list (check title + artist)
   - If the user only gave a name, search the web to confirm: full title, artist, year, genre
   - Pick an appropriate cover emoji that represents the album's theme or artwork
   - Pick a hex color that matches the album's artwork or mood (dark/muted tones work best with the UI)
   - Set `recognizable: true` only for widely-known albums — see "What recognizable costs you" below
   - Fetch cover art for `image` (run `npm run fetch-covers` after adding, or find the URL manually)
3. **Append the new entries to the end of `lib/albums.json`.** The file is _not_
   sorted — not by artist, not by year, not by anything; entry one is Radiohead.
   Do not reorder it to "fix" that. Order is the file's own history, and the
   daily rotation is a seeded permutation over the array, so shuffling entries
   silently rewrites which album airs on which day.
4. Run `npm run fetch-album-facts` — sourced MusicBrainz facts are keyed
   `artist::title`, so a new album has none until this runs, and Soundtrack
   Corner and the recommendation scorer both read them
5. **Run `npm run eval-site`.** This is the guardrail for album data and it
   exits nonzero on real faults: duplicate accent colours or cover emoji, a
   missing or non-https image, and pool-size interactions with the game cadence.
   `npm test && npm run build` too, per `CLAUDE.md`
6. Report what was added and the new total album count
7. Note: adding albums shifts the daily rotation schedule (the rotation is a year-seeded permutation over `ALBUMS.length`)

## What `recognizable` costs you

`recognizable: true` enters the album into **four** pools, not one, each with a
different extra requirement:

| Pool            | Also needs  |
| --------------- | ----------- |
| Guess the Album | —           |
| Artist Scramble | —           |
| Cover Challenge | `image`     |
| Heardle         | `youtubeId` |

Lyric Challenge is separate: it draws from `lib/lyrics.json`, keyed
`Artist - Title`, and ignores `recognizable` entirely. **Wrong data is worse
than missing data** — read `git diff lib/lyrics.json` before committing any
lyric refill; a fetch that guessed once put a rap verse under a Miles Davis
record.

## Format

Each album entry must match this exact shape:

```json
{
  "title": "Album Title",
  "artist": "Artist Name",
  "year": 2000,
  "genre": "Genre",
  "cover": "🎵",
  "color": "#2a4858",
  "recognizable": false,
  "image": "https://..."
}
```

## Validation Rules

- `title`: Full official album title
- `artist`: Primary artist or band name
- `year`: Original release year (integer)
- `genre`: Concise genre label (1-3 words, e.g. "Hip-Hop", "Art Pop", "Alternative Rock")
- `cover`: Single emoji that evokes the album
- `color`: 6-digit hex color, should be dark/muted to work with white text overlay
- `recognizable`: boolean — true puts it in the Guess/Heardle puzzle pool
- `image`: cover art URL (every existing entry has one; run `npm run fetch-covers` to populate)
- `youtubeId` (optional): full-album YouTube ID, required for Heardle eligibility (`npm run fetch-youtube-ids`)
