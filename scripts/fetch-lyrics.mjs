#!/usr/bin/env node
/**
 * Fetch lyrics for recognizable albums from Genius API.
 * Usage: GENIUS_ACCESS_TOKEN=xxx node scripts/fetch-lyrics.mjs
 *
 * Stores results in lib/lyrics.json.
 * Skips albums that already have lyrics data.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALBUMS_PATH = path.join(__dirname, "..", "lib", "albums.json");
const LYRICS_PATH = path.join(__dirname, "..", "lib", "lyrics.json");

const TOKEN = process.env.GENIUS_ACCESS_TOKEN;
if (!TOKEN) {
  console.error(
    "Missing GENIUS_ACCESS_TOKEN. Get one at https://genius.com/api-clients",
  );
  process.exit(1);
}

const albums = JSON.parse(fs.readFileSync(ALBUMS_PATH, "utf-8"));
let lyrics = {};
try {
  lyrics = JSON.parse(fs.readFileSync(LYRICS_PATH, "utf-8"));
} catch {
  lyrics = {};
}

const recognizable = albums.filter((a) => a.recognizable);
console.log(
  `Found ${recognizable.length} recognizable albums, ${Object.keys(lyrics).length} already have lyrics`,
);

async function searchGenius(query) {
  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Genius search failed: ${res.status}`);
  return (await res.json()).response.hits;
}

async function fetchLyricsPage(url) {
  // Genius lyrics are on the HTML page, need to scrape
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch lyrics page: ${res.status}`);
  const html = await res.text();

  // Extract lyrics from data-lyrics-container divs
  const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
  let lyricsText = "";
  let match;
  while ((match = containerRegex.exec(html)) !== null) {
    // Strip HTML tags, decode entities
    let chunk = match[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'");
    lyricsText += chunk + "\n";
  }
  return lyricsText.trim();
}

function extractGoodLines(lyricsText) {
  const lines = lyricsText
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 20 &&
        l.length < 100 &&
        !l.startsWith("[") &&
        !l.match(/^\(/) &&
        l.split(" ").length >= 4,
    );

  // Pick up to 8 varied lines (skip consecutive)
  const selected = [];
  for (let i = 0; i < lines.length && selected.length < 8; i += 2) {
    selected.push(lines[i]);
  }
  return selected;
}

let fetched = 0;
let skipped = 0;
let failed = 0;

for (const album of recognizable) {
  const key = `${album.artist} - ${album.title}`;
  if (lyrics[key]) {
    skipped++;
    continue;
  }

  try {
    console.log(`Searching: ${key}`);
    const hits = await searchGenius(`${album.artist} ${album.title}`);

    if (hits.length === 0) {
      console.log(`  No results found`);
      failed++;
      continue;
    }

    // Find best match — prefer matching artist
    const bestHit =
      hits.find((h) =>
        h.result.primary_artist.name
          .toLowerCase()
          .includes(album.artist.toLowerCase().split(" ")[0]),
      ) || hits[0];

    const lyricsUrl = bestHit.result.url;
    console.log(`  Fetching lyrics from: ${lyricsUrl}`);

    const fullLyrics = await fetchLyricsPage(lyricsUrl);
    const goodLines = extractGoodLines(fullLyrics);

    if (goodLines.length >= 3) {
      lyrics[key] = { lines: goodLines, source: "genius" };
      fetched++;
      console.log(`  ✓ Got ${goodLines.length} lines`);
    } else {
      console.log(`  ✗ Not enough usable lines (${goodLines.length})`);
      failed++;
    }

    // Rate limiting — be nice to Genius
    await new Promise((r) => setTimeout(r, 1500));
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    failed++;
  }

  // Save progress every 10 albums
  if ((fetched + failed) % 10 === 0) {
    fs.writeFileSync(LYRICS_PATH, JSON.stringify(lyrics, null, 2));
  }
}

// Final save
fs.writeFileSync(LYRICS_PATH, JSON.stringify(lyrics, null, 2));
console.log(
  `\nDone! Fetched: ${fetched}, Skipped: ${skipped}, Failed: ${failed}`,
);
console.log(`Total lyrics entries: ${Object.keys(lyrics).length}`);
