import fs from "node:fs";
import path from "node:path";
import { getTodayKey } from "../lib/albums.js";
import { getFeaturedAlbum } from "../lib/daily-picks.js";
import { SOUNDTRACK_PROFILES } from "../lib/soundtrack-corner-data.js";

const rootDir = process.cwd();
const albumsPath = path.join(rootDir, "lib", "albums.json");
const factsPath = path.join(rootDir, "lib", "album-facts.json");
const soundtrackDataPath = path.join(
  rootDir,
  "lib",
  "soundtrack-corner-data.js",
);

const PRIORITY_KEYS = [
  "Radiohead::OK Computer",
  "Fleetwood Mac::Rumours",
  "Prince::Purple Rain",
  "Lauryn Hill::The Miseducation of Lauryn Hill",
  "Nas::Illmatic",
  "Portishead::Dummy",
  "Mitski::Be the Cowboy",
  "Radiohead::Kid A",
  "My Bloody Valentine::Loveless",
  "Massive Attack::Mezzanine",
  "Björk::Homogenic",
  "The Cure::Disintegration",
  "Aphex Twin::Selected Ambient Works 85-92",
  "OutKast::Aquemini",
  "Cocteau Twins::Heaven or Las Vegas",
  "Slowdive::Souvlaki",
  "Sufjan Stevens::Illinois",
  "The Smiths::The Queen Is Dead",
  "DJ Shadow::Endtroducing.....",
  "Madvillain::Madvillainy",
  "Kendrick Lamar::To Pimp a Butterfly",
  "Neutral Milk Hotel::In the Aeroplane Over the Sea",
  "Björk::Vespertine",
  "Nirvana::Nevermind",
  "Joni Mitchell::Blue",
  "Sonic Youth::Daydream Nation",
  "Pixies::Doolittle",
  "The Avalanches::Since I Left You",
  "Joy Division::Unknown Pleasures",
  "Talking Heads::Remain in Light",
];

// Refreshed whenever the previous queue is fully covered. Since 2026-07
// the queue follows the "Coming up in rotation" air-date sort below, so
// writing effort lands on albums visitors will see soonest.
const EDITORIAL_QUEUE_KEYS = [
  "A Tribe Called Quest::Midnight Marauders",
  "Chappell Roan::The Rise and Fall of a Midwest Princess",
  "Buena Vista Social Club::Buena Vista Social Club",
  "Clipse::Let God Sort Em Out",
  "Beyoncé::Renaissance",
  "Jay-Z::The Blueprint",
  "Brian Eno::Music for Airports",
  "Bon Iver::For Emma, Forever Ago",
  "Gorillaz::Plastic Beach",
  "Weyes Blood::Titanic Rising",
  "Tyler, the Creator::Chromakopia",
  "Kendrick Lamar::DAMN.",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOverrideKeys(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  return new Set(
    [...source.matchAll(/^  "([^"]+::[^"]+)": \{/gm)].map((match) => match[1]),
  );
}

function getKey(album) {
  return `${album.artist}::${album.title}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function getDecadeLabel(year) {
  return `${Math.floor(year / 10) * 10}s`;
}

const albums = readJson(albumsPath);
const overrideKeys = readOverrideKeys(soundtrackDataPath);
const albumByKey = new Map(albums.map((album) => [getKey(album), album]));
const recognizableAlbums = albums.filter((album) => album.recognizable);
const coveredAlbums = albums.filter((album) => overrideKeys.has(getKey(album)));
const coveredRecognizableAlbums = recognizableAlbums.filter((album) =>
  overrideKeys.has(getKey(album)),
);
const coveredPriority = PRIORITY_KEYS.filter((key) => overrideKeys.has(key));
const uncoveredPriorityAlbums = PRIORITY_KEYS.filter(
  (key) => !overrideKeys.has(key),
)
  .map((key) => albumByKey.get(key))
  .filter(Boolean);
const uncoveredEditorialAlbums = EDITORIAL_QUEUE_KEYS.filter(
  (key) => !overrideKeys.has(key),
)
  .map((key) => albumByKey.get(key))
  .filter(Boolean);

const decadeCoverage = coveredAlbums.reduce((accumulator, album) => {
  const decade = getDecadeLabel(album.year);
  accumulator[decade] = (accumulator[decade] || 0) + 1;
  return accumulator;
}, {});

console.log("Soundtrack Corner coverage");
console.log("--------------------------");
console.log(
  `Curated overrides: ${coveredAlbums.length}/${albums.length} (${formatPercent(
    coveredAlbums.length / albums.length,
  )})`,
);
console.log(
  `Recognizable-album coverage: ${coveredRecognizableAlbums.length}/${recognizableAlbums.length} (${formatPercent(
    coveredRecognizableAlbums.length / recognizableAlbums.length,
  )})`,
);
console.log(
  `Priority queue coverage: ${coveredPriority.length}/${PRIORITY_KEYS.length} (${formatPercent(
    coveredPriority.length / PRIORITY_KEYS.length,
  )})`,
);
console.log("");
console.log("Covered by decade:");

for (const [decade, count] of Object.entries(decadeCoverage).sort()) {
  console.log(`- ${decade}: ${count}`);
}

/* Albums with no curated override AND no matching genre profile read the
   blandest — the generator falls back to DEFAULT_PROFILE. New profiles
   fix dozens at once; keep this list visible. */
const defaultProfileAlbums = albums.filter(
  (album) =>
    !overrideKeys.has(getKey(album)) &&
    !SOUNDTRACK_PROFILES.some((profile) => profile.match.test(album.genre)),
);
const defaultGenreCounts = defaultProfileAlbums.reduce((accumulator, album) => {
  accumulator[album.genre] = (accumulator[album.genre] || 0) + 1;
  return accumulator;
}, {});
console.log("");
console.log(
  `Generator floor: ${defaultProfileAlbums.length}/${albums.length} albums fall to DEFAULT_PROFILE (no override, no genre profile)`,
);
for (const [genre, count] of Object.entries(defaultGenreCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)) {
  console.log(`- ${genre}: ${count}`);
}

/* Sourced facts are the generator's only album-specific input, so their
   coverage belongs next to override coverage rather than in prose anywhere. */
const albumFacts = fs.existsSync(factsPath)
  ? JSON.parse(fs.readFileSync(factsPath, "utf8"))
  : {};
const factKeys = new Set(Object.keys(albumFacts));
const generatedAlbums = albums.filter(
  (album) => !overrideKeys.has(`${album.artist}::${album.title}`),
);
const generatedWithFacts = generatedAlbums.filter((album) =>
  factKeys.has(`${album.artist}::${album.title}`),
);
console.log("");
console.log(
  `Sourced facts: ${factKeys.size}/${albums.length} albums (${((factKeys.size / albums.length) * 100).toFixed(1)}%)`,
);
console.log(
  `- reaching a generated corner: ${generatedWithFacts.length}/${generatedAlbums.length} (curated albums ignore them)`,
);
console.log(
  "- run `npm run fetch-album-facts` to fill gaps; it resumes and skips what it has",
);

if (uncoveredPriorityAlbums.length > 0 || uncoveredEditorialAlbums.length > 0) {
  console.log("");
  console.log("Next editorial candidates:");

  const candidates =
    uncoveredPriorityAlbums.length > 0
      ? uncoveredPriorityAlbums
      : uncoveredEditorialAlbums;

  for (const album of candidates.slice(0, 8)) {
    console.log(
      `- ${album.artist} - ${album.title} (${album.year}, ${album.genre})`,
    );
  }
}

/* ── Rotation schedule: which uncovered albums air soonest ──
   Read from lib/daily-picks.js, the same lookup the pages use (the pinned
   schedule, then the yearly shuffle), so this cannot drift from what a
   visitor is shown. Every album is in the daily rotation, not only the
   `recognizable` ones, which is a games flag: filtering on it once showed
   two albums left while most days aired a generated corner. */

const shiftKey = (key, days) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

const todayKey = getTodayKey();
const firstAirDate = new Map();
const generatedDays = { 30: 0, 365: 0 };
// Two-year horizon covers a full rotation cycle plus the year boundary
for (let offset = 0; offset < 800; offset++) {
  const date = shiftKey(todayKey, offset);
  const key = getKey(getFeaturedAlbum(date));
  if (overrideKeys.has(key)) continue;
  if (offset < 30) generatedDays[30]++;
  if (offset < 365) generatedDays[365]++;
  if (!firstAirDate.has(key)) firstAirDate.set(key, { days: offset, date });
}

const uncoveredByAirDate = [...firstAirDate].map(([key, next]) => ({
  album: albumByKey.get(key),
  next,
}));

console.log("");
console.log(
  `Generated corners on air: ${generatedDays[30]} of the next 30 days, ${generatedDays[365]} of the next 365`,
);
console.log("");
console.log("Coming up in rotation (uncovered):");
for (const { album, next } of uncoveredByAirDate.slice(0, 15)) {
  const when =
    next.days === 0
      ? "today"
      : next.days === 1
        ? "tomorrow"
        : `in ${next.days} days`;
  console.log(
    `- ${next.date} (${when}): ${album.artist} - ${album.title} (${album.year}, ${album.genre})`,
  );
}
