/**
 * Fetch verifiable shape facts for the catalog from MusicBrainz.
 *
 * Usage: node scripts/fetch-album-facts.mjs [--limit N] [--only "Artist"]
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
const MIN_SCORE = 90;
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

/* "Music for Airports" is filed as "Ambient 1: Music for Airports", and
   "Untitled Unmastered." loses its full stop. Containment either way accepts
   those; it will not accept two unrelated titles, because the artist and year
   checks run alongside it. */
function titlesAgree(catalogTitle, candidateTitle) {
  const left = normalize(catalogTitle);
  const right = normalize(candidateTitle);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
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

function trackLengths(release) {
  return (release?.media || [])
    .flatMap((medium) => medium.tracks || [])
    .map((track) => track.length || 0)
    .filter(Boolean);
}

/* The earliest official dated release is the record as it was released; later
   deluxe editions inflate both track count and runtime. But plenty of early
   pressings are catalogued without durations — Hounds of Love's 1985-09-16
   release lists all 12 tracks and times none of them — and an earlier version
   of this took that first release, found no lengths, and skipped an album that
   MusicBrainz knows perfectly well. Walk forward to the earliest release that
   was actually timed. */
function pickRelease(releases) {
  const official = releases
    .filter((release) => release.status === "Official" && release.date)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));

  return (
    official.find((release) => trackLengths(release).length) ||
    releases.find((release) => trackLengths(release).length) ||
    official[0] ||
    null
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
  const match =
    usable.find((candidate) => candidate["primary-type"] === "Album") ||
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
  const tracks = (release?.media || []).flatMap(
    (medium) => medium.tracks || [],
  );
  const lengths = trackLengths(release);

  if (!tracks.length || !lengths.length) {
    return { skipped: "matched, but no track lengths on any release" };
  }

  const totalMs = lengths.reduce((sum, value) => sum + value, 0);

  return {
    facts: {
      tracks: tracks.length,
      runtimeMinutes: Math.round(totalMs / 60000),
      longestMinutes: Math.round(Math.max(...lengths) / 60000),
      types: [
        match["primary-type"],
        ...(match["secondary-types"] || []),
      ].filter(Boolean),
      releaseYear: Number(String(match["first-release-date"]).slice(0, 4)),
      mbid: match.id,
    },
  };
}

const albums = JSON.parse(fs.readFileSync(albumsPath, "utf8"));
const existing = fs.existsSync(factsPath)
  ? JSON.parse(fs.readFileSync(factsPath, "utf8"))
  : {};

const queue = albums
  .filter((album) => !only || album.artist.toLowerCase().includes(only))
  .filter((album) => !existing[`${album.artist}::${album.title}`])
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
    const result = await fetchFacts(album);

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
