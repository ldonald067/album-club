#!/usr/bin/env node
/**
 * Fetch lyrics for recognizable albums from Genius API.
 * Usage: GENIUS_ACCESS_TOKEN=xxx node scripts/fetch-lyrics.mjs
 *
 * Strategy, in order:
 *   1. Ask MusicBrainz (free, no key) for the album's real tracklist, then look
 *      up those exact songs on Genius. A track MusicBrainz places on the album
 *      is on the album, so a title+artist match needs no further verification.
 *   2. Fall back to searching "artist album_title", accepting a hit only if
 *      Genius's own /songs/:id agrees on the album name.
 *
 * There is deliberately NO artist-only search: Genius ranks by popularity, so
 * that returns the artist's biggest hit regardless of album. It once filed one
 * song under four different Kendrick records.
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

/**
 * Ask MusicBrainz which songs are actually on this album. Free, no key.
 * This is what makes high coverage possible: Genius's own album metadata is
 * unreliable and its search ranks by popularity, but if MusicBrainz says a track
 * is on the record, then finding that exact track on Genius yields lyrics that
 * are by definition from that record.
 * Returns [] when the album isn't found — callers fall back to album search.
 */
async function fetchTracklist(artist, albumTitle) {
  const headers = { "User-Agent": "AlbumOfTheDayClub/1.0" };
  const query = encodeURIComponent(
    `release:"${albumTitle}" AND artist:"${artist}"`,
  );
  try {
    const searchRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=1`,
      { headers },
    );
    if (!searchRes.ok) return [];
    const release = (await searchRes.json()).releases?.[0];
    if (!release?.id) return [];
    await sleep(1100); // MusicBrainz asks for <=1 request/second
    const fullRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings&fmt=json`,
      { headers },
    );
    if (!fullRes.ok) return [];
    const media = (await fullRes.json()).media || [];
    return media
      .flatMap((disc) => (disc.tracks || []).map((t) => t.title))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Strict-ish song title match, so we don't accept a differently-named song. */
function songTitlesMatch(a, b) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\((feat|ft|with|remix|live|demo)[^)]*\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && x === y;
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

// Tokens that identify nobody. "The Beatles" used to tokenise to ["the",
// "beatles"], and since a hit matched if ANY token appeared anywhere in its
// title, "the" waved through virtually every result on the page.
const ARTIST_STOP_WORDS = new Set([
  "the",
  "and",
  "feat",
  "featuring",
  "with",
  "band",
  "his",
  "her",
  "their",
]);

/** Filter search hits to actual songs with lyrics by the correct artist */
function filterSongHits(hits, artistName) {
  const artistLower = artistName.toLowerCase();
  // Build multiple matching tokens for the artist name
  const allTokens = artistLower.split(/[\s&,]+/).filter((t) => t.length > 2);
  const distinctive = allTokens.filter((t) => !ARTIST_STOP_WORDS.has(t));
  // If an artist is nothing but stop words, match the whole name instead of
  // giving up and accepting anything.
  const artistTokens = distinctive.length ? distinctive : [artistLower];
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

  // Pick up to 8 varied lines (skip consecutive to get spread). Deduplicate:
  // the game picks one line per airing, so storing a repeated chorus line eight
  // times just means the same puzzle every time. Real songs repeat far more
  // than the wrong-album results we used to get, so this only started to matter
  // once album verification began returning the right song.
  const seen = new Set();
  const selected = [];
  const step = Math.max(2, Math.floor(lines.length / 8));
  for (let i = 0; i < lines.length && selected.length < 8; i += step) {
    const line = lines[i];
    if (seen.has(line)) continue;
    seen.add(line);
    selected.push(line);
  }
  // Backfill from any remaining unseen lines if the stride landed on repeats
  for (const line of lines) {
    if (selected.length >= 8) break;
    if (seen.has(line)) continue;
    seen.add(line);
    selected.push(line);
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

    // Strategy 1 (primary): ask MusicBrainz what's on the record, then look up
    // those exact songs. A track named by MusicBrainz IS on the album, so a
    // title+artist match on Genius needs no further album verification — which
    // matters because Genius's album field is missing or wrong for a lot of the
    // catalog, and that was the ceiling on coverage.
    let gotLines = null;
    let matchedVia = null;
    const tracklist = await fetchTracklist(album.artist, album.title);
    await sleep(1100);
    if (tracklist.length) {
      console.log(`  MusicBrainz: ${tracklist.length} tracks`);
      // Skip intros/interludes/skits — usually spoken or instrumental
      const candidates = tracklist.filter(
        (t) => !/^(intro|outro|interlude|skit|prelude|reprise)\b/i.test(t),
      );
      for (const track of candidates.slice(0, 6)) {
        const trackHits = filterSongHits(
          await searchGenius(`${album.artist} ${track}`),
          album.artist,
        );
        await sleep(500);
        const exact = trackHits.find((h) =>
          songTitlesMatch(h.result.title, track),
        );
        if (!exact) continue;
        console.log(`  Trying track: ${exact.result.full_title}`);
        const lines = await tryHit(exact);
        if (lines.length >= 3) {
          gotLines = lines;
          matchedVia = `track "${track}"`;
          break;
        }
        await sleep(300);
      }
    }

    if (gotLines) {
      lyrics[key] = { lines: gotLines, source: "genius" };
      console.log(`  ✓ ${gotLines.length} lines via ${matchedVia}`);
      fetched++;
      await sleep(500);
      continue;
    }

    // Strategy 2 (fallback): search "artist album_title" and verify the album
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
