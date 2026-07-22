import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ATTEMPTS,
  VALID_GUESS_TYPES,
  validateGuessSubmission,
} from "../lib/guess-validation.js";

test("MAX_ATTEMPTS matches the client game configs", () => {
  assert.deepEqual(MAX_ATTEMPTS, {
    puzzle: 6,
    cover: 5,
    heardle: 6,
    lyric: 4,
    scramble: 5,
  });
});

test("a solved submission at any valid attempt count passes", () => {
  for (const type of VALID_GUESS_TYPES) {
    for (let attempts = 1; attempts <= MAX_ATTEMPTS[type]; attempts++) {
      const r = validateGuessSubmission({ attempts, solved: true, type });
      assert.equal(r.ok, true, `${type} solved in ${attempts}`);
      assert.equal(r.type, type);
    }
  }
});

test("an unsolved submission must use every attempt", () => {
  for (const type of VALID_GUESS_TYPES) {
    const max = MAX_ATTEMPTS[type];
    assert.equal(
      validateGuessSubmission({ attempts: max, solved: false, type }).ok,
      true,
      `${type} unsolved at max`,
    );
    assert.equal(
      validateGuessSubmission({ attempts: max - 1, solved: false, type }).ok,
      false,
      `${type} unsolved below max is rejected`,
    );
  }
});

test("type defaults to puzzle when missing or blank", () => {
  assert.equal(
    validateGuessSubmission({ attempts: 3, solved: true }).type,
    "puzzle",
  );
  assert.equal(
    validateGuessSubmission({ attempts: 3, solved: true, type: "  " }).type,
    "puzzle",
  );
});

test("type is normalized (trim + lowercase)", () => {
  const r = validateGuessSubmission({
    attempts: 2,
    solved: true,
    type: " Cover ",
  });
  assert.equal(r.ok, true);
  assert.equal(r.type, "cover");
});

test("bad inputs are rejected", () => {
  const cases = [
    { attempts: 1, solved: true, type: "nonsense" }, // bad type
    { attempts: 0, solved: true, type: "puzzle" }, // below range
    { attempts: 7, solved: true, type: "puzzle" }, // above max (6)
    { attempts: 5, solved: true, type: "lyric" }, // above lyric max (4)
    { attempts: 2.5, solved: true, type: "cover" }, // non-integer
    { attempts: "3", solved: true, type: "cover" }, // non-number
    { attempts: 3, solved: "yes", type: "cover" }, // non-boolean solved
    { attempts: 2, solved: false, type: "cover" }, // unsolved below max
  ];
  for (const c of cases) {
    const r = validateGuessSubmission(c);
    assert.equal(r.ok, false, JSON.stringify(c));
    assert.equal(typeof r.error, "string");
  }
});
