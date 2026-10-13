import { test } from "node:test";
import assert from "node:assert/strict";
import songVideos from "../lib/song-videos.json" with { type: "json" };
import {
  namesAlbum,
  namesOnlyAlbum,
  namesTrack,
  norm,
  placeSong,
} from "../lib/place-song.js";

const t = (title, minutes = 4) => ({ title, ms: minutes * 60000 });
const bends = { artist: "Radiohead", title: "The Bends" };
const bendsSide = [t("Planet Telex"), t("The Bends"), t("High and Dry")];
const place = (album, videoTitle, releases, minutes = 4) =>
  placeSong(
    album,
    videoTitle,
    minutes,
    namesTrack(
      videoTitle,
      releases[0].map((r) => r.title),
    ),
    releases,
    releases[0].length,
  );

test("a title naming only the album is its title track, when it runs as long", () => {
  assert.deepEqual(
    place(bends, "Radiohead - The Bends (Official Video)", [bendsSide]),
    {
      track: 2,
      of: 3,
      song: "The Bends",
    },
  );
  assert.ok(place(bends, "Radiohead - The Bends", [bendsSide], 9).why);
});

test("a title naming the album and a song not on it is not placed", () => {
  // Found by an adversarial review (2026-10-13): Creep is not on The Bends,
  // the length passed, and the needle went onto the title track's band
  const placed = place(bends, "Radiohead - Creep (The Bends sessions)", [
    bendsSide,
  ]);
  assert.equal(placed.why, "names the album and something else");
});

test("every edition the rings' length must have the song, once, in one place", () => {
  const title = "Radiohead - High and Dry";
  assert.equal(place(bends, title, [bendsSide, bendsSide]).track, 3);
  // Passed over before the 2026-10-13 review, and the rest called unanimous
  const without = [t("Planet Telex"), t("The Bends"), t("Fake Plastic Trees")];
  assert.match(place(bends, title, [bendsSide, without]).why, /has it 0 times/);
  const twice = [t("High and Dry"), t("The Bends"), t("High and Dry")];
  assert.match(place(bends, title, [bendsSide, twice]).why, /has it 2 times/);
  const moved = [t("High and Dry"), t("Planet Telex"), t("The Bends")];
  assert.match(place(bends, title, [bendsSide, moved]).why, /disagree/);
  // An edition of another length says nothing about these rings
  assert.equal(place(bends, title, [bendsSide, [t("High and Dry")]]).track, 3);
});

test("another spelling counts as the song only when it is the same recording", () => {
  const fiona = { artist: "Fiona Apple", title: "Fetch the Bolt Cutters" };
  const r = (title, recording) => ({ title, ms: 300000, recording });
  const named = [
    r("I Want You to Love Me", "a"),
    r("Fetch the Bolt Cutters", "b"),
  ];
  const title = "Fiona Apple - Fetch The Bolt Cutters (Official Audio)";
  // The 2020 US edition spells it "FTBC": same recording, same song
  const sameRecording = [r("I Want You to Love Me", "a"), r("FTBC", "b")];
  assert.deepEqual(place(fiona, title, [named, sameRecording], 5), {
    track: 2,
    of: 2,
    song: "Fetch the Bolt Cutters",
  });
  // The same spelling on another recording proves nothing (The Blueprint's
  // "Blue Print (Momma Loves Me)" is one): refused, as before
  const otherRecording = [r("I Want You to Love Me", "a"), r("FTBC", "z")];
  assert.match(
    place(fiona, title, [named, otherRecording], 5).why,
    /has it 0 times/,
  );
});

test("only the artist, the album, a year and dressing leave the title naming the album alone", () => {
  const gnx = { artist: "Kendrick Lamar", title: "GNX" };
  assert.ok(namesOnlyAlbum("Kendrick Lamar - gnx (Official Audio)", gnx));
  assert.ok(
    namesOnlyAlbum("Gorillaz - Demon Days - Demon Days", {
      artist: "Gorillaz",
      title: "Demon Days",
    }),
  );
  assert.ok(
    namesOnlyAlbum("Hounds Of Love (2018 Remaster)", {
      artist: "Kate Bush",
      title: "Hounds of Love",
    }),
  );
  assert.ok(!namesOnlyAlbum("Kendrick Lamar - squabble up (GNX)", gnx));
  assert.ok(!namesOnlyAlbum("Kendrick Lamar - gnx (Live)", gnx));
});

test("every recorded title-track placement's video names nothing but the album", () => {
  const titleTracks = Object.entries(songVideos).filter(([key, entry]) => {
    const [artist, title] = key.split("::");
    const album = { artist, title };
    return (
      namesAlbum(entry.videoTitle, album) && norm(entry.song) === norm(title)
    );
  });
  assert.ok(titleTracks.length > 20, "the list still holds title tracks");
  for (const [key, entry] of titleTracks) {
    const [artist, title] = key.split("::");
    assert.ok(
      namesOnlyAlbum(entry.videoTitle, { artist, title }),
      `${key}: "${entry.videoTitle}" names more than the album`,
    );
  }
});
