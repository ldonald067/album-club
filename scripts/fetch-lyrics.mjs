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

/**
 * The search endpoint ranks by popularity and carries no album field, so a
 * search for "<artist> <album>" happily returns the artist's biggest hit from
 * some other record. Only /songs/:id knows the album, so ask it.
 * Returns the album name, or null for singles and lookup failures.
 */
async function fetchSongAlbum(songId) {
  const res = await fetch(`https://api.genius.com/songs/${songId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return null;
  const song = (await res.json()).response?.song;
  return song?.album?.name ?? null;
}

/** Loose title match — tolerates "(Deluxe)", punctuation, and casing drift. */
function albumTitlesMatch(a, b) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\((deluxe|remaster(ed)?|expanded|anniversary)[^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

// Albums with no sung words. Genius will happily return *something* for these —
// a song that name-checks the artist, or an unrelated track — so they have to be
// excluded by name. Every entry here was previously imported wrong.
const NO_LYRICS = new Set([
  "Miles Davis - Kind of Blue",
  "John Coltrane - A Love Supreme",
  "Brian Eno - Music for Airports",
  "DJ Shadow - Endtroducing.....",
]);

// Genius hosts fan translations as their own pages; they match the artist and
// end in -lyrics like any other, and produce entries in the wrong language.
const TRANSLATION_URL =
  /traduccion|traducciones|traduzione|traducao|ubersetzung|ubersetzungen|перевод|translation/i;

// Liner-note and credits pages masquerading as lyrics.
const CREDITS_LINE =
  /written by|performed by|produced by|mixed by|engineered by|photo:|\(BMI\)|\(ASCAP\)|c\/o |courtesy of|under (?:exclusive )?licen[cs]e/i;

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
    // Reject translation pages — they pass every other check
    if (
      TRANSLATION_URL.test(r.url) ||
      TRANSLATION_URL.test(r.full_title || "")
    ) {
      return false;
    }
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
        !CREDITS_LINE.test(l) &&
        // The game blanks words longer than 3 characters; a line with fewer
        // than two of them can't produce a two-blank puzzle.
        l.split(" ").filter((w) => w.replace(/[^a-zA-Z]/g, "").length > 3)
          .length >= 2 &&
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
  if (NO_LYRICS.has(key)) {
    skipped++;
    continue;
  }

  try {
    console.log(`Searching: ${key}`);

    // Strategy 1: search "artist album_title" and filter to songs
    let hits = await searchGenius(`${album.artist} ${album.title}`);
    let songHits = filterSongHits(hits, album.artist);
    await sleep(500);

    // No artist-only fallback. Searching the bare artist name returns their
    // most popular song by definition, which is how four different Kendrick
    // albums once ended up filed under "Not Like Us". A miss is fine; a
    // confidently wrong entry is not.

    if (songHits.length === 0) {
      console.log(`  ✗ No song results found`);
      failed++;
      continue;
    }

    // Try up to 5 song hits until one is genuinely from this album
    let gotLines = null;
    for (let i = 0; i < Math.min(5, songHits.length); i++) {
      const hit = songHits[i];
      console.log(`  Trying: ${hit.result.full_title}`);

      // Verify album membership before spending a lyrics fetch on it
      const songAlbum = await fetchSongAlbum(hit.result.id);
      await sleep(400);
      if (!albumTitlesMatch(songAlbum, album.title)) {
        console.log(
          `    ↳ skip — Genius files this under ${songAlbum ? `"${songAlbum}"` : "no album (single)"}`,
        );
        continue;
      }

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
