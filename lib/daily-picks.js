import schedule from "./schedule.json" with { type: "json" };
import lyrics from "./lyrics.json" with { type: "json" };
import {
  ALBUMS,
  getAlbumForDate,
  getCoverPuzzleAlbum,
  getHeardleAlbum,
  getLyricAlbum,
  getPuzzleAlbum,
  getScrambleAlbum,
  getTastePair,
  getTodayKey,
  getVersusPair,
} from "./albums.js";

/* ─── The day's picks, recorded once ───────────────────────────────────────

   SERVER-ONLY. This imports the whole schedule and the lyric file; the
   browser must never load it. Pages receive the picks as props instead
   (app/section-page.js), and eval-site fails if a client component imports
   this module.

   Why it exists. Every pick — the featured album, each game's album, the two
   pairs — used to be computed from the current catalog on demand, in the
   browser. Votes are stored by date. So any catalog edit re-derived days that
   had already happened: adding one album relabelled all 30 Archive days, and
   removing 21 dead video ids on 2026-09-25 swapped that day's Blind Taste Test
   pair at 12:42 UTC, mid-contest, under votes keyed to the same date.

   Now a date's picks come from lib/schedule.json when it has them, and are
   computed only for dates that have not been recorded yet. The schedule is
   written by scripts/pin-schedule.mjs from the catalog at origin/master —
   what production is serving — so recording never re-derives the past from
   the edit that is about to change it. See docs/album-data.md.

   Albums are recorded by identity ("Artist::Title") and resolved against the
   current catalog, so a later data fix (a better video id, a corrected year)
   still reaches a recorded day. A recorded identity that no longer exists
   falls back to the computed pick rather than breaking the page; eval-site
   fails before that state can ship. */

export const albumId = (album) =>
  album ? `${album.artist}::${album.title}` : null;

const byId = new Map(ALBUMS.map((album) => [albumId(album), album]));
const LYRIC_KEYS = Object.keys(lyrics);
const DAYS = schedule.days || {};

// Noon UTC, so no timezone arithmetic can move a key onto a neighbouring day
const dateFromKey = (key) => new Date(`${key}T12:00:00Z`);

const shiftKey = (key, days) =>
  new Date(dateFromKey(key).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);

function recorded(id, compute) {
  return id && byId.has(id) ? byId.get(id) : compute();
}

function recordedPair(ids, compute) {
  if (Array.isArray(ids) && ids.length === 2 && ids.every((i) => byId.has(i))) {
    return { albumA: byId.get(ids[0]), albumB: byId.get(ids[1]) };
  }
  return compute();
}

/** The featured album for a date: recorded if the schedule has it. */
export function getFeaturedAlbum(key = getTodayKey()) {
  const album = recorded(DAYS[key]?.album, () =>
    getAlbumForDate(dateFromKey(key)),
  );
  return { ...album, key };
}

/** Every pick for one date. Games only ever run for today. */
export function getDailyPicks(key = getTodayKey()) {
  const date = dateFromKey(key);
  const day = DAYS[key] || {};
  return {
    key,
    album: getFeaturedAlbum(key),
    puzzle: recorded(day.puzzle, () => getPuzzleAlbum(date)),
    cover: recorded(day.cover, () => getCoverPuzzleAlbum(date)),
    heardle: recorded(day.heardle, () => getHeardleAlbum(date)),
    scramble: recorded(day.scramble, () => getScrambleAlbum(date)),
    lyric: recorded(day.lyric, () => getLyricAlbum(LYRIC_KEYS, date)),
    versus: recordedPair(day.versus, () => getVersusPair(date)),
    taste: recordedPair(day.taste, () => getTastePair(date)),
  };
}

/** What a page needs: today's picks, its neighbours, and the Archive run. */
export function getPageData({ archive = false } = {}) {
  const today = getTodayKey();
  return {
    picks: getDailyPicks(today),
    yesterday: getFeaturedAlbum(shiftKey(today, -1)),
    tomorrow: getFeaturedAlbum(shiftKey(today, 1)),
    // Only the Archive route pays for thirty albums in its payload
    archive: archive
      ? Array.from({ length: 30 }, (_, i) =>
          getFeaturedAlbum(shiftKey(today, -(i + 1))),
        )
      : null,
  };
}

/** Everything the pin script records for a date, as identities. It passes the
    committed lyric keys: the working file may already hold the edit that is
    about to change future picks, and the day being recorded predates it. */
export function computeDayIds(date, lyricKeys = LYRIC_KEYS) {
  const key = date.toISOString().slice(0, 10);
  const pair = (p) => [albumId(p.albumA), albumId(p.albumB)];
  return {
    album: albumId(getAlbumForDate(date)),
    puzzle: albumId(getPuzzleAlbum(date)),
    cover: albumId(getCoverPuzzleAlbum(date)),
    heardle: albumId(getHeardleAlbum(date)),
    scramble: albumId(getScrambleAlbum(date)),
    lyric: albumId(getLyricAlbum(lyricKeys, date)),
    versus: pair(getVersusPair(date)),
    taste: pair(getTastePair(date)),
    key,
  };
}
