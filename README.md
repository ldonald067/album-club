# Album Of The Day Club

A retro forum-style website where a new album is featured every day. Rate it, pick vibes, and play daily music games — all anonymous, no accounts needed.

## Features

- **Daily Album** — a different album every day from a rotation of 383 curated albums
- **Rate & Reveal** — rate 1-10 and see the community histogram
- **Vibe Check** — pick 1-3 mood vibes and see what everyone else chose
- **5 Daily Games** (rotating):
  - **Guess the Album** — clue-based guessing (genre, decade, artist initial)
  - **Cover Art Challenge** — guess from a blurred album cover
  - **Lyric Fill-in-the-Blank** — complete the missing words
  - **Heardle** — name the album from a short audio clip
  - **Artist Scramble** — unscramble the artist name, guess the album
- **Streak Tracking** — tracks your daily participation streak
- **Shareable Results** — Wordle-style copy-to-clipboard for all activities
- **Yesterday's Recap** — see what the community thought about yesterday's album
- **Retro Aesthetic** — 2004 forum vibes with pixel art icons and a vinyl record CSS effect

- **Crate Digger Chat** - ask a music, pop culture, and video game-savvy agent running for free on a local model by default

## Setup

Requires [Node.js](https://nodejs.org/) v18+.

```bash
git clone https://github.com/ldonald067/album-club.git
cd album-club
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database creates itself on first request.

For the free chat agent setup, install [Ollama](https://ollama.com/download), pull a local model, and keep Ollama running:

```bash
ollama pull gemma3:4b
npm run dev
```

Crate Digger defaults to local Ollama mode with:

```bash
CRATE_DIGGER_PROVIDER=ollama
OLLAMA_MODEL=gemma3:4b
OLLAMA_HOST=http://127.0.0.1:11434
```

If your machine is lighter on RAM, try `OLLAMA_MODEL=gemma3:1b`.

Optional paid/hosted mode: switch to OpenAI explicitly:

```bash
CRATE_DIGGER_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
```

Optional advanced OpenAI retrieval mode:

```bash
OPENAI_API_KEY=sk-... npm run sync-crate-digger-knowledge
OPENAI_VECTOR_STORE_ID=vs_...
```

## Project Structure

```
app/
  page.js              # Server component — resolves today's album
  ForumPage.js         # Client component — all UI and games
  globals.css          # All styling
  api/                 # rate, vibe, guess, stats, chat routes
lib/
  albums.json          # 383 album entries (source of truth)
  albums.js            # Shuffle logic, game helpers, vibes
  lyrics.json          # Lyric lines for ~88 albums
  db.js                # SQLite database
data/                  # Auto-created, holds aotd.db (gitignored)
scripts/               # Data fetching tools (covers, lyrics, YouTube IDs)
public/agent-knowledge/ # Curated Crate Digger knowledge pack
docs/                  # Developer documentation
```

## Data Scripts (Optional)

These populate game data. The site works without them — games fall back to Cover Art Challenge.

```bash
LASTFM_API_KEY=xxx npm run fetch-covers        # Album cover art
GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics    # Lyrics for Lyric game
YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids   # YouTube IDs for Heardle
OPENAI_API_KEY=xxx npm run sync-crate-digger-knowledge  # Optional OpenAI file search
```

## Tech Stack

- **Next.js 15** (App Router)
- **Ollama** for free local Crate Digger chat by default
- **OpenAI Responses API** as an optional hosted provider with web search and file search
- **SQLite** via better-sqlite3
- **No auth** — fully anonymous, localStorage for client state
- **No CSS framework** — hand-written retro CSS

## License

Do whatever you want with it. Have fun!
