import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFactLine, getAlbumFacts } from "../lib/soundtrack-corner.js";

/* These cover shapes the catalog does not necessarily contain today. The facts
   file is fetched, partial and growing, so testing against whatever happens to
   be in it would test the fetch rather than the logic. */

test("an album without sourced facts contributes no fact line", () => {
  assert.equal(buildFactLine(null), null);
  assert.equal(getAlbumFacts({ artist: "Nobody", title: "Nothing" }), null);
});

test("release type outranks shape, because it changes what the record is", () => {
  const live = buildFactLine({
    types: ["Album", "Live"],
    tracks: 12,
    runtimeMinutes: 60,
    longestMinutes: 9,
  });
  assert.match(live, /Recorded live/);
  // Shape would have claimed the 9-minute track; the room matters more.
  assert.doesNotMatch(live, /9 minutes/);

  assert.match(
    buildFactLine({
      types: ["Album", "DJ-mix"],
      tracks: 1,
      runtimeMinutes: 70,
      longestMinutes: 70,
    }),
    /continuous mix/,
  );
});

test("shape lines describe the record that was actually fetched", () => {
  assert.match(
    buildFactLine({
      types: ["Album"],
      tracks: 4,
      runtimeMinutes: 42,
      longestMinutes: 17,
    }),
    /longest track runs 17 minutes/,
  );
  assert.match(
    buildFactLine({
      types: ["Album"],
      tracks: 22,
      runtimeMinutes: 74,
      longestMinutes: 5,
    }),
    /22 tracks deep/,
  );
  assert.match(
    buildFactLine({
      types: ["Album"],
      tracks: 10,
      runtimeMinutes: 28,
      longestMinutes: 4,
    }),
    /28 minutes end to end/,
  );
  assert.match(
    buildFactLine({
      types: ["Album"],
      tracks: 12,
      runtimeMinutes: 53,
      longestMinutes: 6,
    }),
    /12 tracks across 53 minutes/,
  );
});

test("an unknown release type falls through to shape rather than vanishing", () => {
  const line = buildFactLine({
    types: ["Broadcast"],
    tracks: 9,
    runtimeMinutes: 44,
    longestMinutes: 6,
  });
  assert.match(line, /9 tracks across 44 minutes/);
});
