import { test } from "node:test";
import assert from "node:assert/strict";
import schedule from "../lib/schedule.json" with { type: "json" };
import { ALBUMS } from "../lib/albums.js";
import {
  albumId,
  computeDayIds,
  getDailyPicks,
  getFeaturedAlbum,
} from "../lib/daily-picks.js";
import { catalogFingerprint } from "../lib/catalog-fingerprint.js";

const utc = (s) => new Date(`${s}T12:00:00Z`);
const fullDays = Object.entries(schedule.days).filter(([, d]) => d.puzzle);
const idsOf = (picks) => ({
  album: albumId(picks.album),
  puzzle: albumId(picks.puzzle),
  cover: albumId(picks.cover),
  heardle: albumId(picks.heardle),
  scramble: albumId(picks.scramble),
  lyric: albumId(picks.lyric),
  versus: [albumId(picks.versus.albumA), albumId(picks.versus.albumB)],
  taste: [albumId(picks.taste.albumA), albumId(picks.taste.albumB)],
});

// Run fn against a reordered catalog, then put the real one back
function withShuffledCatalog(fn) {
  const original = [...ALBUMS];
  ALBUMS.splice(0, ALBUMS.length, ...[...original].reverse());
  try {
    fn();
  } finally {
    ALBUMS.splice(0, ALBUMS.length, ...original);
  }
}

test("the schedule has fully recorded days to test against", () => {
  assert.ok(fullDays.length >= 1);
});

test("a recorded day serves exactly what was recorded", () => {
  for (const [key, day] of fullDays) {
    assert.deepEqual(idsOf(getDailyPicks(key)), day, key);
  }
});

test("a catalog edit cannot change a recorded day, but does move unrecorded ones", () => {
  const future = "2031-03-14";
  assert.equal(schedule.days[future], undefined);
  const futureBefore = idsOf(getDailyPicks(future));

  withShuffledCatalog(() => {
    for (const [key, day] of fullDays) {
      assert.deepEqual(idsOf(getDailyPicks(key)), day, key);
    }
    for (const [key, day] of Object.entries(schedule.days)) {
      assert.equal(albumId(getFeaturedAlbum(key)), day.album, key);
    }
    assert.notDeepEqual(idsOf(getDailyPicks(future)), futureBefore);
  });
});

test("an unrecorded day is computed from the catalog", () => {
  const key = "2031-03-14";
  const { key: _k, ...computed } = computeDayIds(utc(key));
  assert.deepEqual(idsOf(getDailyPicks(key)), computed);
});

test("every recorded identity still exists in the catalog", () => {
  const ids = new Set(ALBUMS.map(albumId));
  for (const [key, day] of Object.entries(schedule.days)) {
    for (const id of Object.values(day).flat()) {
      assert.ok(ids.has(id), `${key}: ${id}`);
    }
  }
});

test("the fingerprint tracks pick inputs and ignores cosmetic fields", () => {
  const albums = ALBUMS.slice(0, 20).map((a) => ({ ...a }));
  const base = catalogFingerprint(albums, ["A - B"]);

  const recoloured = albums.map((a) => ({ ...a, color: "#123456", year: 1 }));
  assert.equal(catalogFingerprint(recoloured, ["A - B"]), base);
  assert.equal(catalogFingerprint(albums, ["a - b"]), base);

  const flagged = albums.map((a, i) =>
    i === 3 ? { ...a, youtubeId: a.youtubeId ? undefined : "x" } : a,
  );
  assert.notEqual(catalogFingerprint(flagged, ["A - B"]), base);
  assert.notEqual(catalogFingerprint([...albums].reverse(), ["A - B"]), base);
  assert.notEqual(catalogFingerprint(albums, ["A - B", "C - D"]), base);
});
