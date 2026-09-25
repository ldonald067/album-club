/**
 * Audit every stored youtubeId: does it play, is it the whole album, and if it
 * is one song — is that song even on this album?
 *
 * Usage: node scripts/audit-youtube-ids.mjs [--albums path.json] [--json out.json]
 *
 *   --albums  audit a different catalog file — e.g. a candidate refetch, before
 *             it is copied over lib/albums.json. Defaults to lib/albums.json.
 *   --json    also write the full per-video results to a file.
 *
 * No API key. Three sources per video: YouTube oEmbed (title, and whether the
 * video exists), the public watch page (length, and its playability status),
 * and the MusicBrainz tracklist of the release group lib/album-facts.json
 * already matched. MusicBrainz asks for one request per second and a
 * User-Agent that identifies the caller; both are honoured. A full run over
 * ~115 ids takes about four minutes.
 *
 * READ-ONLY. It never edits the catalog. Removing an id is a decision a person
 * makes after reading the report — see the verdicts below and the history in
 * docs/album-data.md.
 *
 * Exits 1 if any id is DEAD, a CLIP or NOT_ON_ALBUM, so it can gate a refetch.
 *
 * WHY THIS EXISTS (2026-09-24): scripts/fetch-youtube-ids.mjs kept the first
 * search result for "artist title official audio", unchecked. Run over all
 * 135 ids, this found 39 full albums, 73 single songs, 13 the site's embedded
 * player refused, and 8 that were not the album's music at all — including a
 * 6-second clip under Nevermind and Bon Iver's "Skinny Love" under the wrong
 * album. The dead ones were breaking two games on about one day in six.
 *
 * Verdicts, in the order they are decided:
 *   DEAD             oEmbed says the video is gone, or the watch page reports
 *                    it unplayable. Watch-page status is a proxy: the ground
 *                    truth is whether the IFrame player fires onError (150 is
 *                    "not allowed in embeds"). In the 2026-09-24 run the proxy
 *                    agreed with the real embed for every one of the 13.
 *   FULL_ALBUM       at least half the album's runtime (from album-facts), or
 *                    20+ minutes when no runtime is known.
 *   SONG_THIS_ALBUM  shorter, and the title names a track on this album.
 *   CLIP             under a minute and names no track: a teaser or a stub.
 *                    (A real short song still matches its track and passes —
 *                    NewJeans' "Get Up" is 36 seconds.)
 *   NOT_ON_ALBUM     tracklist known, title names none of it.
 *   UNVERIFIED       no tracklist to check against (not in MusicBrainz — DJ
 *                    sets, Tiny Desk concerts). Read these by eye.
 *   KEPT             would have been flagged, but is in KEPT_AFTER_REVIEW: a
 *                    person watched it and kept it. Listed, never counted.
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const albumsPath = path.resolve(
  argValue("--albums") || path.join(rootDir, "lib", "albums.json"),
);
const jsonOut = argValue("--json");
const albums = JSON.parse(fs.readFileSync(albumsPath, "utf8"));
const facts = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "album-facts.json"), "utf8"),
);

/* Ids a person has looked at and decided to keep despite a flag. Reported, but
   not counted toward the exit code — otherwise every run on the real catalog
   exits 1 for the same two known cases, and the code stops meaning "something
   new broke". Add to this only after actually watching the video. */
const KEPT_AFTER_REVIEW = {
  S5tedQCR4vM:
    "Weyes Blood's own 'Titanic Risen' film for the album — its music, as video (reviewed 2026-09-24)",
  xR55tIcWNVg:
    "Chappell Roan's 'Episode 1: Homecoming' visual for the album (reviewed 2026-09-24)",
};

const USER_AGENT =
  "AlbumOfTheDayClub/1.0 (https://littlealbumclub.net) audit-youtube-ids";
const MB_DELAY_MS = 1100;
const YT_DELAY_MS = 250;
const CLIP_SECONDS = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Fold accents and combining marks (one upload spells it "lo̲ve̲l̲es̲s"),
   apostrophes and punctuation, so titles compare as plain words. */
const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* A track title as a video would write it. MusicBrainz lists "For Free?
   (Interlude)" and "Come Together - 2019 Mix"; an upload says "For Free?". The
   first version of this audit compared full titles and reported TPAB's own
   track as not on the album. */
const trackKey = (title) =>
  norm(title.replace(/\s*[([].*?[)\]]\s*/g, " ").replace(/\s+-\s+.*$/, ""));

// Titles too generic to identify anything on their own
const GENERIC = new Set([
  "intro",
  "outro",
  "interlude",
  "skit",
  "reprise",
  "untitled",
]);

/* Whole-word match, so short titles count. The first version skipped anything
   under four characters to avoid noise and so missed SZA's "SOS", Charli's
   "360" and Kendrick's "gnx" — all real tracks, all reported as wrong. */
const namesTrack = (videoTitle, tracks) => {
  const haystack = ` ${norm(videoTitle)} `;
  return tracks.filter((t) => {
    const key = trackKey(t);
    return (
      key.length >= 2 && !GENERIC.has(key) && haystack.includes(` ${key} `)
    );
  });
};

async function oembed(id) {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`,
  );
  if (!res.ok) return { status: res.status };
  const body = await res.json();
  return { status: 200, title: body.title, channel: body.author_name };
}

async function watchPage(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en" },
  });
  const html = await res.text();
  const seconds = html.match(/"lengthSeconds":"(\d+)"/);
  const status = html.match(/"playabilityStatus":\{"status":"([A-Z_]+)"/);
  return {
    seconds: seconds ? Number(seconds[1]) : null,
    playability: status ? status[1] : null,
  };
}

async function tracklist(releaseGroupId) {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release?release-group=${releaseGroupId}&inc=recordings+media&limit=25&fmt=json`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (!res.ok) return null;
  const body = await res.json();
  const titles = new Set();
  for (const release of body.releases || [])
    for (const medium of release.media || [])
      for (const track of medium.tracks || []) titles.add(track.title);
  return [...titles];
}

function verdictFor({ oe, page, tracks, matched, albumMinutes }) {
  if (oe.status !== 200) return "DEAD";
  if (page.playability && page.playability !== "OK") return "DEAD";
  if (page.seconds === null) return "DEAD";
  const minutes = page.seconds / 60;
  if (albumMinutes ? minutes >= albumMinutes * 0.5 : minutes >= 20)
    return "FULL_ALBUM";
  if (matched.length) return "SONG_THIS_ALBUM";
  if (page.seconds < CLIP_SECONDS) return "CLIP";
  if (tracks === null) return "UNVERIFIED";
  return "NOT_ON_ALBUM";
}

const withId = albums.filter((a) => a.youtubeId);
console.log(
  `Auditing ${withId.length} youtubeIds from ${path.relative(rootDir, albumsPath) || albumsPath}\n`,
);

const results = [];
for (const [i, album] of withId.entries()) {
  const fact = facts[`${album.artist}::${album.title}`];
  const oe = await oembed(album.youtubeId);
  await sleep(YT_DELAY_MS);
  const page = await watchPage(album.youtubeId);
  await sleep(YT_DELAY_MS);
  let tracks = null;
  if (fact?.mbid) {
    tracks = await tracklist(fact.mbid);
    await sleep(MB_DELAY_MS);
  }
  const matched = oe.title && tracks ? namesTrack(oe.title, tracks) : [];
  const flaggedVerdict = verdictFor({
    oe,
    page,
    tracks,
    matched,
    albumMinutes: fact?.runtimeMinutes || null,
  });
  const keptNote = KEPT_AFTER_REVIEW[album.youtubeId];
  const verdict =
    keptNote && ["CLIP", "NOT_ON_ALBUM", "UNVERIFIED"].includes(flaggedVerdict)
      ? "KEPT"
      : flaggedVerdict;

  results.push({
    artist: album.artist,
    album: album.title,
    id: album.youtubeId,
    verdict,
    videoTitle: oe.title || null,
    channel: oe.channel || null,
    oembedStatus: oe.status,
    playability: page.playability,
    videoMinutes:
      page.seconds === null ? null : +(page.seconds / 60).toFixed(1),
    albumMinutes: fact?.runtimeMinutes || null,
    matchedTracks: matched.slice(0, 3),
    ...(verdict === "KEPT" ? { keptBecause: keptNote } : {}),
  });
  process.stdout.write(`\r  ${i + 1}/${withId.length}`);
}

const ORDER = [
  "DEAD",
  "CLIP",
  "NOT_ON_ALBUM",
  "UNVERIFIED",
  "KEPT",
  "SONG_THIS_ALBUM",
  "FULL_ALBUM",
];
const counts = Object.fromEntries(ORDER.map((v) => [v, 0]));
for (const r of results) counts[r.verdict]++;

console.log("\n");
for (const v of ORDER) console.log(`  ${v.padEnd(16)} ${counts[v]}`);

// Everything a person should read before deciding; the healthy verdicts are
// only counted.
for (const v of ["DEAD", "CLIP", "NOT_ON_ALBUM", "UNVERIFIED", "KEPT"]) {
  const rows = results.filter((r) => r.verdict === v);
  if (!rows.length) continue;
  console.log(`\n${v}`);
  for (const r of rows) {
    const why =
      v === "DEAD"
        ? `oEmbed ${r.oembedStatus}, watch page ${r.playability ?? "?"}`
        : v === "KEPT"
          ? r.keptBecause
          : `${r.videoMinutes}m — ${JSON.stringify(r.videoTitle)}`;
    console.log(`  ${r.artist} — ${r.album}  (${r.id})  ${why}`);
  }
}

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nFull results: ${jsonOut}`);
}

const flagged = counts.DEAD + counts.CLIP + counts.NOT_ON_ALBUM;
if (flagged) {
  console.log(
    `\n${flagged} id(s) to review. DEAD is a proxy — confirm in a browser that the IFrame player fires onError before removing one.`,
  );
  process.exit(1);
}
console.log("\nNo dead, clipped or wrong-album ids.");
