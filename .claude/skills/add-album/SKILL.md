---
name: add-album
description: Add a new album to the daily rotation
---

# Add Album

Add one or more albums to the `ALBUMS` array in `lib/albums.js`.

## Arguments

The user provides album name(s) and/or artist(s). If details are incomplete, search the web to fill in: title, artist, year, genre.

## Steps

1. Read `lib/albums.js` to see the current album list and format
2. For each album to add:
   - Validate it's not already in the list (check title + artist)
   - If the user only gave a name, search the web to confirm: full title, artist, year, genre
   - Pick an appropriate cover emoji that represents the album's theme or artwork
   - Pick a hex color that matches the album's artwork or mood (dark/muted tones work best with the UI)
3. Add the new entries to the `ALBUMS` array in `lib/albums.js`, maintaining alphabetical order by artist
4. Report what was added and the new total album count
5. Note: adding albums shifts the daily rotation schedule since it's `dayOfYear % ALBUMS.length`

## Format

Each album entry must match this exact shape:

```js
{ title: "Album Title", artist: "Artist Name", year: 2000, genre: "Genre", cover: "🎵", color: "#hexhex" }
```

## Validation Rules

- `title`: Full official album title
- `artist`: Primary artist or band name
- `year`: Original release year (integer)
- `genre`: Concise genre label (1-3 words, e.g. "Hip-Hop", "Art Pop", "Alternative Rock")
- `cover`: Single emoji that evokes the album
- `color`: 6-digit hex color, should be dark/muted to work with white text overlay
