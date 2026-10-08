import { test } from "node:test";
import assert from "node:assert/strict";
import songVideos from "../lib/song-videos.json" with { type: "json" };
import albums from "../lib/albums.json" with { type: "json" };
import { fullAlbumKey } from "../lib/full-album-videos.js";
import { getAlbumFacts } from "../lib/album-facts.js";
import { songOnRecord } from "../lib/song-videos.js";

const [listedKey] = Object.keys(songVideos);
const listed = albums.find((a) => a.youtubeId && fullAlbumKey(a) === listedKey);
const tracks = listed ? getAlbumFacts(listed)?.tracks : null;

test("a one-song video the audit placed names its song and where it sits", () => {
  assert.ok(listed, "the list names an album in the catalog");
  const song = songOnRecord(listed, tracks);
  assert.equal(song.of, tracks);
  assert.ok(song.track >= 1 && song.track <= song.of);
  assert.equal(song.title, songVideos[listedKey].song);
});

test("a changed id, or rings drawn from another count, lose it", () => {
  assert.equal(songOnRecord({ ...listed, youtubeId: "someOtherId" }, tracks), null);
  assert.equal(songOnRecord({ ...listed, title: "Another Album" }, tracks), null);
  assert.equal(songOnRecord({ ...listed, youtubeId: undefined }, tracks), null);
  assert.equal(songOnRecord(listed, tracks + 1), null);
  assert.equal(songOnRecord(listed, null), null);
  assert.equal(songOnRecord(null, tracks), null);
});
