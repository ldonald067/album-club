import { test } from "node:test";
import assert from "node:assert/strict";
import fullAlbumVideos from "../lib/full-album-videos.json" with { type: "json" };
import albums from "../lib/albums.json" with { type: "json" };
import { fullAlbumKey, playsWholeAlbum } from "../lib/full-album-videos.js";

const [listedKey] = Object.keys(fullAlbumVideos);
const listed = albums.find((a) => a.youtubeId && fullAlbumKey(a) === listedKey);

test("an album whose video the audit found whole gets the turntable", () => {
  assert.ok(listed, "the list names an album in the catalog");
  assert.equal(playsWholeAlbum(listed), true);
});

test("a changed or reassigned id loses it until the audit has seen it", () => {
  assert.equal(playsWholeAlbum({ ...listed, youtubeId: "someOtherId" }), false);
  assert.equal(playsWholeAlbum({ ...listed, title: "Another Album" }), false);
  assert.equal(playsWholeAlbum({ ...listed, youtubeId: undefined }), false);
  assert.equal(playsWholeAlbum(null), false);
});
