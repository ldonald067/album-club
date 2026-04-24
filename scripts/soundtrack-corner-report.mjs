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

if (uncoveredPriorityAlbums.length > 0) {
  console.log("");
  console.log("Next editorial candidates:");

  for (const album of uncoveredPriorityAlbums.slice(0, 8)) {
    console.log(`- ${album.artist} - ${album.title} (${album.year}, ${album.genre})`);
  }
}
