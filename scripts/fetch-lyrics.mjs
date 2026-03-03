#!/usr/bin/env node
/**
 * Fetch lyrics for recognizable albums from Genius API.
 * Usage: GENIUS_ACCESS_TOKEN=xxx node scripts/fetch-lyrics.mjs
 *
 * Strategy: Search for "artist" to find their top songs, then try
 * multiple songs until we get good lyrics. Falls back to searching
 * "artist album_title" filtered to actual songs only.
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchGenius(query) {
  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Genius search failed: ${res.status}`);
  return (await res.json()).response.hits;
}

/** Filter search hits to actual songs with lyrics by the correct artist */
function filterSongHits(hits, artistName) {
  const artistLower = artistName.toLowerCase();
  // Build multiple matching tokens for the artist name
  const artistTokens = artistLower.split(/[\s&,]+/).filter((t) => t.length > 2);
  return hits.filter((h) => {
    const r = h.result;
    // Must be a song type
    if (h.type !== "song") return false;
    // Must have lyrics
    if (r.lyrics_state !== "complete") return false;
    // URL should end in -lyrics (actual song pages)
    if (!r.url.endsWith("-lyrics")) return false;
    // MUST match artist — check primary_artist and featured artists
    const hitArtist = (r.primary_artist?.name || "").toLowerCase();
    const hitFull = (r.full_title || "").toLowerCase();
    const artistMatch = artistTokens.some(
      (token) => hitArtist.includes(token) || hitFull.includes(token),
    );
    return artistMatch;
  });
}

async function fetchLyricsPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch lyrics page: ${res.status}`);
  const html = await res.text();

  // Extract lyrics from data-lyrics-container divs
  const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
  let lyricsText = "";
  let match;
  while ((match = containerRegex.exec(html)) !== null) {
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
        l.length > 15 &&
        l.length < 120 &&
        !l.startsWith("[") &&
        !l.match(/^\(/) &&
        !l.match(/^\d+\.\s/) &&
        !l.match(/\d+\s*Contributors/i) &&
        !l.match(/Lyrics$/i) &&
        !l.match(/^You might also like/) &&
        !l.match(/^See .* Live/) &&
        !l.match(/^Get tickets/) &&
        l.split(" ").length >= 3,
    );

  // Pick up to 8 varied lines (skip consecutive to get spread)
  const selected = [];
  const step = Math.max(2, Math.floor(lines.length / 8));
  for (let i = 0; i < lines.length && selected.length < 8; i += step) {
    selected.push(lines[i]);
  }
  return selected;
}

/** Try to fetch good lyrics from a single Genius song hit */
async function tryHit(hit) {
  const fullLyrics = await fetchLyricsPage(hit.result.url);
  return extractGoodLines(fullLyrics);
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

    // Strategy 1: search "artist album_title" and filter to songs
    let hits = await searchGenius(`${album.artist} ${album.title}`);
    let songHits = filterSongHits(hits, album.artist);
    await sleep(500);

    // Strategy 2: if no songs found, search just the artist name
    if (songHits.length === 0) {
      console.log(`  Trying artist-only search...`);
      hits = await searchGenius(album.artist);
      songHits = filterSongHits(hits, album.artist);
      await sleep(500);
    }

    if (songHits.length === 0) {
      console.log(`  ✗ No song results found`);
      failed++;
      continue;
    }

    // Try up to 3 song hits until we get good lines
    let gotLines = null;
    for (let i = 0; i < Math.min(3, songHits.length); i++) {
      const hit = songHits[i];
      console.log(`  Trying: ${hit.result.full_title}`);
      const lines = await tryHit(hit);
      if (lines.length >= 3) {
        gotLines = lines;
        console.log(`  ✓ Got ${lines.length} lines from ${hit.result.url}`);
        break;
      }
      console.log(`  … only ${lines.length} usable lines, trying next`);
      await sleep(500);
    }

    if (gotLines) {
      lyrics[key] = { lines: gotLines, source: "genius" };
      fetched++;
    } else {
      console.log(`  ✗ No song had enough usable lyrics`);
      failed++;
    }

    // Rate limiting
    await sleep(1000);
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    failed++;
  }

  // Save progress every 10 albums
  if ((fetched + failed + skipped) % 10 === 0) {
    fs.writeFileSync(LYRICS_PATH, JSON.stringify(lyrics, null, 2));
  }
}

// Final save
fs.writeFileSync(LYRICS_PATH, JSON.stringify(lyrics, null, 2));
console.log(
  `\nDone! Fetched: ${fetched}, Skipped: ${skipped}, Failed: ${failed}`,
);
console.log(`Total lyrics entries: ${Object.keys(lyrics).length}`);
