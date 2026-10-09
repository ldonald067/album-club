import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  recordArt,
  ART_PATTERNS,
  INKS,
  FRAMES,
  ZOETROPE_FRAMES,
  SPIRAL_PATH,
  SPIRAL_RANGE,
} from "../lib/record-art.js";

const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const LABEL = 34;
const EDGE = 100;

const dayKey = (n) =>
  new Date(Date.UTC(2026, 9, 1) + n * 86400000).toISOString().slice(0, 10);

test("the patterns take turns: consecutive days never repeat one", () => {
  for (let n = 0; n < 400; n++) {
    assert.notEqual(recordArt(dayKey(n)).pattern, recordArt(dayKey(n + 1)).pattern);
  }
  const seen = new Set([0, 1, 2].map((n) => recordArt(dayKey(n)).pattern));
  assert.deepEqual([...seen].sort(), [...ART_PATTERNS].sort());
});

test("the ink changes too, so a pattern comes back in another colour", () => {
  for (let n = 0; n < 400; n++) {
    const today = recordArt(dayKey(n));
    const again = recordArt(dayKey(n + ART_PATTERNS.length));
    assert.equal(today.pattern, again.pattern);
    assert.notEqual(today.ink, again.ink, dayKey(n));
    assert.ok(today.ink >= 1 && today.ink <= INKS);
  }
  const inks = new Set(Array.from({ length: INKS }, (_, n) => recordArt(dayKey(n)).ink));
  assert.equal(inks.size, INKS, "every ink gets used");
});

test("every ink it can pick has a token, or the pattern would print black on black", () => {
  for (let ink = 1; ink <= INKS; ink++) {
    assert.match(css, new RegExp(`--vinyl-ink-${ink}:\\s*#[0-9a-f]{6}`, "i"));
  }
  assert.doesNotMatch(css, new RegExp(`--vinyl-ink-${INKS + 1}:`));
});

test("the zoetrope's stepped spin moves exactly one frame a step", () => {
  assert.equal(ZOETROPE_FRAMES.length, FRAMES);
  assert.match(css, new RegExp(`steps\\(${FRAMES}\\)`));
  assert.doesNotMatch(
    css.replace(new RegExp(`steps\\(${FRAMES}\\)`, "g"), ""),
    /steps\(\d+\)/,
    "no other step count",
  );
});

test("the zoetrope's balls stay on the record, clear of the label", () => {
  for (const { cx, cy, r } of ZOETROPE_FRAMES) {
    const d = Math.hypot(cx, cy);
    assert.ok(d - r > LABEL + 4, `ball at ${d}`);
    assert.ok(d + r < EDGE - 4, `ball at ${d}`);
  }
});

test("the spiral runs from outside the label to inside the edge", () => {
  const points = SPIRAL_PATH.slice(1)
    .split("L")
    .map((p) => p.split(" ").map(Number));
  assert.ok(points.length > 100);
  for (const [x, y] of points) {
    const d = Math.hypot(x, y);
    assert.ok(d >= SPIRAL_RANGE.inner - 0.2 && d <= SPIRAL_RANGE.outer + 0.2, `${d}`);
  }
  assert.ok(SPIRAL_RANGE.inner > LABEL + 4 && SPIRAL_RANGE.outer < EDGE - 4);
});

test("no date, no pattern", () => {
  for (const bad of [undefined, null, "", "not a date"]) {
    assert.equal(recordArt(bad), null, String(bad));
  }
});
