import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trackBands,
  trackBandsGradient,
  songBandRadii,
  songBandGradient,
  MUSIC_INNER,
  MUSIC_OUTER,
  MAX_TRACKS,
} from "../lib/vinyl-bands.js";

test("one ring between each pair of songs", () => {
  for (const tracks of [2, 3, 12, 20, MAX_TRACKS]) {
    assert.equal(trackBands(tracks).length, tracks - 1, `${tracks} tracks`);
  }
});

test("nothing drawn when there is nothing true to draw", () => {
  // one song is one unbroken groove; unknown and absurd counts draw nothing
  for (const tracks of [1, 0, -3, null, undefined, 2.5, "12", MAX_TRACKS + 1]) {
    assert.equal(trackBands(tracks), null, String(tracks));
    assert.equal(trackBandsGradient(tracks), null, String(tracks));
  }
});

test("rings stay on the music, off the label and the lead-in", () => {
  for (let tracks = 2; tracks <= MAX_TRACKS; tracks++) {
    for (const [start, end] of trackBands(tracks)) {
      assert.ok(
        start > MUSIC_INNER && end < MUSIC_OUTER,
        `${tracks}: ${start}-${end}`,
      );
      assert.ok(end > start);
    }
  }
});

test("rings never touch each other", () => {
  for (let tracks = 2; tracks <= MAX_TRACKS; tracks++) {
    const bands = trackBands(tracks);
    for (let i = 1; i < bands.length; i++) {
      // outermost first: each ring sits wholly inside the previous one
      assert.ok(bands[i][1] < bands[i - 1][0], `${tracks} tracks, ring ${i}`);
    }
  }
});

test("three songs split the music into equal thirds", () => {
  const span = MUSIC_OUTER - MUSIC_INNER;
  const centres = trackBands(3).map(([s, e]) => (s + e) / 2);
  assert.deepEqual(
    centres.map((c) => +c.toFixed(6)),
    [MUSIC_OUTER - span / 3, MUSIC_OUTER - (2 * span) / 3].map(
      (c) => +c.toFixed(6),
    ),
  );
});

test("the gradient is one layer with four stops per ring, in the token colour", () => {
  const css = trackBandsGradient(12);
  assert.match(css, /^radial-gradient\(circle closest-side, /);
  assert.equal((css.match(/var\(--vinyl-band\)/g) || []).length, 11 * 2);
  assert.equal((css.match(/transparent/g) || []).length, 11 * 2);
  assert.equal(css.indexOf("radial-gradient", 1), -1);
});

test("gradient stops run inside-out, as CSS requires", () => {
  // A stop below the one before it is clamped to it, so descending stops
  // collapse every ring onto the first. It reached the dev browser once
  // with all the geometry above passing; this is the check that catches it.
  for (let tracks = 2; tracks <= MAX_TRACKS; tracks++) {
    const positions = [
      ...trackBandsGradient(tracks).matchAll(/ (-?[\d.]+)%/g),
    ].map((m) => Number(m[1]));
    assert.equal(positions.length, (tracks - 1) * 4);
    for (let i = 1; i < positions.length; i++) {
      assert.ok(
        positions[i] >= positions[i - 1],
        `${tracks} tracks, stop ${i}: ${positions[i - 1]} → ${positions[i]}`,
      );
    }
  }
});

test("a song's band runs ring to ring, out to the music's edges at either end", () => {
  const bands = trackBands(12);
  assert.deepEqual(songBandRadii(12, 1), [bands[0][1], MUSIC_OUTER]);
  assert.deepEqual(songBandRadii(12, 5), [bands[4][1], bands[3][0]]);
  assert.deepEqual(songBandRadii(12, 12), [MUSIC_INNER, bands[10][0]]);
  for (let tracks = 2; tracks <= MAX_TRACKS; tracks++) {
    let last = Infinity;
    for (let track = 1; track <= tracks; track++) {
      const [inner, outer] = songBandRadii(tracks, track);
      assert.ok(inner < outer, `${track}/${tracks}`);
      assert.ok(outer <= last, `${track}/${tracks} sits inside the one before`);
      last = inner;
    }
  }
});

test("no band to light without rings or without that song", () => {
  for (const [tracks, track] of [
    [null, 1],
    [1, 1],
    [MAX_TRACKS + 1, 2],
    [12, 0],
    [12, 13],
    [12, 2.5],
    [12, "3"],
  ]) {
    assert.equal(songBandRadii(tracks, track), null, `${track}/${tracks}`);
    assert.equal(songBandGradient(tracks, track), null, `${track}/${tracks}`);
  }
});

test("the lit band is one ascending layer in the song token", () => {
  const css = songBandGradient(12, 3);
  assert.match(css, /^radial-gradient\(circle closest-side, transparent /);
  assert.equal(css.match(/var\(--vinyl-song\)/g).length, 2);
  const stops = [...css.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.equal(stops.length, 4);
  for (let i = 1; i < stops.length; i++) assert.ok(stops[i] > stops[i - 1]);
});
