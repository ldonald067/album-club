import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trackBands,
  trackBandsGradient,
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
