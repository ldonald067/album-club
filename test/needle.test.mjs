import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  readNeedle,
  writeNeedle,
  clearNeedle,
  heardThrough,
  readFullPlays,
  recordFullPlay,
  NEEDLE_KEY,
  FULL_PLAYS_KEY,
} from "../lib/needle.js";

// A minimal localStorage, replaced before each test
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

test("the needle is remembered for the same day and video only", () => {
  writeNeedle("2026-10-01", "abc", 123.46, 100.4, 2400.2);
  assert.deepEqual(readNeedle("2026-10-01", "abc"), {
    t: 123.5,
    heard: 100,
    d: 2400,
  });
  assert.equal(readNeedle("2026-10-02", "abc"), null, "another day");
  assert.equal(readNeedle("2026-10-01", "xyz"), null, "another video");
  clearNeedle();
  assert.equal(readNeedle("2026-10-01", "abc"), null, "cleared");
});

test("a malformed or blocked needle reads as nothing remembered", () => {
  for (const raw of ["not json", "null", "[]", '{"day":"2026-10-01"}']) {
    localStorage.setItem(NEEDLE_KEY, raw);
    assert.equal(readNeedle("2026-10-01", "abc"), null, raw);
  }
  localStorage.setItem(
    NEEDLE_KEY,
    JSON.stringify({ day: "2026-10-01", id: "abc", t: -5 }),
  );
  assert.equal(readNeedle("2026-10-01", "abc"), null, "negative time");
  globalThis.localStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readNeedle("2026-10-01", "abc"), null);
  assert.doesNotThrow(() => writeNeedle("2026-10-01", "abc", 1, 1, 9));
  assert.doesNotThrow(() => clearNeedle());
  assert.deepEqual(readFullPlays(), []);
  assert.equal(recordFullPlay("A::B"), 1);
});

test("a full play needs the end and nine tenths of the album heard", () => {
  assert.equal(heardThrough(2700, 3000), true);
  assert.equal(heardThrough(2699, 3000), false, "a seek to the end");
  assert.equal(heardThrough(100, 0), false, "no duration");
});

test("the same album heard twice counts once", () => {
  assert.equal(recordFullPlay("OutKast::ATLiens"), 1);
  assert.equal(recordFullPlay("OutKast::ATLiens"), 1);
  assert.equal(recordFullPlay("Little Simz::Grey Area"), 2);
  assert.deepEqual(readFullPlays(), [
    "OutKast::ATLiens",
    "Little Simz::Grey Area",
  ]);
  localStorage.setItem(FULL_PLAYS_KEY, '{"not":"a list"}');
  assert.deepEqual(readFullPlays(), []);
});
