# Album Of The Day Club

Retro-2004 forum site — one album a day, anonymous rating/vibes/games.
Next.js 16 App Router + SQLite (better-sqlite3, WAL, auto-creates `data/aotd.db`).
No auth: every bit of per-user state is localStorage under `aotd_*`.
All CSS lives in `app/globals.css` — **no Tailwind**, and the 2004 aesthetic is deliberate.

## Commands

```bash
npm install              # includes a better-sqlite3 native build
npm run dev              # localhost:3000
npm test                 # node:test — rotation, sampler, guess validation
npm run build            # must pass before pushing
npm run eval-site        # data guardrails; also prints live pool counts
```

## Workflow

**Pushing to `master` deploys production** (Railway auto-deploys — see `docs/project.md`).

YOU MUST run `npm test && npm run build` before committing, plus `npm run eval-site`
for anything touching album or lyric data — it exits nonzero on real faults. Only
if they pass: `git add -A && git commit -m "description" && git push`.
Use a feature branch + PR for risky changes.

## Non-negotiables

Each of these has already cost real time or shipped a live bug.

- **Escapes never decode in JSX.** Not in bare text, not in attribute values —
  `label="📋 Share"` ships those characters verbatim. Use the real
  character. This shipped **twice**.
- **Never index a per-game pool by `dayOfYear`.** Each game airs every
  `GAME_TYPES.length` days, so that samples the pool at a stride and silently
  collapses annual variety. `pickRotatingPoolAlbum` indexes by _appearance
  ordinal_; `eval-site` fails if that regresses.
- **Wrong data is worse than missing data.** A lyric fetch that guesses once put
  a rap verse under a Miles Davis record. Read `git diff lib/lyrics.json` before
  committing any refill — the guards catch known failure shapes, not novelty.
- **Never rename an `aotd_*` localStorage key.** It silently discards every
  user's history, and on a fresh profile it looks identical to working.
- **Never hardcode a colour in CSS.** Every light background and every text
  colour resolves through a `--surface-*` / `--text-*` token in `:root`, so a
  skin overrides a palette instead of chasing selectors. The first Vintage skin
  chased selectors and was still incomplete after two full audits. `eval-site`
  fails on a raw light background hex and names the line. See `docs/skins.md`.
- **Verify by outcome, not by reading.** Guardrails in `eval-site` have caught
  data faults that three rounds of careful manual review missed. For colour,
  "by outcome" means measuring the rendered pixel — `docs/gotchas.md` lists
  three ways the measurement itself lies.

## Where things live

The tree is mostly self-explanatory. The parts that aren't:

- `app/ForumPage.js` — one client component holding every game and all UI
- `lib/safe-fetch.js` — `loadJson()` throws on non-2xx so a bad response can't
  poison client state
- `lib/albums.js` — seeded shuffle, daily rotation, and the game samplers
- `lib/soundtrack-corner*.js` — generator + curated overrides; large, and kept
  off the home path behind `next/dynamic` on purpose
- `scripts/eval-site.mjs` — the data guardrails, and the closest thing to a test
  the content layer has

Pool sizes and coverage percentages drift constantly. Get them from
`npm run eval-site`, never from prose — including this file.

## Read before starting

**New session? Read `docs/STATUS.md` first** — current state, open items, and
standing decisions, including features deliberately _not_ built.

| Task involves...       | Read first            |
| ---------------------- | --------------------- |
| Where things stand     | `docs/STATUS.md`      |
| Games or puzzles       | `docs/games.md`       |
| API routes or database | `docs/api.md`         |
| UI components or state | `docs/components.md`  |
| Album data or imports  | `docs/album-data.md`  |
| CSS or rendering       | `docs/performance.md` |
| Colours, themes, a11y  | `docs/skins.md`       |
| Build errors or quirks | `docs/gotchas.md`     |
| Deploys or scripts     | `docs/project.md`     |

Writing Soundtrack Corner overrides has its own pipeline —
`docs/soundtrack-corner-research.md`.
