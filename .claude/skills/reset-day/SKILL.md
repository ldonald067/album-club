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

2. If the dev server is running via preview, clear localStorage in the browser.
   **Every key is prefixed `aotd_`, so clear by prefix — there are ~22 of them
   and a hand-written list of three is how "from scratch" quietly isn't:**

   ```js
   // Everything this site stores. Day-scoped keys end in the date.
   Object.keys(localStorage)
     .filter((k) => k.startsWith("aotd_"))
     .forEach((k) => localStorage.removeItem(k));
   ```

   To keep the skin and the streak while resetting only today's play, filter to
   the day-scoped keys instead: `aotd_rated_`, `aotd_vibed_`, `aotd_guess_`,
   `aotd_cover_`, `aotd_heardle_`, `aotd_lyric_`, `aotd_scramble_`,
   `aotd_playlist_`, `aotd_versus_`, `aotd_taste_`, `aotd_soundtrack_`. The rest
   are durable: `aotd_streak`, `aotd_visit_count`, `aotd_last_visit`,
   `aotd_milestones_celebrated`, `aotd_theme`, `aotd_album_view`,
   `aotd_vinyl_spins`, `aotd_runout_seen`, `aotd_away_seen`, and
   `aotd_welcome_back_dismissed` (sessionStorage).

   Then reload the page.

3. Clear today's database entries by running SQL against `data/aotd.db`. **There
   are six vote tables, not three** — a reset that stops at the first three
   leaves the Playlist Poll, Versus, Blind Taste Test and Soundtrack Corner
   still showing you as having voted:
   - If `all` or `rate`: `DELETE FROM ratings WHERE album_key = 'YYYY-MM-DD'`
   - If `all` or `vibe`: `DELETE FROM vibes WHERE album_key = 'YYYY-MM-DD'`
   - If `all` or `guess`: `DELETE FROM guess_stats WHERE puzzle_key = 'puzzle-YYYY-MM-DD'`
   - If `all`: `DELETE FROM playlist_votes WHERE album_key = 'YYYY-MM-DD'`
   - If `all`: `DELETE FROM matchup_votes WHERE matchup_key IN ('versus-YYYY-MM-DD', 'taste-YYYY-MM-DD')`
   - If `all`: `DELETE FROM soundtrack_votes WHERE album_key = 'YYYY-MM-DD'`

4. If the argument is literally `all` with no date qualifier, offer to delete the entire `data/aotd.db` file instead (faster full reset)

5. Report what was cleared

## Notes

- This is a destructive action — only invoke when the user explicitly asks
- The database auto-recreates on next request, so deleting `aotd.db` is safe
- localStorage can only be cleared if a preview server is running
- **The API will keep serving the old counts for up to 30 seconds.** Eight GET
  routes hold an in-memory cache (rate, vibe, playlist, matchup, guess,
  soundtrack, soundtrack/history at 60s, stats at 5 min). After a DELETE, either
  wait it out or restart the dev server — otherwise the reset looks like it
  failed when it worked
- Never touch the production database this way. This is `data/aotd.db` on the
  dev machine; the live one is on a Railway volume and holds the only copy of
  real votes
