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
   - Set `recognizable: true` only for widely-known albums (these enter the puzzle/heardle pool)
   - Fetch cover art for `image` (run `npm run fetch-covers` after adding, or find the URL manually)
3. Add the new entries to `lib/albums.json`, maintaining alphabetical order by artist
4. Report what was added and the new total album count
5. Note: adding albums shifts the daily rotation schedule (the rotation is a year-seeded permutation over `ALBUMS.length`)

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
