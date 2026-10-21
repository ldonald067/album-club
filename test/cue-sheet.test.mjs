import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildShelves,
  cleanPitch,
  clubTally,
  PITCH_MAX,
  pitchKey,
  readPitch,
  readStoredCues,
  readStoredPitches,
  resolveCues,
  resolvePitches,
  savePitch,
} from "../lib/cue-sheet.js";
import { FIRST_RECORDED_DAY, getAiredAlbums } from "../lib/daily-picks.js";
import { getTodayKey } from "../lib/albums.js";
import { getClubCall } from "../lib/soundtrack-corner.js";
import { SOUNDTRACK_OVERRIDES } from "../lib/soundtrack-corner-data.js";

function fakeStorage(entries) {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (i) => keys[i],
    getItem: (key) => entries[key] ?? null,
  };
}

// A hand-written corner and a generated one, as the catalog has them
const CALLED = { artist: "Jay-Z", title: "Reasonable Doubt" };
const UNCALLED = { artist: "Noname", title: "Room 25" };

test("stored cues are read newest first, and nothing malformed gets in", () => {
  const cues = readStoredCues(
    fakeStorage({
      "aotd_soundtrack_2026-10-01": "film",
      "aotd_soundtrack_2026-10-03": "game",
      "aotd_soundtrack_2026-10-02": "tv",
      "aotd_soundtrack_2026-10-04": "radio",
      aotd_soundtrack_yesterday: "film",
      "aotd_rated_2026-10-01": "8",
    }),
  );
  assert.deepEqual(cues, [
    { date: "2026-10-03", pick: "game" },
    { date: "2026-10-02", pick: "tv" },
    { date: "2026-10-01", pick: "film" },
  ]);
});

test("storage that throws reads as no cues", () => {
  const blocked = {
    get length() {
      throw new Error("SecurityError");
    },
  };
  assert.deepEqual(readStoredCues(blocked), []);
});

test("a cue on a day the server did not name is left out, not guessed", () => {
  const resolved = resolveCues(
    [
      { date: "2026-10-02", pick: "tv" },
      { date: "2026-06-01", pick: "film" },
    ],
    { "2026-10-02": CALLED },
  );
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].album, CALLED);
});

test("the tally counts only days the club made a call", () => {
  assert.equal(getClubCall(CALLED).pick, "tv");
  assert.equal(getClubCall(UNCALLED), null);

  const resolved = resolveCues(
    [
      { date: "2026-10-03", pick: "tv" },
      { date: "2026-10-02", pick: "film" },
      { date: "2026-10-01", pick: "game" },
    ],
    { "2026-10-03": CALLED, "2026-10-02": CALLED, "2026-10-01": UNCALLED },
  );
  assert.deepEqual(clubTally(resolved), { agree: 1, total: 2 });
  assert.deepEqual(clubTally([]), { agree: 0, total: 0 });

  const shelves = buildShelves(resolved);
  assert.deepEqual(
    Object.fromEntries(Object.entries(shelves).map(([k, v]) => [k, v.length])),
    { game: 1, film: 1, tv: 1 },
  );
});

test("aired albums run from the record's first day to today, never beyond", () => {
  const today = getTodayKey();
  const all = getAiredAlbums();
  assert.equal(all[0].date, FIRST_RECORDED_DAY);
  assert.equal(all.at(-1).date, today);
  assert.ok(all.every((day) => day.date <= today && day.artist && day.title));

  // Earlier than the record clamps to it; a later start is honoured
  assert.equal(getAiredAlbums("2020-01-01")[0].date, FIRST_RECORDED_DAY);
  assert.equal(getAiredAlbums(today).length, 1);
});

test("every hand-written corner makes a call the UI can show", () => {
  for (const [key, override] of Object.entries(SOUNDTRACK_OVERRIDES)) {
    const call = override.clubCall;
    assert.ok(["game", "film", "tv"].includes(call?.pick), key);
    assert.ok(call.why && call.why.length <= 120, `${key}: ${call.why}`);
  }
});

// A storage that can be written to, for the pitch round trip
function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    entries: () => Object.fromEntries(map),
  };
}

test("a pitch is one line, trimmed, and capped", () => {
  assert.equal(
    cleanPitch("  the  cold open\nof a heist  "),
    "the cold open of a heist",
  );
  assert.equal(cleanPitch("   "), "");
  assert.equal(cleanPitch(null), "");
  assert.equal(cleanPitch("x".repeat(PITCH_MAX + 40)).length, PITCH_MAX);
  // Cut at the cap, then trimmed again so it never ends on a space
  assert.equal(
    cleanPitch(`${"a".repeat(PITCH_MAX - 1)} b`),
    "a".repeat(PITCH_MAX - 1),
  );
});

test("a pitch saves under its own key, and saving it empty removes it", () => {
  const storage = memoryStorage({ "aotd_soundtrack_2026-10-21": "film" });
  assert.equal(pitchKey("2026-10-21"), "aotd_cue_pitch_2026-10-21");

  assert.equal(
    savePitch(storage, "2026-10-21", " a  rooftop chase "),
    "a rooftop chase",
  );
  assert.equal(readPitch(storage, "2026-10-21"), "a rooftop chase");
  // The cue it sits beside is untouched, and the cue reader never sees a pitch
  assert.deepEqual(readStoredCues(storage), [
    { date: "2026-10-21", pick: "film" },
  ]);

  assert.equal(savePitch(storage, "2026-10-21", "   "), "");
  assert.deepEqual(storage.entries(), { "aotd_soundtrack_2026-10-21": "film" });
  assert.equal(readPitch(storage, "2026-10-20"), "");
});

test("a storage that refuses a write throws, so the box can say it was not kept", () => {
  const full = memoryStorage();
  full.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.throws(() => savePitch(full, "2026-10-21", "a montage"));
  assert.equal(
    readPitch(
      {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
      "2026-10-21",
    ),
    "",
  );
});

test("stored pitches are read newest first, and nothing malformed gets in", () => {
  const pitches = readStoredPitches(
    memoryStorage({
      "aotd_cue_pitch_2026-10-01": "the opening titles",
      "aotd_cue_pitch_2026-10-03": "a heist going wrong",
      "aotd_cue_pitch_2026-10-02": "   ",
      aotd_cue_pitch_today: "a montage",
      "aotd_soundtrack_2026-10-04": "tv",
    }),
  );
  assert.deepEqual(pitches, [
    { date: "2026-10-03", text: "a heist going wrong" },
    { date: "2026-10-01", text: "the opening titles" },
  ]);
  assert.deepEqual(
    readStoredPitches({
      get length() {
        throw new Error("x");
      },
    }),
    [],
  );
});

test("a pitch on a day the server did not name is left out, not guessed", () => {
  const resolved = resolvePitches(
    [
      { date: "2026-10-02", text: "a rooftop chase" },
      { date: "2026-06-01", text: "the end credits" },
    ],
    { "2026-10-02": UNCALLED },
  );
  assert.deepEqual(resolved, [
    { date: "2026-10-02", text: "a rooftop chase", album: UNCALLED },
  ]);
});
