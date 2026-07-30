import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALBUMS,
  getGameType,
  getAlbumForDate,
  getTodayAlbum,
  getTodayKey,
  getPuzzleKey,
  getPuzzleAlbum,
  getVersusPair,
  getTastePair,
  pickRotatingPoolAlbum,
} from "../lib/albums.js";

const GAME_TYPES = ["guess", "cover", "lyric", "heardle", "scramble"];
const utc = (s) => new Date(`${s}T12:00:00Z`);

test("catalog is non-empty and every entry has the core shape", () => {
  assert.ok(ALBUMS.length > 100);
  for (const a of ALBUMS) {
    assert.equal(typeof a.title, "string");
    assert.equal(typeof a.artist, "string");
    assert.equal(typeof a.year, "number");
    assert.equal(typeof a.genre, "string");
  }
});

test("getGameType runs a deterministic 5-day cycle in UTC", () => {
  // Same UTC calendar day → same game, regardless of time of day.
  assert.equal(
    getGameType(utc("2026-06-15")),
    getGameType(new Date("2026-06-15T23:59:59Z")),
  );
  // Every result is one of the five game types.
  for (let d = 1; d <= 40; d++) {
    const date = new Date(Date.UTC(2026, 0, d));
    assert.ok(GAME_TYPES.includes(getGameType(date)), `day ${d}`);
  }
  // Consecutive UTC days advance one step through the cycle and it wraps.
  const seq = [];
  for (let d = 0; d < 10; d++)
    seq.push(getGameType(new Date(Date.UTC(2026, 5, 10 + d))));
  for (let i = 1; i < seq.length; i++) {
    const prev = GAME_TYPES.indexOf(seq[i - 1]);
    assert.equal(seq[i], GAME_TYPES[(prev + 1) % 5], `step ${i}`);
  }
});

test("getAlbumForDate is UTC-deterministic and stable", () => {
  const a = getAlbumForDate(new Date("2026-03-09T00:00:01Z"));
  const b = getAlbumForDate(new Date("2026-03-09T23:59:59Z"));
  assert.equal(a.title, b.title, "same UTC day → same album");
  assert.equal(a.artist, b.artist);
  assert.equal(a.key, "2026-03-09");
  // Re-deriving the same date always gives the same album.
  assert.equal(getAlbumForDate(utc("2026-03-09")).title, a.title);
});

test("daily rotation does not repeat within a calendar year", () => {
  const seen = new Set();
  let repeats = 0;
  for (let d = 1; d <= 365; d++) {
    const t = getAlbumForDate(new Date(Date.UTC(2026, 0, d))).title;
    if (seen.has(t)) repeats++;
    seen.add(t);
  }
  assert.equal(repeats, 0, "no album should repeat within one year");
});

test("today keys are well-formed", () => {
  assert.match(getTodayKey(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(getPuzzleKey(), `puzzle-${getTodayKey()}`);
  assert.match(getPuzzleKey(), /^puzzle-\d{4}-\d{2}-\d{2}$/);
  assert.equal(getTodayAlbum().key, getTodayKey());
});

test("puzzle album is recognizable and avoids today's featured album", () => {
  const puzzle = getPuzzleAlbum();
  assert.ok(puzzle.recognizable, "puzzle draws from the recognizable pool");
  assert.notEqual(puzzle.title, getTodayAlbum().title, "puzzle avoids today");
});

test("versus/taste pairs are two distinct albums", () => {
  for (const pair of [getVersusPair(), getTastePair()]) {
    assert.ok(pair.albumA && pair.albumB);
    assert.notEqual(pair.albumA.title, pair.albumB.title);
  }
  // Taste pool is YouTube-backed.
  const taste = getTastePair();
  assert.ok(taste.albumA.youtubeId && taste.albumB.youtubeId);
});

// The sampler must not let pool size interact with the game cadence. Indexing on
// dayOfYear sampled the pool at a stride of 5, so a pool whose size shared that
// factor silently lost most of its variety (80 albums -> 16 a year). Indexing on
// the appearance ordinal makes the pool size irrelevant.
test("pickRotatingPoolAlbum returns a pool member for cadence-divisible pools", () => {
  for (const size of [80, 133, 135, 140]) {
    const pool = Array.from({ length: size }, (_, i) => ({
      title: `T${i}`,
      artist: `A${i}`,
    }));
    const picked = pickRotatingPoolAlbum(pool, 12345, { avoidToday: false });
    assert.ok(pool.includes(picked), `size ${size}: pick not from pool`);
  }
});

test("an empty or invalid pool yields null rather than throwing", () => {
  assert.equal(pickRotatingPoolAlbum([], 1), null);
  assert.equal(pickRotatingPoolAlbum(null, 1), null);
});
