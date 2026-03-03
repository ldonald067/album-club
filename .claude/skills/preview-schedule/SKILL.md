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
2. Calculate the schedule by simulating the date rotation:
   - For each day from today to today + N:
     - Compute `dayOfYear % ALBUMS.length` for the featured album
     - Compute `(dayOfYear * 7 + 13) % ALBUMS.length` for the puzzle album
     - Flag if featured === puzzle (shouldn't happen, but worth checking)
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
- The rotation is deterministic: `dayOfYear % ALBUMS.length`
- Use JavaScript evaluation or manual calculation, don't run the dev server
