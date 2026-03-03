---
name: reset-day
description: Reset today's participation data for testing
disable-model-invocation: true
---

# Reset Day

Clear today's data so you can re-test the Rate & Reveal, Vibe Check, and Guess the Album flows from scratch.

## Arguments

Optional: `all` to reset the entire database, or `rate`/`vibe`/`guess` to reset a specific activity

## Steps

1. Determine today's keys:
   - Album key: today's date in `YYYY-MM-DD` format
   - Puzzle key: `puzzle-YYYY-MM-DD`

2. If the dev server is running via preview, clear localStorage in the browser:

   ```js
   // Clear participation flags
   localStorage.removeItem(`aotd_rated_YYYY-MM-DD`);
   localStorage.removeItem(`aotd_vibed_YYYY-MM-DD`);
   localStorage.removeItem(`aotd_guess_YYYY-MM-DD`);
   ```

   Then reload the page.

3. Clear today's database entries by running SQL against `data/aotd.db`:
   - If `all` or `rate`: `DELETE FROM ratings WHERE album_key = 'YYYY-MM-DD'`
   - If `all` or `vibe`: `DELETE FROM vibes WHERE album_key = 'YYYY-MM-DD'`
   - If `all` or `guess`: `DELETE FROM guess_stats WHERE puzzle_key = 'puzzle-YYYY-MM-DD'`

4. If the argument is literally `all` with no date qualifier, offer to delete the entire `data/aotd.db` file instead (faster full reset)

5. Report what was cleared

## Notes

- This is a destructive action — only invoke when the user explicitly asks
- The database auto-recreates on next request, so deleting `aotd.db` is safe
- localStorage can only be cleared if a preview server is running
