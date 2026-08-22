# Album Data

## Source of Truth

`lib/albums.json` — the catalogue, one entry per album:

| Field          | Type    | Notes                                              |
| -------------- | ------- | -------------------------------------------------- |
| `title`        | string  | Album name (no artist prefix)                      |
| `artist`       | string  | Primary artist or band                             |
| `year`         | number  | Release year                                       |
| `genre`        | string  | Primary genre                                      |
| `cover`        | string  | Single emoji, unique across all albums             |
| `color`        | string  | Hex color, unique across all albums, R+G+B < 600   |
| `recognizable` | boolean | True if a general listener could guess from clues  |
| `image`        | string  | Cover art URL, https only — all populated          |
| `youtubeId`    | string? | YouTube video ID for Heardle/Taste Test (see note) |

## Quality Rules

- **Title must be a real album** — no singles, tracks, or fabricated names. Verify on RYM/Discogs
- **Title should not contain the artist name** — "Clandestino" not "Manu Chao: Clandestino"
- **Title should not contain "Soundtrack"** — shorten to just the show/film name
- **Year = release year**, not recording year (e.g., Sam Cooke live album: 1985 not 1963)
- **Color hex must be dark/muted** — R+G+B sum < 600 so white text is readable
- **Color must be unique** — no two albums share the same hex
- **Emoji must be unique** — single codepoint only (no flags 🇫🇷, ZWJ ❤️‍🔥, or keycaps 3️⃣)
- **`recognizable: true`** only for albums a general listener could guess from clues. Niche/experimental = false
- **`youtubeId` coverage is intentionally partial across the full catalog**: many albums are mixtapes, lofi compilations, DJ sets, or niche releases without obvious full-album uploads. That is expected. The current recognizable pool is fully covered, which keeps Heardle and Blind Taste Test on stable daily picks.
- **`image` must not be null, and must be https** — fetch via MusicBrainz/iTunes before committing. `eval-site` fails on a missing, duplicated, or `http://` cover: production is https, so an insecure URL is mixed content and local dev cannot reveal it
- **No duplicates** — check artist+title before adding. Run `/add-album` skill for validation
- After renaming an album, set `image` to `null` and re-run fetch-covers to get correct artwork

## Lyrics Data

`lib/lyrics.json` stores 3-8 lyric lines per album, keyed by `"artist - title"`. Coverage moves; `npm run eval-site` prints the current figure. Populated via `npm run fetch-lyrics` (Genius API, needs `GENIUS_ACCESS_TOKEN`).

The fetcher asks **MusicBrainz** (free, no key) for the album's real tracklist, then looks up those exact songs on Genius. A track MusicBrainz places on the album is on the album, so a title+artist match needs no further checking — this routes around Genius's album metadata, which is missing or wrong for much of the catalogue and was the hard ceiling on coverage.

**Four albums can never have lyrics** and are denylisted: _Kind of Blue_, _A Love Supreme_, _Music for Airports_, _Endtroducing....._ — all instrumental. Chasing them is what produced a rap verse on a Miles Davis record.

Lines are filtered on ingest: >15 and <120 chars, no metadata or section headers, no liner-note credits, not from a translation page, and **at least two words over 3 characters** — the game blanks two words, and a line without two blankable ones silently degrades to a single blank.

Lyric Challenge now picks from the lyric-backed recognizable subset first instead of choosing from the full recognizable pool and hoping a lyric entry exists. That makes the game steadier and turns Cover Art Challenge into a rarer fallback instead of a random-feeling swap.

## Album Facts (`lib/album-facts.json`)

Sourced shape data from MusicBrainz — track count, runtime, longest track,
release type — keyed `"Artist::Title"` off the catalog's own strings. Fill it
with `npm run fetch-album-facts`; the run resumes and skips whatever it already
has, so an interrupted pass costs nothing.

**Why a second file rather than fields on `albums.json`:** a bad run can then be
deleted without touching the catalog every other feature reads. Same reasoning
as `lyrics.json`.

**It is partial by design.** Roughly a quarter of this catalog is DJ sets, radio
mixes and curated playlists that have no MusicBrainz release group at all, and
those are _supposed_ to come back empty. Every read of the facts is optional;
an album without them generates exactly as it did before.

**The matcher refuses to guess**, because this is the failure mode that put a
rap verse under _Kind of Blue_. A candidate must clear five checks — search
score ≥ 90, primary type Album or EP, artist, title, and a release year within
a year of the catalog's — and a plain album outranks one flagged Live or
Compilation when both qualify. Faults caught by running it, each now guarded:

- Passing the candidate object where the title string belonged made every
  comparison normalize to `"object object"`, and **every album was rejected**.
  Failing closed is the right direction for this to fail.
- _Purple Rain_ matched Prince's **single** — same artist, same title, same
  year, score 100, and 3 tracks in 19 minutes. Hence the primary-type filter,
  and `eval-site` fails any Album-typed record that is single-sized.
- `encodeURI` leaves `&`, `?` and `#` alone, so `releasegroup:"The Velvet
Underground & Nico"` truncated into a search for "The Velvet Underground".
  21 catalog entries carry one of those characters. URLs are built with
  `URLSearchParams` now.
- Justice's _Cross_ matched **A Cross the Universe**, their live album a year
  later: same artist, adjacent year, and the catalog title sits inside the
  longer one. Title containment is now capped at 2× growth, which still accepts
  _Music for Airports_ → _Ambient 1: Music for Airports_. That entry is
  uncovered now, which is the honest outcome.

**Which release the numbers come from took three tries, and the reasoning
matters more than the answer.** A release group holds every edition ever
pressed, and they disagree.

| Rule              | Why it failed                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earliest official | MusicBrainz dates at varying precision and a bare year sorts before any dated day in it, so _Lonerism_'s year-only 4-disc box set won: 26 tracks, 110 minutes against a real 12 and 51   |
| Median            | For an often-reissued album most catalogued editions **are** expanded, so the middle is a deluxe edition — _Structures from Silence_ 3 → 7 tracks, _Carrie & Lowell_ 11 → 18             |
| Minimum           | Picked up truncated editions, and did it on the worst possible record: _Kind of Blue_ as 3 tracks and 26 minutes                                                                         |
| **Consensus**     | In use. A box set is one release against a dozen ordinary pressings, and a truncated edition is outvoted the same way. Measured 9/11 against known shapes, vs minimum's 8 and median's 2 |

It is a heuristic, not an oracle: _A Love Supreme_ still reports 3 movements
against a real 4, because its catalogue genuinely disagrees with itself.

**Video media are not tracks.** _Lemonade_ is catalogued mostly as
`CD:12 + DVD:1`, and that DVD entry is the 65-minute film — counted, it made a
12-track, 46-minute record report as 13 tracks and 111 minutes. Numbers like
that look perfectly plausible on their own, which is why `eval-site` guards the
exclusion at the source rather than trying to spot it in the data.

Each entry stores the `releaseTitle` it was derived from. `eval-site` re-checks
it against the catalog title and **reports** mismatches without failing: release
titles carry edition text that group titles do not ("Ready to Die (The Remaster
CD and DVD)"), and several catalog entries abbreviate a longer real title
("Bon Iver" for "Bon Iver, Bon Iver"). As a hard check it fired nine times and
eight were benign — the kind of guardrail people learn to scroll past. The
strict rule still runs where it can act on the answer: inside the fetcher,
before anything is written.

**Coverage is 344/424 (81.1%), and the last stretch is not worth buying.** Of
the 80 still missing, **70 have no MusicBrainz release group at all** — the DJ
sets, radio mixes and curated playlists — and re-running the fetch cannot
change that. The other ten are skips the guards earned: MusicBrainz files
_Madvillainy_ under the 2002 leak against the catalog's 2004, _Zombie_ only
inside a "Na Poi / Zombie" reissue, _Spirited Away_ only inside a combined
Miyazaki release. Loosening the year window to reach a rounder number would
trade correctness for a number.

**Two guards were loosened, both after measuring what they were actually
rejecting.** The Lucene score floor moved 90 → 80: relevance dilutes with title
length, so "Interstellar: Original Motion Picture Soundtrack" scored 88 against
a catalog entry of "Interstellar" while a same-named single scored 100. And
known edition suffixes ("original motion picture soundtrack", "deluxe edition",
"remastered") are stripped from the candidate before the 2× growth check. Both
were safe to relax because artist, title, year and primary type are all checked
independently — "A Cross the Universe" contains none of those phrases and is
still rejected.

**Editions that announce themselves lose the vote.** Consensus alone picked
_Interstellar_'s **Expanded Edition** — five pressings of the 30-track version
against four of the 16-track soundtrack. Releases whose title says "expanded",
"deluxe", "remaster" and so on are set aside before the vote, with a fallback
to the full set for albums that only exist as remasters. Three stored entries
were affected and all three are now right: Interstellar 30 → 16 tracks,
Ready to Die 19 → 17.

**The fetch found three catalog errors and they are now fixed.** Petit Biscuit's
_Presence_ was filed as 2022 and is a 2017 record; Between the Buried and Me's
_Colors Live_ was filed as 2020 and is 2008; Boy Pablo's _Soy Pablo_ was filed
as 2022 and is a 2018 record. Both were rejected for year drift
— correctly, given what the catalog had claimed — and both match now, which is
what took coverage over 80%. A wrong year is not cosmetic here: it picks the
decade flavour the generated corner writes in.

**The video exclusion existed and one of the two code paths ignored it.** The
fetch path counted a raw media flatMap while the refresh path used
`trackCount()`, so _Colors Live_ stored its 8 CD tracks plus 14 DVD ones as 22
while its runtime counted only the CD. A split like that survives a spot-check,
because whichever path you happen to test is the one that is right —
`eval-site` now fails if the fetcher counts media anywhere except through
`trackCount()`.

**Deliberately not collected: release country.** It is the country of the
earliest official _pressing_, not where the record is from — _Nevermind_ came
back `SA`, _Rumours_ `NL`. It would read as a fact and function as a lie.

Coverage lives in `npm run soundtrack-corner-report`, never in prose here.

## Daily Rotation

Seeded shuffle (mulberry32 PRNG + Fisher-Yates) keyed by year. Same date = same album globally. Rotates through the whole catalog before repeating, so adding an album shifts which record lands on which day.

**The per-game sampler is different and the difference matters.** `pickRotatingPoolAlbum` indexes by _appearance ordinal_ — how many times that game has aired — not by `dayOfYear`. Indexing on the day samples the pool at a stride of `GAME_TYPES.length`, which collapses a pool sharing that factor to `pool/cadence` distinct albums a year (a pool of 80 gives 16, not 73) with no visible symptom. `npm run eval-site` fails if this regresses.

## External APIs

All optional: the site runs without them, and missing media sources now degrade gracefully. Heardle / Lyric Challenge can roll over to Cover Art Challenge with an explicit note instead of failing silently.

Keys live in a gitignored `.env` at the repo root (`cp .env.example .env`). The
fetchers below load it automatically, so the inline `KEY=xxx npm run …` form is
only needed to override what's already in the file.

- **MusicBrainz + Cover Art Archive**: Free (no key), primary source for album cover art, and the source for `npm run fetch-album-facts` (one request per second, identifying User-Agent, retries on 503 and on a dropped connection)
- **iTunes Search API**: Free (no key), fallback for cover art
- **Last.fm**: `LASTFM_API_KEY=xxx npm run fetch-covers` — legacy cover art fetcher
- **Genius**: `GENIUS_ACCESS_TOKEN=xxx npm run fetch-lyrics` — lyric lines for recognizable albums
- **YouTube Data API v3**: `YOUTUBE_API_KEY=xxx npm run fetch-youtube-ids` — video IDs for Heardle game (free tier: 100 searches/day)

Use `npm run eval-site` for a quick read on pool spread, recognizable/source coverage, and how healthy the game + soundtrack data layers are before a bigger content pass.
