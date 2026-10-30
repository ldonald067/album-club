#!/usr/bin/env node
/**
 * Find a YouTube video that is the WHOLE album, for every album that lacks
 * one, and check it before keeping it.
 *
 * Usage (npm run fetch-youtube-ids -- …; the key comes from .env):
 *   (no flags)            search the next batch, soonest-airing first
 *   --limit N             search at most N albums this run (default 95)
 *   --only "Artist::Title"  search that one album, even if already searched
 *   --plan                print what would be searched, in order; spends nothing
 *   --candidate out.json  write lib/albums.json with every pick applied, for
 *                         the audit; spends nothing
 *   --near-misses         list what the checks turned down that a person
 *                         might approve (REVIEWED_PICKS); spends nothing
 *
 * NEVER EDITS lib/albums.json. Every search goes in scripts/youtube-refetch.json:
 * the query, what came back, the pick or that there was none, and why each
 * result was turned down. That file is what lets a run stop at the quota and
 * carry on the next day, and it is the evidence behind the catalog change. The
 * catalog changes only when a person:
 *   1. writes the candidate: --candidate <file>
 *   2. audits it: npm run audit-youtube-ids -- --albums <file>
 *   3. reads the picks, copies the file over lib/albums.json, re-records with
 *      npm run audit-youtube-ids -- --record (reading every placement), and
 *      runs npm run pin-schedule — docs/album-data.md.
 *
 * WHY IT WAS REWRITTEN (2026-10-20). The first version searched
 * "{artist} {title} official audio" for recognizable albums only and stored
 * the first result, unchecked. The ids were for Heardle and the Taste Test,
 * where one song is enough, and the hero's player reused them: the
 * 2026-09-24 audit found most were one song, and 21 dead or wrong.
 *
 * What it does now, per album:
 *   - one search for "{artist} {title} full album" (a session entry: just the
 *     entry), embeddable videos only, 15 results;
 *   - one videos.list call for all of them: the real title (search titles are
 *     HTML-escaped), channel, length, and whether it can play embedded, is
 *     public, live, age-restricted or blocked in the US;
 *   - the checks in lib/youtube-match.js (judgeVideo): the title names the
 *     album and the artist (or it is the artist's channel), says nothing that
 *     makes it something else (a review, a live show, a slowed edit), says
 *     "full album" when it is not the artist's upload, and runs within
 *     FULL_RATIO of the album's runtime from lib/album-facts.json. A session
 *     entry must be the series' own upload of the whole set (SESSIONS).
 *
 * What it skips: an album whose stored video is already recorded as whole
 * (lib/full-album-videos.json), one already searched (unless --only), and one
 * with no runtime to check a length against that is not a session — a DJ
 * set or mood playlist has nothing a video could be measured against, so a
 * search would spend quota on a result that could never be kept.
 *
 * Quota: a search costs 100 units, a videos.list call 1, and the free tier
 * gives 10,000 a day — 95 albums a run leaves room. On quotaExceeded it
 * stops, saves, and says to run again tomorrow. The key goes in a header,
 * never the URL, so it cannot land in an error message or a log.
 */

import fs from "node:fs";
import path from "node:path";
import { getFeaturedAlbum } from "../lib/daily-picks.js";
import { fullAlbumKey } from "../lib/full-album-videos.js";
import {
  FULL_RATIO,
  isSessionEntry,
  judgeVideo,
  parseDuration,
  pickFullAlbum,
} from "../lib/youtube-match.js";

/* Near misses a person has watched and found to be the album — keyed on
   artist, album AND id, like the audit's KEPT_AFTER_REVIEW, so an approval
   cannot carry over to another video. The checks lean strict on purpose:
   Chillhop's own upload of "Chillhop Essentials Winter 2023" runs 71.8 of
   72 minutes and is turned down for the "[cozy instrumentals]" genre tag in
   its title, because an official "(Instrumentals)" upload of a rap album
   would look the same. --near-misses lists the candidates. Add one only
   after watching its first and last songs; --candidate applies it, ahead of
   any automatic pick for that album. */
const REVIEWED_PICKS = {};

const rootDir = process.cwd();
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const albumsPath = path.join(rootDir, "lib", "albums.json");
const logPath = path.join(rootDir, "scripts", "youtube-refetch.json");
const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;

const albums = readJson(albumsPath);
const facts = readJson(path.join(rootDir, "lib", "album-facts.json"), {});
const fullVideos = readJson(
  path.join(rootDir, "lib", "full-album-videos.json"),
  {},
);
const log = readJson(logPath, {});
const saveLog = () =>
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(log).sort(([a], [b]) => a.localeCompare(b)),
      ),
      null,
      2,
    ) + "\n",
  );

const idOf = (album) => `${album.artist}::${album.title}`;
const minutesOf = (album) => facts[idOf(album)]?.runtimeMinutes || null;
const today = new Date().toISOString().slice(0, 10);

/* A pick made under older rules is judged again under today's, from what
   the log kept of it — it passed the playability checks when it was made —
   and one that fails now is dropped, so that album is searched again rather
   than carried into a candidate. The rules have tightened after each
   batch read by eye: a reversed tracklist, a retuned copy, an uploader's
   crossfades and a disguised title (2026-10-20); a pitched-down copy,
   whispers laid over a record, a reordered reissue, styled letters and a
   set posted years before its night (2026-10-22); a tracklist with a song
   added, a record with its vocals or its band taken out, and what only a
   description admits (2026-10-30). The log keeps no description, so one of
   those is dropped through TURNED_DOWN. */
const stale = albums.filter((album) => {
  const entry = log[idOf(album)];
  if (!entry?.pick) return false;
  const { pick } = entry;
  return !judgeVideo(album, facts[idOf(album)] ?? null, {
    id: pick.id,
    title: pick.title,
    channel: pick.channel,
    published: pick.published,
    // the stored ratio, not the rounded minutes, so an edge case cannot flip
    seconds: pick.ratio
      ? pick.ratio * entry.albumMinutes * 60
      : pick.minutes * 60,
    embeddable: true,
    isPublic: true,
    live: false,
    ageRestricted: false,
    blockedInUS: false,
  }).ok;
});
if (stale.length) {
  console.log(
    `${stale.length} pick(s) fail today's rules and will be searched again:`,
  );
  for (const album of stale) {
    console.log(
      `  ${idOf(album)}  ${JSON.stringify(log[idOf(album)].pick.title)}`,
    );
    delete log[idOf(album)];
  }
  saveLog();
}

/* A video turned down only by the wording of its title — not by length,
   embedding, or naming another album — at a length inside FULL_RATIO. */
const nearMisses = (entry) =>
  (entry.rejected || []).filter((r) => {
    const ratio = entry.albumMinutes && r.minutes / entry.albumMinutes;
    return (
      ratio >= FULL_RATIO.min &&
      ratio <= FULL_RATIO.max &&
      /^title says|^not the artist's channel/.test(r.why)
    );
  });

if (args.includes("--near-misses")) {
  for (const [key, entry] of Object.entries(log)) {
    for (const r of nearMisses(entry)) {
      console.log(
        `  ${key}::${r.id}  ${r.minutes}m of ${entry.albumMinutes}m  ${r.why}` +
          `${entry.pick ? `  (picked ${entry.pick.id} anyway)` : ""}` +
          `\n      ${JSON.stringify(r.title)} — ${r.channel}`,
      );
    }
  }
  process.exit(0);
}

/* --candidate: the catalog with every pick applied. Formatted exactly as
   lib/albums.json is, so the diff after copying it over is the ids alone. */
const candidatePath = argValue("--candidate");
if (candidatePath) {
  const reviewed = new Map(
    Object.keys(REVIEWED_PICKS).map((key) => {
      const at = key.lastIndexOf("::");
      return [key.slice(0, at), key.slice(at + 2)];
    }),
  );
  let changed = 0;
  const candidate = albums.map((album) => {
    const id = reviewed.get(idOf(album)) ?? log[idOf(album)]?.pick?.id;
    if (!id || id === album.youtubeId) return album;
    changed++;
    return { ...album, youtubeId: id };
  });
  fs.writeFileSync(candidatePath, JSON.stringify(candidate, null, 2) + "\n");
  console.log(
    `Wrote ${candidatePath}: ${changed} album(s) take a new youtubeId.\n` +
      `Next: npm run audit-youtube-ids -- --albums ${candidatePath}`,
  );
  process.exit(0);
}

/* Soonest-airing first, so the first days of quota go to records visitors
   will see first. Featured days are read the way the site reads them, two
   years ahead; an album that does not air in that window goes last. */
const nextAir = new Map();
for (let i = 0; i < 730; i++) {
  const key = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
  const id = idOf(getFeaturedAlbum(key));
  if (!nextAir.has(id)) nextAir.set(id, key);
}

const only = argValue("--only");
const skipped = { whole: 0, searched: 0, noRuntime: 0 };
const queue = albums
  .filter((album) => {
    if (only) return idOf(album) === only;
    if (album.youtubeId && Object.hasOwn(fullVideos, fullAlbumKey(album))) {
      skipped.whole++;
      return false;
    }
    if (log[idOf(album)]) {
      skipped.searched++;
      return false;
    }
    if (!minutesOf(album) && !isSessionEntry(album)) {
      skipped.noRuntime++;
      return false;
    }
    return true;
  })
  .sort((a, b) =>
    (nextAir.get(idOf(a)) || "9999").localeCompare(
      nextAir.get(idOf(b)) || "9999",
    ),
  );

if (only && !queue.length) {
  console.error(`No album "${only}" in lib/albums.json (Artist::Title).`);
  process.exit(1);
}
const limit = Number(argValue("--limit") || 95);
console.log(
  `${queue.length} album(s) to search. Skipped: ${skipped.whole} already whole, ` +
    `${skipped.searched} already searched, ${skipped.noRuntime} with no runtime to check against.`,
);

if (args.includes("--plan")) {
  for (const album of queue) {
    const minutes = minutesOf(album);
    console.log(
      `  ${nextAir.get(idOf(album)) || "not in 2 years"}  ${idOf(album)}` +
        `  (${minutes ? `${minutes}m` : "session"}${album.youtubeId ? `, replaces ${album.youtubeId}` : ""})`,
    );
  }
  process.exit(0);
}

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error(
    "Missing YOUTUBE_API_KEY. Put it in .env (see .env.example); a key comes from the Google Cloud console, YouTube Data API v3.",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* One Data API call. A 5xx is retried; a quota refusal is marked so the run
   can stop and save rather than fail every album after it. */
async function api(endpoint, params) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(2000 * attempt);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams(params)}`,
      { headers: { "X-goog-api-key": API_KEY } },
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    const reason = body.error?.errors?.[0]?.reason || "";
    lastError = new Error(
      `${endpoint} ${res.status} ${reason}: ${body.error?.message || ""}`.trim(),
    );
    lastError.quota = /quotaExceeded|dailyLimitExceeded/.test(reason);
    if (res.status < 500) break;
  }
  throw lastError;
}

/* The Data API's length bands: "long" is over 20 minutes, "medium" 4 to 20.
   A band only narrows the search; every result is still measured. */
const durationBand = (minutes) =>
  !minutes ? "any" : minutes >= 22 ? "long" : minutes <= 18 ? "medium" : "any";

const toVideo = (item) => {
  const region = item.contentDetails?.regionRestriction;
  return {
    id: item.id,
    title: item.snippet?.title ?? "",
    channel: item.snippet?.channelTitle ?? "",
    published: item.snippet?.publishedAt?.slice(0, 10) ?? null,
    description: item.snippet?.description ?? "",
    seconds: parseDuration(item.contentDetails?.duration),
    embeddable: item.status?.embeddable === true,
    isPublic: item.status?.privacyStatus === "public",
    live: (item.snippet?.liveBroadcastContent ?? "none") !== "none",
    ageRestricted:
      item.contentDetails?.contentRating?.ytRating === "ytAgeRestricted",
    blockedInUS: Boolean(
      region?.blocked?.includes("US") ||
      (region?.allowed && !region.allowed.includes("US")),
    ),
  };
};

const brief = (video) => ({
  id: video.id,
  title: video.title,
  channel: video.channel,
  published: video.published,
  minutes: video.seconds === null ? null : +(video.seconds / 60).toFixed(1),
});

let searched = 0;
const picked = [];
let stoppedForQuota = false;
for (const album of queue.slice(0, limit)) {
  const minutes = minutesOf(album);
  const query = isSessionEntry(album)
    ? `${album.artist} ${album.title}`
    : `${album.artist} ${album.title} full album`;
  process.stdout.write(`\r  ${searched + 1}/${Math.min(queue.length, limit)}`);
  try {
    const found = await api("search", {
      part: "id",
      q: query,
      type: "video",
      videoEmbeddable: "true",
      videoDuration: durationBand(minutes),
      maxResults: "15",
    });
    const ids = (found.items || []).map((item) => item.id.videoId);
    const details = ids.length
      ? await api("videos", {
          part: "snippet,contentDetails,status",
          id: ids.join(","),
        })
      : { items: [] };
    // videos.list does not promise search order; put it back
    const byId = new Map((details.items || []).map((i) => [i.id, i]));
    const videos = ids
      .filter((id) => byId.has(id))
      .map((id) => toVideo(byId.get(id)));
    const { pick, judged } = pickFullAlbum(
      album,
      facts[idOf(album)] ?? null,
      videos,
    );
    log[idOf(album)] = {
      searched: today,
      query,
      albumMinutes: minutes,
      previousId: album.youtubeId || null,
      pick: pick
        ? {
            ...brief(pick.video),
            official: pick.official,
            ratio: pick.ratio === null ? null : +pick.ratio.toFixed(3),
          }
        : null,
      // What was turned down, and why — enough to see a near miss by eye
      rejected: judged
        .filter((j) => !j.ok)
        .slice(0, 8)
        .map((j) => ({ ...brief(j.video), why: j.why })),
    };
    if (pick) picked.push({ album, description: pick.video.description });
    searched++;
    saveLog();
  } catch (err) {
    if (err.quota) {
      stoppedForQuota = true;
      break;
    }
    // Not logged, so the next run tries this album again
    console.log(`\n  ${idOf(album)}: ${err.message}`);
  }
  await sleep(300);
}

console.log(`\n\nSearched ${searched}; ${picked.length} whole album(s) found.`);
for (const { album, description } of picked) {
  const entry = log[idOf(album)];
  const p = entry.pick;
  console.log(
    `  ${idOf(album)}  ${p.id}  ${p.minutes}m of ${entry.albumMinutes ?? "?"}m` +
      `${p.official ? ", artist's channel" : ""}${entry.previousId ? `, replaces ${entry.previousId}` : ""}` +
      `\n      ${JSON.stringify(p.title)} — ${p.channel}` +
      `\n      ${description.replace(/\s+/g, " ").slice(0, 400)}`,
  );
}
// A search that failed is not logged, so it leaves a gap in the queue
const near = queue
  .slice(0, limit)
  .filter((album) => log[idOf(album)] && !log[idOf(album)].pick)
  .flatMap((album) =>
    nearMisses(log[idOf(album)]).map(
      (r) => `  ${idOf(album)}::${r.id}  ${r.why}`,
    ),
  );
if (near.length) {
  console.log(
    `\nNear misses with no pick — read them, and approve one only after watching it (REVIEWED_PICKS):`,
  );
  for (const line of near) console.log(line);
}
const left = queue.length - searched;
if (stoppedForQuota)
  console.log("\nStopped at the daily quota. Run again tomorrow.");
if (left > 0) console.log(`${left} album(s) left to search.`);
console.log(
  `Log: ${path.relative(rootDir, logPath)}. When the searching is done: --candidate <file>, then the audit.`,
);
