import test from "node:test";
import assert from "node:assert/strict";

import { tokenMatches } from "../lib/token-match.js";

const TOKEN = "a-long-random-backup-token-4f9c2e";

test("the right token matches", () => {
  assert.equal(tokenMatches(TOKEN, TOKEN), true);
});

test("a wrong token of the same length does not", () => {
  const wrong = TOKEN.slice(0, -1) + (TOKEN.endsWith("e") ? "f" : "e");
  assert.equal(wrong.length, TOKEN.length);
  assert.equal(tokenMatches(wrong, TOKEN), false);
});

test("a wrong token of a different length does not, and does not throw", () => {
  // timingSafeEqual throws on unequal buffers; hashing is what makes this safe
  for (const guess of ["x", TOKEN + "extra", TOKEN.repeat(4)]) {
    assert.doesNotThrow(() => tokenMatches(guess, TOKEN));
    assert.equal(tokenMatches(guess, TOKEN), false);
  }
});

test("missing or non-string values never match", () => {
  for (const guess of ["", null, undefined, 123, {}, ["x"]]) {
    assert.equal(tokenMatches(guess, TOKEN), false);
  }
  // …and an unset expected token can't be matched by an empty guess
  assert.equal(tokenMatches("", ""), false);
  assert.equal(tokenMatches("anything", ""), false);
});

test("a prefix of the token is not enough", () => {
  assert.equal(tokenMatches(TOKEN.slice(0, 10), TOKEN), false);
});
