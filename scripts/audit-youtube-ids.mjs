/**
 * Audit every stored youtubeId: does it play, is it the whole album, and if it
 * is one song — is that song even on this album?
 *
 * Usage: node scripts/audit-youtube-ids.mjs [--albums path.json] [--json out.json] [--record]
 *
 *   --albums  audit a different catalog file — e.g. a candidate refetch, before
 *             it is copied over lib/albums.json. Defaults to lib/albums.json.
 *   --json    also write the full per-video results to a file.
 *   --record  rewrite lib/full-album-videos.json from this run's FULL_ALBUM
 *             and FULL_SESSION verdicts — the list the hero's turntable is
 *             gated on (see
 *             lib/full-album-videos.js) — and lib/song-videos.json from the
 *             SONG_THIS_ALBUM ones it could place on the record (see
 *             placeSong, and lib/song-videos.js). Refused if any lookup
 *             errored, since an errored id would silently lose its turntable.
 *
 * No API key. Three sources per video: YouTube oEmbed (title, and whether the
 * video exists), the public watch page (length, and its playability status),
 * and the MusicBrainz tracklist of the release group lib/album-facts.json
 * already matched. MusicBrainz asks for one request per second and a
 * User-Agent that identifies the caller; both are honoured. A full run over
 * ~115 ids takes about four minutes.
 *
 * READ-ONLY on the catalog. It never edits it; --record writes only the
 * full-album and song lists beside it. Removing an id is a decision a person
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
 *                    20+ minutes when no runtime is known — AND its title
 *                    names the album, or two of its tracks. Length alone
 *                    passed any long upload (review finding, 2026-09-26).
 *   FULL_SESSION     a Tiny Desk, Boiler Room or KEXP entry whose video is
 *                    that series' own upload, titled as the whole set, and
 *                    long enough to be one — see SESSIONS. The entry IS the
 *                    session, so there is no album runtime to compare, a set
 *                    can run under FULL_ALBUM's 20-minute fallback, and its
 *                    title rarely repeats the catalog's: both Tiny Desk sets
 *                    were UNVERIFIED before this rule (2026-10-07).
 *   SONG_THIS_ALBUM  shorter, and the title names a track on this album.
 *   CLIP             under a minute and names no track: a teaser or a stub.
 *                    (A real short song still matches its track and passes —
 *                    NewJeans' "Get Up" is 36 seconds.)
 *   NOT_ON_ALBUM     tracklist known, title names none of it.
 *   UNVERIFIED       nothing to check it against (not in MusicBrainz — DJ
 *                    sets, Tiny Desk concerts), or a long upload whose title
 *                    names neither the album nor its tracks. Read by eye.
 *   ERROR            a lookup kept failing after retries. Not a verdict on
 *                    the video; re-run.
 *   PART             would have passed as FULL_ALBUM or FULL_SESSION, but is
 *                    in PART_AFTER_REVIEW: a person found it is one piece of
 *                    the record, not all of it. Never recorded; listed.
 *   KEPT             would have been flagged, but is in KEPT_AFTER_REVIEW: a
 *                    person watched it and kept it. Listed, never counted.
 */

import fs from "node:fs";
import path from "node:path";
import { MAX_TRACKS } from "../lib/vinyl-bands.js";

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
const record = args.includes("--record");
const fullAlbumsPath = path.join(rootDir, "lib", "full-album-videos.json");
const songsPath = path.join(rootDir, "lib", "song-videos.json");
const albums = JSON.parse(fs.readFileSync(albumsPath, "utf8"));
const facts = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "album-facts.json"), "utf8"),
);

/* Ids a person has looked at and decided to keep despite a flag. Reported, but
   not counted toward the exit code — otherwise every run on the real catalog
   exits 1 for the same two known cases, and the code stops meaning "something
   new broke". Add to this only after actually watching the video.
   Keyed on artist, album AND id: keyed on the id alone, an approved film
   copied under a different album would have passed as reviewed there too. */
const KEPT_AFTER_REVIEW = {
  "Weyes Blood::Titanic Rising::S5tedQCR4vM":
    "Weyes Blood's own 'Titanic Risen' film for the album — its music, as video (reviewed 2026-09-24)",
  "Chappell Roan::The Rise and Fall of a Midwest Princess::xR55tIcWNVg":
    "Chappell Roan's 'Episode 1: Homecoming' visual for the album (reviewed 2026-09-24)",
};
const keptKey = (album) =>
  `${album.artist}::${album.title}::${album.youtubeId}`;

/* The other way round: long, and its title names the album, so it passes —
   but a person looked and it is one piece of the record. Kept off the
   turntable list (--record), where it would sweep the arm across every song
   while one plays. Keyed like KEPT_AFTER_REVIEW. */
const PART_AFTER_REVIEW = {
  "Pink Floyd::Live at Pompeii::JQ2pTamaqQ4":
    "only 'Echoes', one of the film's pieces; passed because no runtime is known and the title names the album (reviewed 2026-10-08)",
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

/* One network hiccup used to throw out of the loop and end the whole ~4
   minute run with nothing written. Each request now retries, and a request
   that keeps failing becomes that one id's ERROR verdict. */
async function fetchRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    try {
      const res = await fetch(url, options);
      if (res.status === 503 || res.status === 429) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function oembed(id) {
  const res = await fetchRetry(
    `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`,
  );
  if (!res.ok) return { status: res.status };
  const body = await res.json();
  return { status: 200, title: body.title, channel: body.author_name };
}

async function watchPage(id) {
  const res = await fetchRetry(`https://www.youtube.com/watch?v=${id}`, {
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

/* Every title on any of the release group's editions (up to 25), merged and
   de-duplicated — what a video's title is matched against — and each
   edition's own running order as { title, ms }, which the merged set does
   not keep: a song's position and length come from the editions (placeSong). */
async function tracklist(releaseGroupId) {
  const res = await fetchRetry(
    `https://musicbrainz.org/ws/2/release?release-group=${releaseGroupId}&inc=recordings+media&limit=25&fmt=json`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
  const body = await res.json();
  const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
  const releases = (body.releases || []).map((release) =>
    [...(release.media || [])]
      .sort(byPosition)
      .flatMap((medium) =>
        [...(medium.tracks || [])]
          .sort(byPosition)
          .map((t) => ({ title: t.title, ms: t.length ?? null })),
      ),
  );
  return {
    titles: [...new Set(releases.flat().map((t) => t.title))],
    releases,
  };
}

/* The video's title names the album, as whole words. Length alone proved
   nothing: any 30–60 minute upload passed as the full album. */
const namesAlbum = (videoTitle, album) => {
  const key = norm(album.title);
  return key.length >= 2 && ` ${norm(videoTitle)} `.includes(` ${key} `);
};

const isDead = (oe, page) =>
  oe.status !== 200 ||
  (page.playability && page.playability !== "OK") ||
  page.seconds === null;

/* A named session played whole, as the series itself posted it. For each:
   the catalog entry names the series, the video is the series' own upload,
   its title says it is the whole set, and it runs long enough to be one. All
   four, because each alone is weak: a fan re-upload can copy the title but
   not the channel, the length tells a set from one song lifted out of it,
   and a long video under a session entry could be anything. `title` is the
   upload's title normalised and padded with spaces, so `has` matches whole
   words and "Tiny Desk (Home) Concert" counts too. */
const has = (title, words) => title.includes(` ${norm(words)} `);
const SESSIONS = [
  {
    // "NPR Tiny Desk: Mac Miller" — "Mac Miller: NPR Music Tiny Desk Concert"
    entry: /\btiny desk\b/i,
    channel: "NPR Music",
    minMinutes: 10,
    whole: (title, album) =>
      / tiny desk (home )?concert /.test(title) && has(title, album.artist),
  },
  {
    /* "Boiler Room: Montreal" — "Kaytranada | Boiler Room: Montreal". Named
       by the entry, not the artist: a city's night is "Various Artists".
       Sets run 40+ minutes; a shorter upload is a clip of one. */
    entry: /\bboiler room\b/i,
    channel: "Boiler Room",
    minMinutes: 20,
    whole: (title, album) => has(title, album.title),
  },
  {
    /* "KEXP Live Sessions: Khruangbin" — "Khruangbin - Full Performance (Live
       on KEXP)". Each song of a session is also posted on its own, as
       "Khruangbin - White Gloves ii (Live on KEXP)". */
    entry: /\bkexp\b/i,
    channel: "KEXP",
    minMinutes: 10,
    whole: (title, album) =>
      / full performance /.test(title) && has(title, album.artist),
  },
];
const isFullSession = (album, oe, page) =>
  Boolean(oe.title) &&
  SESSIONS.some(
    (session) =>
      session.entry.test(album.title) &&
      oe.channel === session.channel &&
      page.seconds >= session.minMinutes * 60 &&
      session.whole(` ${norm(oe.title)} `, album),
  );

/* Which song of the record a one-song video is, for the song-day turntable
   (lib/song-videos.js): { track, of, song }, or { why } it cannot be placed.
   The needle goes on that song's band, so every step must be certain:

   - The title names exactly one track, once the names it explains away are
     set aside: a track inside a longer one it names ("Sober" in "Sober II
     (Melodrama)"), the artist's own name when another track is named too
     (Slowdive's "Slowdive"), and the tracks the album's name accounts for
     when it names the album ("squabble up (GNX)" names "gnx" too). Most
     one-song videos are the title track — "Prince - Purple Rain (Official
     Video)" — so naming only the album is the title track, if its length
     agrees (below).
   - The rings are drawn: the count album-facts settled on (`tracks`, the
     consensus across editions) is 2–20 (lib/vinyl-bands.js).
   - An edition with exactly that many tracks has the song at one place, and
     every such edition agrees on where. The merged tracklist is no use for
     this — its order is not any edition's running order. (DAMN.'s collector's
     edition runs backwards; Born to Run has a cassette-sided edition.)
   - The video runs as long as that track, within SONG_LENGTH. Measured on
     all 72 one-song videos (2026-10-08): almost every one is within 5%. The
     ones that are not are what the needle cannot follow — a 13.7-minute film
     around Thriller's six, a video at twice its song's length, a 1.4-minute
     snippet — and the check is what settles a video that names only the
     album: it is the title track because it runs as long as the title track. */
const SONG_LENGTH = { min: 0.75, max: 1.35 };
function placeSong(album, videoTitle, videoMinutes, matched, releases, tracks) {
  let keys = [...new Set(matched.map(trackKey))];
  const within = (outer, inner) => ` ${outer} `.includes(` ${inner} `);
  keys = keys.filter((k) => !keys.some((o) => o !== k && within(o, k)));
  if (keys.length > 1) keys = keys.filter((k) => !within(norm(album.artist), k));
  if (namesAlbum(videoTitle, album)) {
    const others = keys.filter((k) => !within(norm(album.title), k));
    if (others.length) keys = others;
  }
  if (keys.length !== 1) return { why: `names ${keys.length} tracks` };
  if (!Number.isInteger(tracks)) return { why: "track count unknown" };
  if (tracks < 2 || tracks > MAX_TRACKS) {
    return { why: `${tracks} tracks: no rings drawn` };
  }
  const [key] = keys;
  const placings = new Map(); // track number -> that track on each edition
  for (const release of releases) {
    if (release.length !== tracks) continue;
    const at = release.flatMap((t, i) =>
      trackKey(t.title) === key ? [i + 1] : [],
    );
    if (at.length !== 1) continue;
    placings.set(at[0], [...(placings.get(at[0]) || []), release[at[0] - 1]]);
  }
  if (!placings.size) {
    return { why: `no ${tracks}-track edition has it, once` };
  }
  if (placings.size > 1) {
    return {
      why: `${tracks}-track editions disagree: track ${[...placings.keys()].join(" or ")}`,
    };
  }
  const [[track, onEditions]] = placings;
  const lengths = onEditions
    .map((t) => t.ms)
    .filter((ms) => ms > 0)
    .sort((a, b) => a - b);
  if (!lengths.length) return { why: "no track length to check against" };
  const trackMinutes = lengths[Math.floor(lengths.length / 2)] / 60000;
  const ratio = videoMinutes / trackMinutes;
  if (!(ratio >= SONG_LENGTH.min && ratio <= SONG_LENGTH.max)) {
    return {
      why: `the video runs ${videoMinutes.toFixed(1)}m, the track ${trackMinutes.toFixed(1)}m`,
    };
  }
  // The edition titles agree once folded; show the one most of them use
  const counts = new Map();
  for (const { title } of onEditions) {
    counts.set(title, (counts.get(title) || 0) + 1);
  }
  const [song] = [...counts].sort(
    ([a, n], [b, m]) => m - n || a.length - b.length,
  )[0];
  return { track, of: tracks, song };
}

const isLong = (page, albumMinutes) => {
  const minutes = page.seconds / 60;
  return albumMinutes ? minutes >= albumMinutes * 0.5 : minutes >= 20;
};

function verdictFor({
  oe,
  page,
  tracks,
  matched,
  albumMinutes,
  albumNamed,
  fullSession,
}) {
  if (isDead(oe, page)) return "DEAD";
  if (fullSession) return "FULL_SESSION";
  if (isLong(page, albumMinutes)) {
    // Long enough, and something ties it to this album: its title, or two
    // of its tracks named in the upload's title
    if (albumNamed || matched.length >= 2) return "FULL_ALBUM";
    return "UNVERIFIED";
  }
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
  const albumMinutes = fact?.runtimeMinutes || null;
  const keptNote = KEPT_AFTER_REVIEW[keptKey(album)];
  let oe = { status: null };
  let page = { seconds: null, playability: null };
  let tracks = null;
  let releases = [];
  let verdict;
  let error = null;

  try {
    oe = await oembed(album.youtubeId);
    await sleep(YT_DELAY_MS);
    page = await watchPage(album.youtubeId);
    await sleep(YT_DELAY_MS);

    const albumNamed = Boolean(oe.title) && namesAlbum(oe.title, album);
    /* The tracklist is fetched only when it can change the verdict — not for
       a dead video, a reviewed one, or a long upload that already names the
       album. It used to be fetched for every id. */
    const needsTracks =
      fact?.mbid &&
      !keptNote &&
      !isDead(oe, page) &&
      !(isLong(page, albumMinutes) && albumNamed);
    if (needsTracks) {
      ({ titles: tracks, releases } = await tracklist(fact.mbid));
      await sleep(MB_DELAY_MS);
    }
    const matched = oe.title && tracks ? namesTrack(oe.title, tracks) : [];
    const flaggedVerdict = verdictFor({
      oe,
      page,
      tracks,
      matched,
      albumMinutes,
      albumNamed,
      fullSession: isFullSession(album, oe, page),
    });
    const partNote = PART_AFTER_REVIEW[keptKey(album)];
    verdict =
      keptNote &&
      ["CLIP", "NOT_ON_ALBUM", "UNVERIFIED"].includes(flaggedVerdict)
        ? "KEPT"
        : partNote && ["FULL_ALBUM", "FULL_SESSION"].includes(flaggedVerdict)
          ? "PART"
          : flaggedVerdict;
    const placed =
      verdict === "SONG_THIS_ALBUM"
        ? placeSong(
            album,
            oe.title,
            page.seconds / 60,
            matched,
            releases,
            fact?.tracks,
          )
        : null;
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
      albumMinutes,
      matchedTracks: matched.slice(0, 3),
      ...(placed?.song
        ? { song: { track: placed.track, of: placed.of, song: placed.song } }
        : {}),
      ...(placed?.why ? { unplacedBecause: placed.why } : {}),
      ...(verdict === "KEPT" ? { keptBecause: keptNote } : {}),
      ...(verdict === "PART" ? { partBecause: partNote } : {}),
    });
  } catch (err) {
    error = String(err.message || err);
    results.push({
      artist: album.artist,
      album: album.title,
      id: album.youtubeId,
      verdict: "ERROR",
      error,
    });
  }
  process.stdout.write(`\r  ${i + 1}/${withId.length}`);
}

const ORDER = [
  "ERROR",
  "DEAD",
  "CLIP",
  "NOT_ON_ALBUM",
  "UNVERIFIED",
  "KEPT",
  "PART",
  "SONG_THIS_ALBUM",
  "FULL_ALBUM",
  "FULL_SESSION",
];
const counts = Object.fromEntries(ORDER.map((v) => [v, 0]));
for (const r of results) counts[r.verdict]++;

console.log("\n");
for (const v of ORDER) console.log(`  ${v.padEnd(16)} ${counts[v]}`);

// Everything a person should read before deciding; the healthy verdicts are
// only counted.
for (const v of [
  "ERROR",
  "DEAD",
  "CLIP",
  "NOT_ON_ALBUM",
  "UNVERIFIED",
  "KEPT",
  "PART",
]) {
  const rows = results.filter((r) => r.verdict === v);
  if (!rows.length) continue;
  console.log(`\n${v}`);
  for (const r of rows) {
    const why =
      v === "ERROR"
        ? `lookup failed: ${r.error}`
        : v === "DEAD"
          ? `oEmbed ${r.oembedStatus}, watch page ${r.playability ?? "?"}`
          : v === "KEPT"
            ? r.keptBecause
            : v === "PART"
              ? r.partBecause
              : `${r.videoMinutes}m — ${JSON.stringify(r.videoTitle)}`;
    console.log(`  ${r.artist} — ${r.album}  (${r.id})  ${why}`);
  }
}

/* The one-song videos: where each sits on the record, or why it does not.
   Placed songs are listed in full because the deck will claim them — read
   them as you would `git diff lib/lyrics.json`. */
const songRows = results.filter((r) => r.verdict === "SONG_THIS_ALBUM");
const placedRows = songRows.filter((r) => r.song);
if (songRows.length) {
  console.log(
    `\nSONGS ON THE RECORD  ${placedRows.length} of ${songRows.length} one-song videos placed`,
  );
  for (const r of placedRows) {
    console.log(
      `  ${r.artist} — ${r.album}  (${r.id})  track ${r.song.track} of ${r.song.of}, ${JSON.stringify(r.song.song)}  ← ${JSON.stringify(r.videoTitle)}`,
    );
  }
  console.log("  not placed:");
  for (const r of songRows.filter((row) => !row.song)) {
    console.log(
      `  ${r.artist} — ${r.album}  (${r.id})  ${r.unplacedBecause}  ← ${JSON.stringify(r.videoTitle)}`,
    );
  }
}

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nFull results: ${jsonOut}`);
}

/* Only FULL_ALBUM and FULL_SESSION go on the list: a KEPT film or an
   UNVERIFIED long upload may be the album's music without being the album
   played through, and the turntable's arm, its song rings and "heard all the
   way through" all claim exactly that. Keyed like KEPT_AFTER_REVIEW, so a refetched or reassigned id
   drops off the list rather than inheriting another video's verdict. */
if (record) {
  if (counts.ERROR) {
    console.log(
      `\n--record refused: ${counts.ERROR} id(s) errored, and recording now would drop them. Re-run.`,
    );
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const list = Object.fromEntries(
      results
        .filter((r) => ["FULL_ALBUM", "FULL_SESSION"].includes(r.verdict))
        .map((r) => [
          `${r.artist}::${r.album}::${r.id}`,
          {
            verdict: r.verdict,
            videoTitle: r.videoTitle,
            videoMinutes: r.videoMinutes,
            albumMinutes: r.albumMinutes,
            checked: today,
          },
        ])
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(fullAlbumsPath, JSON.stringify(list, null, 2) + "\n");
    console.log(
      `\nRecorded ${Object.keys(list).length} full-album videos in ${path.relative(rootDir, fullAlbumsPath)}.`,
    );
    /* And the one-song videos placed on the record, keyed the same way, for
       the song-day turntable (lib/song-videos.js). */
    const songs = Object.fromEntries(
      placedRows
        .map((r) => [
          `${r.artist}::${r.album}::${r.id}`,
          {
            track: r.song.track,
            of: r.song.of,
            song: r.song.song,
            videoTitle: r.videoTitle,
            videoMinutes: r.videoMinutes,
            checked: today,
          },
        ])
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2) + "\n");
    console.log(
      `Recorded ${Object.keys(songs).length} songs on the record in ${path.relative(rootDir, songsPath)}.`,
    );
  }
}

if (counts.ERROR) {
  console.log(
    `\n${counts.ERROR} id(s) could not be checked — network or rate limit. Re-run before deciding anything about them.`,
  );
}
const flagged = counts.DEAD + counts.CLIP + counts.NOT_ON_ALBUM;
if (flagged) {
  console.log(
    `\n${flagged} id(s) to review. DEAD is a proxy — confirm in a browser that the IFrame player fires onError before removing one.`,
  );
  process.exit(1);
}
console.log("\nNo dead, clipped or wrong-album ids.");
