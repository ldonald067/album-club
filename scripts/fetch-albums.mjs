/**
 * Last.fm Album Fetcher — Developer tool to grow the album list
 *
 * Usage: LASTFM_API_KEY=your_key node scripts/fetch-albums.mjs
 *
 * Fetches top albums across genre tags from Last.fm, maps them to the
 * required format, merges with existing albums, and writes to lib/albums.json.
 *
 * Get a free API key at: https://www.last.fm/api/account/create
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALBUMS_PATH = path.join(__dirname, "..", "lib", "albums.json");
const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

if (!API_KEY) {
  console.error("Missing LASTFM_API_KEY environment variable.");
  console.error("Get a free key at: https://www.last.fm/api/account/create");
  console.error("Usage: LASTFM_API_KEY=your_key node scripts/fetch-albums.mjs");
  process.exit(1);
}

const GENRE_TAGS = [
  "rock",
  "hip-hop",
  "electronic",
  "jazz",
  "pop",
  "rnb",
  "metal",
  "folk",
  "indie",
  "punk",
  "country",
  "ambient",
  "soul",
  "classical",
  "reggae",
  "blues",
  "latin",
  "shoegaze",
  "post-punk",
  "lo-fi",
];

const GENRE_EMOJI = {
  "hip-hop": "🎤",
  rap: "🎤",
  electronic: "🎛️",
  edm: "🎛️",
  techno: "🎛️",
  house: "🎛️",
  jazz: "🎷",
  bebop: "🎷",
  rock: "🎸",
  alternative: "🎸",
  "indie rock": "🎸",
  pop: "🎵",
  "synth-pop": "🎹",
  "r&b": "🎙️",
  rnb: "🎙️",
  soul: "🎙️",
  funk: "🎙️",
  metal: "🤘",
  "heavy metal": "🤘",
  folk: "🪕",
  "indie folk": "🍂",
  country: "🤠",
  classical: "🎻",
  ambient: "🌌",
  "lo-fi": "📚",
  lofi: "📚",
  punk: "⚡",
  "post-punk": "⚡",
  reggae: "🌴",
  blues: "🎺",
  shoegaze: "🎸",
  latin: "💃",
  world: "🌍",
};

const GENRE_COLOR = {
  "hip-hop": "#2c1810",
  rap: "#2c1810",
  electronic: "#1a1a2e",
  techno: "#0a0a1a",
  jazz: "#4a3520",
  bebop: "#4a3520",
  rock: "#2c3e50",
  alternative: "#34495e",
  pop: "#6a1b4d",
  "synth-pop": "#4a1a6b",
  "r&b": "#3d1f00",
  rnb: "#3d1f00",
  soul: "#5c3d2e",
  metal: "#1a1a1a",
  folk: "#2e4a1a",
  country: "#5c4a2e",
  classical: "#1b2631",
  ambient: "#0d1b2a",
  "lo-fi": "#4a3520",
  lofi: "#4a3520",
  punk: "#8b1a1a",
  "post-punk": "#2c3e50",
  reggae: "#1a472a",
  blues: "#1b3a5c",
  shoegaze: "#8b1a4a",
  latin: "#5c3d2e",
  world: "#3d2b1f",
};

function getEmoji(genre) {
  const g = genre.toLowerCase();
  for (const [key, emoji] of Object.entries(GENRE_EMOJI)) {
    if (g.includes(key)) return emoji;
  }
  return "💿";
}

function getColor(genre) {
  const g = genre.toLowerCase();
  for (const [key, color] of Object.entries(GENRE_COLOR)) {
    if (g.includes(key)) return color;
  }
  return "#2c3e50";
}

async function fetchJson(params) {
  const url = new URL(BASE_URL);
  url.search = new URLSearchParams({
    ...params,
    api_key: API_KEY,
    format: "json",
  }).toString();

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "AlbumOfTheDayClub/1.0" },
  });

  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);
  return res.json();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getTopAlbumsByTag(tag, limit = 30) {
  try {
    const data = await fetchJson({
      method: "tag.gettopalbums",
      tag,
      limit: String(limit),
    });
    return data?.albums?.album || [];
  } catch (e) {
    console.error(`  Failed to fetch tag "${tag}":`, e.message);
    return [];
  }
}

async function getAlbumInfo(artist, album) {
  try {
    const data = await fetchJson({
      method: "album.getinfo",
      artist,
      album,
    });
    return data?.album || null;
  } catch {
    return null;
  }
}

async function main() {
  // Load existing albums
  let existing = [];
  if (fs.existsSync(ALBUMS_PATH)) {
    existing = JSON.parse(fs.readFileSync(ALBUMS_PATH, "utf8"));
  }

  const existingKeys = new Set(
    existing.map((a) => `${a.artist.toLowerCase()}|${a.title.toLowerCase()}`),
  );

  console.log(`Existing albums: ${existing.length}`);
  console.log(`Fetching from ${GENRE_TAGS.length} genre tags...\n`);

  const newAlbums = [];

  for (const tag of GENRE_TAGS) {
    console.log(`Fetching tag: ${tag}...`);
    const albums = await getTopAlbumsByTag(tag, 25);
    await sleep(200);

    for (const album of albums) {
      const key = `${album.artist.name.toLowerCase()}|${album.name.toLowerCase()}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      // Get additional info (year, tags)
      const info = await getAlbumInfo(album.artist.name, album.name);
      await sleep(200);

      const year = info?.wiki?.published
        ? parseInt(info.wiki.published.split(",").pop()?.trim()) || 0
        : 0;

      const topTag = info?.tags?.tag?.[0]?.name || tag;
      const imageUrl = info?.image?.[info.image.length - 1]?.["#text"] || null;

      const entry = {
        title: album.name,
        artist: album.artist.name,
        year: year,
        genre: topTag.charAt(0).toUpperCase() + topTag.slice(1),
        cover: getEmoji(topTag),
        color: getColor(topTag),
        recognizable: false,
        image: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      };

      newAlbums.push(entry);
      process.stdout.write(`  + ${entry.artist} — ${entry.title}\n`);
    }

    console.log(
      `  Found ${albums.length} albums, ${newAlbums.length} new total\n`,
    );
  }

  // Merge: existing (curated) entries first, then new
  const merged = [...existing, ...newAlbums];

  // Flag albums with missing years
  const missingYears = merged.filter((a) => !a.year || a.year === 0);
  if (missingYears.length > 0) {
    console.log(`\nWarning: ${missingYears.length} albums have missing years:`);
    missingYears
      .slice(0, 10)
      .forEach((a) => console.log(`  - ${a.artist} — ${a.title}`));
    if (missingYears.length > 10)
      console.log(`  ...and ${missingYears.length - 10} more`);
  }

  fs.writeFileSync(ALBUMS_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(
    `\nDone! Total albums: ${merged.length} (${newAlbums.length} new)`,
  );
  console.log(`Written to: ${ALBUMS_PATH}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
