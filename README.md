# Album Of The Day Club

A retro forum-style website where a new album is featured every day. Rate it, pick vibes, and play daily music games — all anonymous, no accounts needed.

## Features

- **Daily Album** — a different album every day from a hand-curated rotation
- **Rate & Reveal** — rate 1-10 and see the community histogram
- **Vibe Check** — pick 1-3 mood vibes and see what everyone else chose
- **Daily Games** — one per day, rotating:
  - **Guess the Album** — clue-based guessing (genre, decade, artist initial)
  - **Cover Art Challenge** — guess from a blurred album cover
  - **Lyric Fill-in-the-Blank** — complete the missing words
  - **Heardle** — name the album from a short audio clip
  - **Artist Scramble** — unscramble the artist name, guess the album
- **Playlist Poll** — add today's album to the playlist, or skip it
- **Album vs Album** — a daily head-to-head from the back catalogue
- **Blind Taste Test** — two mystery clips, no labels, pick one
- **Soundtrack Corner** — today's album reimagined as game / film / TV cue music, with scene cards and "listen next" picks
- **Cozy Vibes** — a self-hosted pixel sandbox and a small shelf of cozy games
- **Skins** — switch the 2004 forum for a Vintage 1990s desktop
- **Streak Tracking** — tracks your daily participation streak
- **Shareable Results** — Wordle-style copy-to-clipboard for all activities
- **Yesterday's Recap** — see what the community thought about yesterday's album
- **Retro Aesthetic** — 2004 forum vibes with pixel art icons and a vinyl record CSS effect

## Setup

Requires [Node.js](https://nodejs.org/) v20.12+ (CI runs 22).

```bash
git clone https://github.com/ldonald067/album-club.git
cd album-club
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database creates itself on first request.

## Project Structure

```
app/
  page.js              # Server component — resolves today's album
  ForumPage.js         # Client component — all UI and games
  globals.css          # All styling
  api/                 # rate, vibe, guess, stats, playlist, matchup,
                       #   soundtrack, health, backup routes
lib/
  albums.json          # The album catalog (source of truth)
  albums.js            # Shuffle logic, game helpers, vibes
  lyrics.json          # Lyric lines for the Lyric game
  db.js                # SQLite database
data/                  # Auto-created, holds aotd.db (gitignored)
scripts/               # Data fetching + eval tools (covers, lyrics, YouTube IDs, site eval)
docs/                  # Developer documentation
```

## Data Scripts (Optional)

These populate game data. The site works without them — games fall back to Cover Art Challenge.

```bash
LASTFM_API_KEY=xxx npm run fetch-covers        # Album cover art
GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics    # Lyrics for Lyric game
YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids   # YouTube IDs for Heardle
```

## Tech Stack

- **Next.js 16** (App Router)
- **SQLite** via better-sqlite3
- **No auth** — fully anonymous, localStorage for client state
- **No CSS framework** — hand-written retro CSS

## License

Do whatever you want with it. Have fun!
