/**
 * Album Cover Art Fetcher — Backfill cover art for existing albums
 *
 * Usage: LASTFM_API_KEY=your_key node scripts/fetch-covers.mjs
 *
 * Tries Last.fm first (fast, 200ms delay), falls back to iTunes Search API
 * (3s delay due to stricter rate limits). Saves progress every 20 albums.
 *
 * Get a free API key at: https://www.last.fm/api/account/create
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALBUMS_PATH = path.join(__dirname, "..", "lib", "albums.json");
const API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";
const ITUNES_BASE = "https://itunes.apple.com/search";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLastfmImage(artist, album) {
  if (!API_KEY) return null;
  try {
    const params = new URLSearchParams({
      method: "album.getinfo",
      artist,
      album,
      api_key: API_KEY,
      format: "json",
    });
    const res = await fetch(`${LASTFM_BASE}?${params}`, {
      headers: { "User-Agent": "AlbumOfTheDayClub/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const images = data?.album?.image;
    if (!images || images.length === 0) return null;
    // Get the largest image (last in array)
    const url = images[images.length - 1]?.["#text"];
    return url && url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

async function getItunesImage(artist, album) {
  try {
    const term = encodeURIComponent(`${artist} ${album}`);
    const res = await fetch(
      `${ITUNES_BASE}?term=${term}&media=music&entity=album&limit=25`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    /* The first result used to be taken on trust, and it was often someone
       else's record: Tropicália wore a cumbia mix, billy woods wore Yo-Yo Ma,
       a Korean R&B playlist wore The Nightmare Before Christmas (2026-10-22).
       Only a result by this artist under this title counts; edition suffixes
       in brackets are ignored. No match means no cover, never a guess. */
    const want = norm(artist);
    const match = data.results.find((r) => {
      if (/ - Single$/.test(r.collectionName)) return false;
      const by = norm(r.artistName);
      if (!by || !want || !(by.includes(want) || want.includes(by)))
        return false;
      const title = r.collectionName
        .replace(/\s*[([].*$/, "")
        .replace(/ - EP$/, "");
      return norm(title) === norm(album);
    });
    const artwork = match?.artworkUrl100;
    if (!artwork) return null;
    return artwork.replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}

async function main() {
  const albums = JSON.parse(fs.readFileSync(ALBUMS_PATH, "utf8"));

  const needsImage = albums.filter(
    (a) => a.image === undefined || a.image === null,
  );
  console.log(`Total albums: ${albums.length}`);
  console.log(`Already have images: ${albums.length - needsImage.length}`);
  console.log(`Need images: ${needsImage.length}\n`);

  if (needsImage.length === 0) {
    console.log("All albums already have images. Nothing to do.");
    return;
  }

  if (!API_KEY) {
    console.log(
      "No LASTFM_API_KEY set — will use iTunes only (slower, 3s per album).",
    );
    console.log("Set LASTFM_API_KEY for faster fetching (200ms per album).\n");
  }

  let updated = 0;
  let failed = 0;
  let processed = 0;

  for (let i = 0; i < albums.length; i++) {
    if (albums[i].image !== undefined && albums[i].image !== null) continue;

    processed++;
    let imageUrl = null;

    // Try Last.fm first (fast)
    if (API_KEY) {
      imageUrl = await getLastfmImage(albums[i].artist, albums[i].title);
      await sleep(200);
    }

    // Fall back to iTunes
    if (!imageUrl) {
      imageUrl = await getItunesImage(albums[i].artist, albums[i].title);
      await sleep(3000);
    }

    if (imageUrl) {
      albums[i].image = imageUrl;
      updated++;
      console.log(
        `[${processed}/${needsImage.length}] ✓ ${albums[i].artist} — ${albums[i].title}`,
      );
    } else {
      albums[i].image = null;
      failed++;
      console.log(
        `[${processed}/${needsImage.length}] ✗ ${albums[i].artist} — ${albums[i].title} (no image)`,
      );
    }

    // Save progress every 20 albums
    if (processed % 20 === 0) {
      fs.writeFileSync(ALBUMS_PATH, JSON.stringify(albums, null, 2) + "\n");
      console.log(`  (saved progress: ${processed}/${needsImage.length})\n`);
    }
  }

  fs.writeFileSync(ALBUMS_PATH, JSON.stringify(albums, null, 2) + "\n");
  console.log(`\nDone! Updated: ${updated}, No image found: ${failed}`);
  console.log(`Written to: ${ALBUMS_PATH}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
