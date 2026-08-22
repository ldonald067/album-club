/**
 * Fetch verifiable shape facts for the catalog from MusicBrainz.
 *
 * Usage: node scripts/fetch-album-facts.mjs [--limit N] [--only "Artist"]
 *        node scripts/fetch-album-facts.mjs --refresh [--resume]
 *
 * No API key. MusicBrainz asks for one request per second and a User-Agent
 * that identifies the caller, and both are honoured below.
 *
 * WHY THIS EXISTS: the Soundtrack Corner generator knows exactly two things
 * about an album — its genre string and its year. Everything else it says is
 * inferred from those. These are facts instead: how many tracks, how long, how
 * long the longest one runs, whether it is a live set or a compilation.
 *
 * Deliberately NOT collected: the release country. It is the country of the
 * earliest official *pressing*, not where the record is from — Nevermind came
 * back "SA" and Rumours "NL" — so it would read as a fact and function as a
 * lie. All of
 * it is checkable, none of it is invention, and it is the difference between
 * writing about a 4-track 42-minute ambient record and a 22-track mixtape.
 *
 * WHAT IT WILL NOT DO: guess. A lyric fetch that guessed once put a rap verse
 * under Kind of Blue (docs/gotchas.md), so a candidate here has to clear four
 * independent checks — search score, artist, title, year — and anything that
 * fails is skipped and reported rather than force-matched. Roughly a quarter of
 * this catalog is DJ sets, radio mixes and curated playlists that do not exist
 * in MusicBrainz at all; those are *supposed* to come back empty.
 *
 * Writes lib/album-facts.json, keyed "Artist::Title" off the catalog's own
 * strings. Deliberately a separate file from albums.json: a bad run can then
 * be deleted without touching the catalog every other feature reads.
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const albumsPath = path.join(rootDir, "lib", "albums.json");
const factsPath = path.join(rootDir, "lib", "album-facts.json");

const USER_AGENT =
  "AlbumOfTheDayClub/1.0 (https://littlealbumclub.net) fetch-album-facts";
const RATE_LIMIT_MS = 1100;
/* Lucene relevance, and it dilutes with title length: "Interstellar: Original
   Motion Picture Soundtrack" scores 88 against a catalog entry of
   "Interstellar" while a same-named single scores 100. 90 was set when the
   title rule was the loose one and the score was carrying real weight; with
   artist, title, year and primary type all checked independently it is the
   weakest guard here, and holding it at 90 was rejecting correct albums for
   having long official names. */
const MIN_SCORE = 80;
const ALLOWED_PRIMARY_TYPES = ["Album", "EP"];
const MAX_YEAR_DRIFT = 1;

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const onlyArg = args.indexOf("--only");
const limit = limitArg > -1 ? Number(args[limitArg + 1]) : Infinity;
const only = onlyArg > -1 ? args[onlyArg + 1].toLowerCase() : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Built with URLSearchParams rather than encodeURI, which leaves "&", "?" and
   "#" untouched. `releasegroup:"The Velvet Underground & Nico"` was therefore
   truncating at the ampersand into a query for "The Velvet Underground", which
   matched a real but different album and was correctly rejected — 21 catalog
   entries carry one of those characters and every one of them was searching
   for the wrong thing. */
function musicbrainzUrl(endpoint, params) {
  const url = new URL(`https://musicbrainz.org/ws/2/${endpoint}`);
  for (const [key, value] of Object.entries({ ...params, fmt: "json" })) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function musicbrainz(endpoint, params) {
  const url = musicbrainzUrl(endpoint, params);
  let lastError = null;

  /* Retries cover two different failures. A 503 is MusicBrainz asking us to
     slow down. A thrown fetch is the connection dropping under sustained
     traffic, which happens on a run this long and used to cost the album
     outright — one was lost that way before this caught it. Anything else
     (a 400, a 404) is a real answer and is not retried. */
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (response.ok) return response.json();
      if (response.status !== 503) throw new Error(`HTTP ${response.status}`);
      lastError = new Error("HTTP 503");
    } catch (error) {
      if (
        String(error.message).startsWith("HTTP ") &&
        error.message !== "HTTP 503"
      ) {
        throw error;
      }
      lastError = error;
    }

    await sleep(RATE_LIMIT_MS * attempt * 2);
  }

  throw lastError || new Error("unreachable");
}

/** Lowercase, strip diacritics and punctuation, drop a leading article. */
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* Containment is needed — "Music for Airports" is filed as "Ambient 1: Music
   for Airports" — but unbounded it matched Justice's "Cross" to "A Cross the
   Universe", their live album from the following year. Same artist and one
   year apart, so the artist and year checks both passed and the catalog got a
   19-track, 135-minute live record filed as a 12-track studio album.

   A real title variant adds a prefix or a bit of punctuation, so the longer
   string stays close in length. Doubling means it is a different record. */
const MAX_TITLE_GROWTH = 2;

/* MusicBrainz files scores under their full commercial title — "Interstellar:
   Original Motion Picture Soundtrack", "Drive: Original Motion Picture
   Soundtrack", "MADE IN ABYSS ORIGINAL SOUNDTRACK" — and against a catalog that
   says "Interstellar" the growth cap threw all of them out. That is a format
   suffix, not a different record, so it comes off before the comparison.

   Only the listed phrases are removed, and only from the candidate. "A Cross
   the Universe" contains none of them and stays rejected, which is the case
   the cap exists for. */
const EDITION_SUFFIX =
  /\b(original (motion picture )?(soundtrack|score)|complete motion picture score( promotional edition)?|motion picture soundtrack|original series soundtrack|soundtrack from the motion picture|deluxe edition|expanded edition|anniversary edition|special edition|remastered|reissue)\b/g;

function stripEditionText(value) {
  return value.replace(EDITION_SUFFIX, " ").replace(/\s+/g, " ").trim();
}

function withinGrowth(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (!left.includes(right) && !right.includes(left)) return false;

  const [shorter, longer] =
    left.length < right.length ? [left, right] : [right, left];
  return longer.length <= shorter.length * MAX_TITLE_GROWTH;
}

function titlesAgree(catalogTitle, candidateTitle) {
  const left = normalize(catalogTitle);
  const right = normalize(candidateTitle);

  return (
    withinGrowth(left, right) || withinGrowth(left, stripEditionText(right))
  );
}

function artistsAgree(catalogArtist, candidate) {
  const credited = (candidate["artist-credit"] || [])
    .map((entry) => entry.name)
    .join(" ");
  const left = normalize(catalogArtist);
  const right = normalize(credited);
  if (!left || !right) return false;
  return left === right || right.includes(left) || left.includes(right);
}

function yearsAgree(catalogYear, candidate) {
  const raw = candidate["first-release-date"];
  const year = Number(String(raw || "").slice(0, 4));
  if (!Number.isFinite(year) || year === 0) return false;
  return Math.abs(year - catalogYear) <= MAX_YEAR_DRIFT;
}

/* Lemonade is catalogued mostly as "CD:12 + DVD:1", and that one DVD entry is
   the 65-minute film. Counting it made a 12-track, 46-minute record report as
   13 tracks and 111 minutes — a fact, stated confidently, that was wrong.
   Video media are not tracks. */
const VIDEO_FORMATS = /dvd|blu-ray|bluray|vhs|umd|video/i;

function audioMedia(release) {
  return (release?.media || []).filter(
    (medium) => !VIDEO_FORMATS.test(medium.format || ""),
  );
}

function trackLengths(release) {
  return audioMedia(release)
    .flatMap((medium) => medium.tracks || [])
    .map((track) => track.length || 0)
    .filter(Boolean);
}

function trackCount(release) {
  return audioMedia(release).flatMap((medium) => medium.tracks || []).length;
}

/* Pick the release whose track count MOST editions agree on, ties to the
   smaller. Three rules were tried against records whose real shape is known,
   and this one is here because it measured best — 9 of 11 against the
   minimum's 8 and the median's 2.

   "Earliest" failed twice over: MusicBrainz dates releases at varying
   precision and a bare year sorts before any dated day in the same year, so
   Lonerism's year-only 4-disc box set won and a 12-track, 51-minute record was
   reported as 26 tracks and 110 minutes.

   "Median" was worse. For an album reissued often, most catalogued editions
   ARE expanded ones, so the middle of the distribution is a deluxe edition:
   Structures from Silence went from a correct 3 tracks to a 3-disc anniversary
   set, Carrie & Lowell from 11 to 18.

   "Minimum" was close but picked up truncated editions, and did it on the one
   record this repo can least afford to get wrong: Kind of Blue came out as 3
   tracks and 26 minutes against a real 5 and 45.

   Consensus handles all three. A box set is one release against a dozen
   ordinary pressings; a truncated edition is likewise outvoted. It is a
   heuristic, not an oracle — A Love Supreme still reports 3 movements against
   a real 4, because its catalogue genuinely disagrees with itself — so
   eval-site's plausibility checks stay the backstop.

   Only timed releases are considered: plenty of early pressings list every
   track and time none of them (Hounds of Love's 1985-09-16 release does), and
   an earlier version skipped albums MusicBrainz knows perfectly well. */
/* Consensus alone is not enough when the expanded edition is the one the world
   kept pressing. Interstellar's group holds five releases of the 30-track
   Expanded Edition against four of the 16-track soundtrack, so the vote went to
   the wrong record — and the release said so in its own title. Editions that
   announce themselves get set aside first, and consensus runs on what is left. */
const EDITION_TITLE =
  /expanded|deluxe|anniversary|special edition|remaster|collector|complete (motion picture )?score|legacy edition|bonus/i;

function pickRelease(releases) {
  const timed = releases.filter(
    (release) =>
      release.status === "Official" &&
      release.date &&
      trackLengths(release).length,
  );
  const all = timed.length
    ? timed
    : releases.filter((release) => trackLengths(release).length);

  /* Fall back to the full set when every release is an edition: some albums
     only exist as remasters, and a fact from a remaster beats no fact. */
  const plain = all.filter(
    (release) => !EDITION_TITLE.test(release.title || ""),
  );
  const usable = plain.length ? plain : all;

  if (!usable.length) return null;

  const votes = new Map();
  for (const release of usable) {
    const count = trackCount(release);
    votes.set(count, (votes.get(count) || 0) + 1);
  }

  const [consensus] = [...votes.entries()].sort(
    (left, right) => right[1] - left[1] || left[0] - right[0],
  )[0];

  return (
    usable
      .filter((release) => trackCount(release) === consensus)
      .sort((left, right) =>
        String(left.date || "9999").localeCompare(String(right.date || "9999")),
      )[0] || usable[0]
  );
}

async function fetchFacts(album) {
  /* 10, not 5: a title can lose its own album to same-named singles, live
     versions and box sets that score just as well. The five checks below do
     the accepting, so a wider net costs accuracy nothing. */
  const search = await musicbrainz("release-group", {
    query: `artist:"${album.artist}" AND releasegroup:"${album.title}"`,
    limit: 10,
  });
  const groups = search["release-groups"] || [];

  /* Primary type matters as much as the other four checks. "Purple Rain" by
     Prince, 1984, score 100 is a perfect match on every other axis — and the
     top hit is the *single*: 3 tracks, 19 minutes, filed under the same name
     in the same year. A catalog of albums only wants release groups that are
     albums. */
  const usable = groups.filter(
    (candidate) =>
      (candidate.score ?? 0) >= MIN_SCORE &&
      ALLOWED_PRIMARY_TYPES.includes(candidate["primary-type"]) &&
      artistsAgree(album.artist, candidate) &&
      titlesAgree(album.title, candidate.title) &&
      yearsAgree(album.year, candidate),
  );
  /* Prefer a plain album over one flagged Live or Compilation when both clear
     the checks: the catalog's live records (The Köln Concert, the Tiny Desk
     sets) only exist as live groups and still match, while a studio album with
     a same-named live companion stops picking the companion. */
  const albums = usable.filter(
    (candidate) => candidate["primary-type"] === "Album",
  );
  const match =
    albums.find((candidate) => !(candidate["secondary-types"] || []).length) ||
    albums[0] ||
    usable[0];

  if (!match) {
    const best = groups[0];
    return {
      skipped: best
        ? `no confident match (best: "${best.title}" by ${best["artist-credit"]?.[0]?.name}, ${best["primary-type"] || "no type"}, ${best["first-release-date"] || "no date"}, score ${best.score})`
        : "not in MusicBrainz",
    };
  }

  await sleep(RATE_LIMIT_MS);
  const releaseData = await musicbrainz("release", {
    "release-group": match.id,
    inc: "recordings+media",
    limit: 25,
  });
  const release = pickRelease(releaseData.releases || []);
  /* trackCount(), not a raw media flatMap: both must exclude video media or the
     two disagree. This line kept counting the DVD after the fix went in, so
     Colors Live stored 8 CD tracks plus 14 DVD ones as 22 while its runtime
     counted only the CD. The refresh path was right and the fetch path was not,
     which is the sort of split that survives a spot-check. */
  const tracks = trackCount(release);
  const lengths = trackLengths(release);

  if (!tracks || !lengths.length) {
    return { skipped: "matched, but no track lengths on any release" };
  }

  const totalMs = lengths.reduce((sum, value) => sum + value, 0);

  return {
    facts: {
      tracks,
      runtimeMinutes: Math.round(totalMs / 60000),
      longestMinutes: Math.round(Math.max(...lengths) / 60000),
      types: [
        match["primary-type"],
        ...(match["secondary-types"] || []),
      ].filter(Boolean),
      releaseTitle: release?.title || match.title,
      releaseYear: Number(String(match["first-release-date"]).slice(0, 4)),
      mbid: match.id,
    },
  };
}

/** Re-derive tracks/runtime/longest from a release group we already matched. */
async function refreshFacts(album, stored) {
  const releaseData = await musicbrainz("release", {
    "release-group": stored.mbid,
    inc: "recordings+media",
    limit: 25,
  });
  const release = pickRelease(releaseData.releases || []);
  const lengths = trackLengths(release);

  if (!lengths.length) {
    return { skipped: "no timed release on the stored release group" };
  }

  return {
    facts: {
      ...stored,
      releaseTitle: release?.title || stored.releaseTitle,
      tracks: trackCount(release),
      runtimeMinutes: Math.round(
        lengths.reduce((sum, value) => sum + value, 0) / 60000,
      ),
      longestMinutes: Math.round(Math.max(...lengths) / 60000),
    },
  };
}

const albums = JSON.parse(fs.readFileSync(albumsPath, "utf8"));
const existing = fs.existsSync(factsPath)
  ? JSON.parse(fs.readFileSync(factsPath, "utf8"))
  : {};

/* --refresh re-derives shape facts for albums already in the file, reusing the
   stored release-group id. That is one request instead of two: the match is
   already made and does not need re-litigating, only the release choice does.
   Written for the median-picker fix above, which changed which release counts
   without changing which album matched. */
const refresh = args.includes("--refresh");
/* --resume skips entries already carrying the current schema. A full refresh
   is well over an hour against MusicBrainz's rate limit, and losing the run at
   minute 50 should not mean redoing the first 124 albums. */
const resume = args.includes("--resume");

const queue = albums
  .filter((album) => !only || album.artist.toLowerCase().includes(only))
  .filter((album) => {
    const stored = existing[`${album.artist}::${album.title}`];
    if (!refresh) return !stored;
    if (!stored?.mbid) return false;
    return resume ? !stored.releaseTitle : true;
  })
  .slice(0, limit);

console.log(
  `${albums.length} albums in the catalog, ${Object.keys(existing).length} already have facts, ${queue.length} to fetch.\n`,
);

const skips = [];
let added = 0;

for (const [index, album] of queue.entries()) {
  const key = `${album.artist}::${album.title}`;
  const label = `${album.artist} — ${album.title}`;

  try {
    const result = refresh
      ? await refreshFacts(album, existing[key])
      : await fetchFacts(album);

    if (result.facts) {
      existing[key] = result.facts;
      added += 1;
      console.log(
        `[${index + 1}/${queue.length}] ${label}: ${result.facts.tracks} tracks, ${result.facts.runtimeMinutes} min, [${result.facts.types.join(", ")}]`,
      );
    } else {
      skips.push(`${label}: ${result.skipped}`);
      console.log(`[${index + 1}/${queue.length}] ${label}: skipped`);
    }
  } catch (error) {
    skips.push(`${label}: request failed (${error.message})`);
    console.log(`[${index + 1}/${queue.length}] ${label}: request failed`);
  }

  // Write as we go: a 400-album run that dies at 380 should keep its 380.
  fs.writeFileSync(factsPath, `${JSON.stringify(existing, null, 2)}\n`);
  await sleep(RATE_LIMIT_MS);
}

console.log(`\nAdded ${added}. Skipped ${skips.length}:`);
skips.forEach((skip) => console.log(`  - ${skip}`));
console.log(
  `\nlib/album-facts.json now covers ${Object.keys(existing).length}/${albums.length} albums.`,
);
console.log(
  "Read the diff before committing. The guards catch known failure shapes, not novelty.",
);
