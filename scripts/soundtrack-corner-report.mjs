import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const albumsPath = path.join(rootDir, "lib", "albums.json");
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
   Keep the PRNG/shuffle in sync with lib/albums.js (mulberry32 +
   Fisher-Yates seeded by UTC year). Writing effort should land on
   albums visitors will actually see in the next few weeks. */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const permutationCache = new Map();
function seededPermutation(length, seed) {
  const cacheKey = `${length}:${seed}`;
  if (permutationCache.has(cacheKey)) return permutationCache.get(cacheKey);
  const rand = mulberry32(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  permutationCache.set(cacheKey, indices);
  return indices;
}

function daysUntilFeatured(albumIndex, catalogLength) {
  const now = Date.now();
  // Two-year horizon covers a full rotation cycle plus the year boundary
  for (let offset = 0; offset < 800; offset++) {
    const d = new Date(now + offset * 86400000);
    const year = d.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((d.getTime() - start) / 86400000);
    const order = seededPermutation(catalogLength, year);
    if (order[dayOfYear % catalogLength] === albumIndex) {
      return { days: offset, date: d.toISOString().slice(0, 10) };
    }
  }
  return null;
}

const uncoveredRecognizable = albums
  .map((album, index) => ({ album, index }))
  .filter(({ album }) => album.recognizable && !overrideKeys.has(getKey(album)))
  .map(({ album, index }) => ({
    album,
    next: daysUntilFeatured(index, albums.length),
  }))
  .filter(({ next }) => next)
  .sort((a, b) => a.next.days - b.next.days);

console.log("");
console.log("Coming up in rotation (uncovered recognizable):");
for (const { album, next } of uncoveredRecognizable.slice(0, 15)) {
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
