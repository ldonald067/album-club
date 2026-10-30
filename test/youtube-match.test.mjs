import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FULL_RATIO,
  isFullSession,
  judgeVideo,
  officialChannel,
  parseDuration,
  pickFullAlbum,
} from "../lib/youtube-match.js";

const okComputer = { artist: "Radiohead", title: "OK Computer" };
const AM = 53.4; // OK Computer's runtime, minutes
const video = (title, minutes = AM, extra = {}) => ({
  id: title,
  title,
  channel: "Some Uploader",
  seconds: Math.round(minutes * 60),
  embeddable: true,
  isPublic: true,
  live: false,
  ageRestricted: false,
  blockedInUS: false,
  ...extra,
});
const judge = (v, album = okComputer, minutes = AM, types = ["Album"]) =>
  judgeVideo(album, minutes ? { runtimeMinutes: minutes, types } : null, v);

test("durations parse from the Data API's ISO 8601 form", () => {
  assert.equal(parseDuration("PT1H2M3S"), 3723);
  assert.equal(parseDuration("PT45M"), 2700);
  assert.equal(parseDuration("PT59S"), 59);
  assert.equal(parseDuration("P1DT1H"), 90000);
  assert.equal(parseDuration("P0D"), 0); // a live stream or premiere
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration("PT"), null);
  assert.equal(parseDuration(undefined), null);
});

test("the artist's own channel, in YouTube's forms, and nothing looser", () => {
  for (const c of ["Radiohead", "RadioheadVEVO", "Radiohead - Topic"])
    assert.ok(officialChannel(c, "Radiohead"), c);
  for (const c of ["Radiohead Fan Archive", "Radioheads", "", undefined])
    assert.ok(!officialChannel(c, "Radiohead"), String(c));
});

test("a fan upload that says full album and runs as long is kept", () => {
  const j = judge(video("Radiohead - OK Computer (Full Album)"));
  assert.equal(j.ok, true);
  assert.equal(j.official, false);
});

test("the artist's own upload need not say full album", () => {
  const j = judge(video("OK Computer", AM, { channel: "Radiohead" }));
  assert.equal(j.ok, true);
  assert.equal(j.official, true);
});

test("anyone else's upload must say what it is", () => {
  assert.match(
    judge(video("Radiohead - OK Computer [1997]")).why,
    /does not say full album/,
  );
});

test("the title track's video names the album and is turned down on length", () => {
  const j = judge(
    video("Prince - Purple Rain (Official Video)", 8.7, {
      channel: "Prince",
    }),
    { artist: "Prince", title: "Purple Rain" },
    43.9,
  );
  assert.equal(j.ok, false);
  assert.match(j.why, /8\.7m against the album's 43\.9m/);
});

test("an upload missing songs is turned down — the Hayley Williams bootleg ran 51 of 67 minutes", () => {
  const ego = {
    artist: "Hayley Williams",
    title: "Ego Death at a Bachelorette Party",
  };
  const j = judge(
    video(
      "Hayley Williams - Ego Death at a Bachelorette Party (Full Album)",
      51.4,
    ),
    ego,
    67.2,
  );
  assert.equal(j.ok, false);
});

test("the length must sit inside FULL_RATIO of the runtime, edges included", () => {
  const at = (r) =>
    judge(video("Radiohead - OK Computer (Full Album)", AM * r)).ok;
  assert.equal(at(FULL_RATIO.min), true);
  assert.equal(at(FULL_RATIO.max), true);
  assert.equal(at(FULL_RATIO.min - 0.01), false);
  assert.equal(at(FULL_RATIO.max + 0.01), false);
});

test("a long video about the album is not the album", () => {
  for (const title of [
    "Radiohead - OK Computer (Full Album) | Documentary",
    "OK Computer full album REACTION - Radiohead",
    "Radiohead - OK Computer Full Album Live at Glastonbury",
    "Radiohead - OK Computer (Full Album) slowed + reverb",
    "Radiohead - OK Computer full album piano cover",
    "Radiohead - OK Computer Full Album Track By Track Review",
  ]) {
    const j = judge(video(title));
    assert.equal(j.ok, false, title);
    assert.match(j.why, /title says/, title);
  }
});

test("a word in the album's own title does not count against it", () => {
  const pompeii = { artist: "Pink Floyd", title: "Live at Pompeii" };
  const j = judge(
    video("Pink Floyd - Live at Pompeii (Full Album)", 60),
    pompeii,
    60,
  );
  assert.equal(j.ok, true);
});

test("a live album may say live, whatever its title; a studio album may not", () => {
  const unplugged = { artist: "Nirvana", title: "Unplugged in New York" };
  const upload = video(
    "Nirvana - Unplugged in New York (Live) Full Album",
    53.5,
  );
  assert.equal(judge(upload, unplugged, 53.5, ["Album", "Live"]).ok, true);
  assert.match(judge(upload, unplugged, 53.5).why, /title says "live"/);
});

test("the album must be named, and the artist named or the channel theirs", () => {
  assert.match(
    judge(video("Radiohead - The Bends (Full Album)")).why,
    /does not name the album/,
  );
  assert.match(
    judge(video("OK Computer (Full Album)")).why,
    /does not name the artist/,
  );
});

test("nothing that cannot play in the site's embed is kept", () => {
  const good = "Radiohead - OK Computer (Full Album)";
  for (const [extra, why] of [
    [{ embeddable: false }, /embedding disabled/],
    [{ isPublic: false }, /not public/],
    [{ live: true }, /live stream/],
    [{ ageRestricted: true }, /age-restricted/],
    [{ blockedInUS: true }, /blocked in the US/],
  ])
    assert.match(judge(video(good, AM, extra)).why, why);
});

test("with no runtime to measure against, nothing is kept", () => {
  assert.match(
    judge(video("Radiohead - OK Computer (Full Album)"), okComputer, null).why,
    /no album runtime/,
  );
});

const tinyDesk = { artist: "Mac Miller", title: "NPR Tiny Desk: Mac Miller" };
const kexp = { artist: "Khruangbin", title: "KEXP Live Sessions: Khruangbin" };

test("a session is the series' own upload of the whole set", () => {
  assert.ok(
    isFullSession(tinyDesk, {
      title: "Mac Miller: NPR Music Tiny Desk Concert",
      channel: "NPR Music",
      seconds: 16 * 60,
    }),
  );
  // the same title re-uploaded by someone else
  assert.ok(
    !isFullSession(tinyDesk, {
      title: "Mac Miller: NPR Music Tiny Desk Concert",
      channel: "Mac Miller Archive",
      seconds: 16 * 60,
    }),
  );
  // one song of the set
  assert.ok(
    !isFullSession(kexp, {
      title: "Khruangbin - White Gloves ii (Live on KEXP)",
      channel: "KEXP",
      seconds: 5 * 60,
    }),
  );
  const j = judgeVideo(kexp, null, {
    ...video("Khruangbin - Full Performance (Live on KEXP)", 35.7),
    channel: "KEXP",
  });
  assert.equal(j.ok, true);
});

test("a session posted before its year is another night; one posted later is a repost", () => {
  const berlin = {
    artist: "Maceo Plex",
    title: "Boiler Room: Berlin",
    year: 2019,
  };
  const set = (published) => ({
    ...video("Maceo Plex Boiler Room Berlin DJ Set", 90.8),
    channel: "Boiler Room",
    published,
  });
  assert.match(
    judgeVideo(berlin, null, set("2014-10-13")).why,
    /posted in 2014, before the 2019 set/,
  );
  assert.equal(judgeVideo(berlin, null, set("2019-06-01")).ok, true);
  assert.equal(judgeVideo(berlin, null, set("2026-01-20")).ok, true);
  // a stored pick from before the log kept the date is judged without it
  assert.equal(judgeVideo(berlin, null, set(undefined)).ok, true);
});

test("a night with no performer waits for the owner's ruling", () => {
  const berlin = {
    artist: "Various Artists",
    title: "Boiler Room: Berlin",
    year: 2019,
  };
  const set = {
    ...video("SPFDJ | Boiler Room Berlin: Intrepid Skin", 57),
    channel: "Boiler Room",
    published: "2022-10-19",
  };
  assert.match(judgeVideo(berlin, null, set).why, /no performer/);
});

test("the title turns down a changed tracklist or a record with parts removed", () => {
  for (const title of [
    "Radiohead - OK Computer Full Album Vocals Only Accapella",
    "Radiohead - OK Computer (Full Album) - Dolby Atmos Backing Tracks",
    "Beck's Record Club - Radiohead - OK Computer (Full Album) 1997",
    "Radiohead - OK Computer (Test Pressing) (Full Album)",
    "Radiohead - OK Computer: Definitive Edition (Full Album)",
  ]) {
    assert.equal(judge(video(title)).ok, false, title);
  }
});

test("the description can admit what the title hides", () => {
  const title = "Radiohead - OK Computer (Full Album)";
  const told = (description) => judge(video(title, AM, { description }));
  assert.match(
    told("Here's a #covermarathon for the full album").why,
    /description says "covermarathon"/,
  );
  assert.match(
    told("This is a manually edited version of the album.").why,
    /description says "manually edited"/,
  );
  assert.match(
    told("Note: transition smoothing added between tracks.").why,
    /description says "transition smoothing"/,
  );
  // art credits and studio credits are not admissions
  assert.equal(told("Artwork [Front Cover Rendering] - John").ok, true);
  assert.equal(told("Edited At - GLC Sound Studios").ok, true);
  assert.equal(told("").ok, true);
});

test("a video read and turned down stays out under any title", () => {
  const j = judge(
    video("Radiohead - OK Computer (Full Album)", AM, { id: "OUb3nHFm19g" }),
  );
  assert.match(j.why, /cover marathon/);
});

test("the pick prefers the artist's upload, then the closest length", () => {
  const fanClose = video("Radiohead - OK Computer (Full Album)", AM);
  const fanFar = video("Radiohead - OK Computer full album HQ", AM * 1.05);
  const own = video("OK Computer", AM * 1.06, { channel: "RadioheadVEVO" });
  const bad = video("OK Computer review", AM);
  assert.equal(
    pickFullAlbum(okComputer, { runtimeMinutes: AM }, [
      bad,
      fanFar,
      fanClose,
      own,
    ]).pick.video,
    own,
  );
  assert.equal(
    pickFullAlbum(okComputer, { runtimeMinutes: AM }, [bad, fanFar, fanClose])
      .pick.video,
    fanClose,
  );
  assert.equal(
    pickFullAlbum(okComputer, { runtimeMinutes: AM }, [bad]).pick,
    null,
  );
});

test("an uploader's edit of the record is not the record", () => {
  for (const title of [
    "Radiohead - OK Computer (Full Album, Reversed Tracklist)",
    "Radiohead - OK Computer Full Album (Transition)",
    "Radiohead - OK Computer (Full Album with transitions)",
    "Radiohead - OK Computer (Continuous Mix) Full Album",
    "Radiohead - OK Computer || Full Album || 432.001Hz",
    "Radiohead - OK Computer Full Album 528 Hz",
    "OK Computer-Radiohead: Full Album (Pitched Down)",
    "Radiohead - OK Computer - full album with enhanced female whispers",
    "Radiohead - OK Computer COLLECTORS EDITION. (Full Album)",
    "Radiohead - OK Computer (Collector's Edition) Full Album",
  ])
    assert.equal(judge(video(title)).ok, false, title);
});

test("a title disguised with combining marks or styled letters is turned down; a real accent is not", () => {
  assert.match(
    judge(video("R̲a̲diohe̲a̲d - OK Computer (Full Album)")).why,
    /disguised/,
  );
  assert.match(
    judge(video("𓆩 𝐅𝐮𝐥𝐥 𝐀𝐥𝐛𝐮𝐦 𓆪 𝐑𝐚𝐝𝐢𝐨𝐡𝐞𝐚𝐝 – 𝐎𝐊 𝐂𝐨𝐦𝐩𝐮𝐭𝐞𝐫 💿🎧")).why,
    /disguised/,
  );
  const homogenic = { artist: "Björk", title: "Homogenic" };
  assert.equal(
    judge(video("Björk - Homogenic (Full Album HQ)", 43.6), homogenic, 43.6).ok,
    true,
  );
});
