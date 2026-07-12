---
name: preview-schedule
description: Show the upcoming album schedule for the next N days
---

# Preview Schedule

Show which albums will be featured and which puzzle albums will appear over the next N days.

## Arguments

Optional: number of days to preview (default: 14)

## Steps

1. Read `lib/albums.js` to get the `ALBUMS` array and the rotation logic
2. Calculate the schedule with a small Node script that imports the real logic — do NOT hand-compute formulas:
   - Featured album: `getAlbumForDate(date)` (a year-seeded permutation, not a raw modulo)
   - Puzzle album: filter to `recognizable` albums, then apply the `pickRotatingPoolAlbum` logic with seed `year * 31 + 7` (it also avoids colliding with that day's featured album)
   - Game type: `getGameType(date)` (5-day cycle: guess, cover, lyric, heardle, scramble)
3. Output a formatted table:

```
Date          | Featured Album              | Puzzle Album
--------------|-----------------------------|-----------------------------
Feb 28 (Thu)  | To Pimp a Butterfly         | Blue
Mar 1  (Fri)  | OK Computer                 | Aquemini
...
```

4. Report any issues found:
   - Albums that never appear in the current rotation cycle
   - Featured/puzzle collisions
   - How many days until the rotation repeats (should be `ALBUMS.length`)

## Notes

- Do NOT modify any files — this skill is read-only
- The rotation is deterministic per calendar year: `seededPermutation(ALBUMS.length, year)[dayOfYear % ALBUMS.length]`
- Use a Node script that imports from `lib/albums.js`, don't run the dev server
