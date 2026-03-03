#!/usr/bin/env node
/**
 * Fetch YouTube video IDs for recognizable albums.
 * Usage: YOUTUBE_API_KEY=xxx node scripts/fetch-youtube-ids.mjs
 *
 * Stores youtubeId field in lib/albums.json.
 * Skips albums that already have a youtubeId.
 *
 * Free tier: 10,000 units/day. Search costs 100 units = 100 searches/day.
 * For ~124 recognizable albums, run across 2 days.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALBUMS_PATH = path.join(__dirname, "..", "lib", "albums.json");

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error(
    "Missing YOUTUBE_API_KEY. Get one at https://console.cloud.google.com",
  );
  process.exit(1);
}

const albums = JSON.parse(fs.readFileSync(ALBUMS_PATH, "utf-8"));
const recognizable = albums.filter((a) => a.recognizable && !a.youtubeId);
console.log(
  `Found ${recognizable.length} recognizable albums without YouTube IDs`,
);

async function searchYouTube(query) {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "1",
    key: API_KEY,
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube search failed: ${res.status} — ${body}`);
  }
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    return data.items[0].id.videoId;
  }
  return null;
}

let fetched = 0;
let failed = 0;
const MAX_PER_RUN = 95; // Stay under 100 to be safe with daily quota

for (const album of recognizable) {
  if (fetched >= MAX_PER_RUN) {
    console.log(`\nReached daily limit (${MAX_PER_RUN}). Run again tomorrow.`);
    break;
  }

  const query = `${album.artist} ${album.title} official audio`;
  console.log(`Searching: ${query}`);

  try {
    const videoId = await searchYouTube(query);
    if (videoId) {
      // Find this album in the full array and set youtubeId
      const idx = albums.findIndex(
        (a) => a.title === album.title && a.artist === album.artist,
      );
      if (idx >= 0) {
        albums[idx].youtubeId = videoId;
        fetched++;
        console.log(`  ✓ ${videoId}`);
      }
    } else {
      console.log(`  ✗ No results`);
      failed++;
    }

    // Rate limiting — 1 search per second
    await new Promise((r) => setTimeout(r, 1000));
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    failed++;
    // If quota exceeded, stop
    if (err.message.includes("403")) {
      console.log("\nQuota exceeded. Run again tomorrow.");
      break;
    }
  }

  // Save progress every 10 albums
  if ((fetched + failed) % 10 === 0) {
    fs.writeFileSync(ALBUMS_PATH, JSON.stringify(albums, null, 2));
  }
}

// Final save
fs.writeFileSync(ALBUMS_PATH, JSON.stringify(albums, null, 2));
console.log(`\nDone! Fetched: ${fetched}, Failed: ${failed}`);
console.log(
  `Total albums with YouTube IDs: ${albums.filter((a) => a.youtubeId).length}`,
);
