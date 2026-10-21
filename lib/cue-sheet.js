import { getClubCall } from "./soundtrack-corner.js";

/* The cue sheet and the club's tally, built from votes this browser already
   stores. Soundtrack Corner has kept every cue as aotd_soundtrack_<date> since
   it began, so both read history a visitor already has rather than starting
   from zero. The keys are only read here — renaming an aotd_* key silently
   discards everyone's history (CLAUDE.md).

   A date alone does not say which album aired, and the schedule is server-only,
   so the albums come from GET /api/soundtrack/days. */

export const CUE_PICKS = ["game", "film", "tv"];

const CUE_PREFIX = "aotd_soundtrack_";
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Every cue this browser has cast, newest first: [{ date, pick }]. A value
    that is not one of the three picks is skipped, never guessed at. Storage
    that throws (site data blocked, or the server render) reads as none. */
export function readStoredCues(storage) {
  const cues = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(CUE_PREFIX)) continue;
      const date = key.slice(CUE_PREFIX.length);
      const pick = storage.getItem(key);
      if (DATE_KEY.test(date) && CUE_PICKS.includes(pick)) {
        cues.push({ date, pick });
      }
    }
  } catch {
    return [];
  }
  return cues.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Each stored cue with the album that aired that day and the club's call on
    it, newest first. A day the server did not name — before the schedule's
    record began — is left out rather than given a guessed album. */
export function resolveCues(cues, albumsByDate) {
  return cues
    .filter(({ date }) => albumsByDate[date])
    .map(({ date, pick }) => {
      const album = albumsByDate[date];
      return { date, pick, album, club: getClubCall(album)?.pick || null };
    });
}

/** The shelves: every resolved cue filed under the medium it was cast for */
export function buildShelves(resolved) {
  const shelves = Object.fromEntries(CUE_PICKS.map((pick) => [pick, []]));
  for (const cue of resolved) shelves[cue.pick].push(cue);
  return shelves;
}

/** How often you and the club made the same call, counted only on days the
    club made one — a generated corner has no call to agree with. */
export function clubTally(resolved) {
  const called = resolved.filter((cue) => cue.club);
  return {
    agree: called.filter((cue) => cue.club === cue.pick).length,
    total: called.length,
  };
}

/* Your own pitch, on a day the club made no call. One line in this browser
   under aotd_cue_pitch_<date> — a key of its own, so nothing that reads the
   cues above ever sees it. It is never sent anywhere and only ever rendered as
   React text. */

export const PITCH_MAX = 120;

const PITCH_PREFIX = "aotd_cue_pitch_";

export function pitchKey(date) {
  return `${PITCH_PREFIX}${date}`;
}

/** One line, trimmed, at most PITCH_MAX characters. Empty means no pitch. */
export function cleanPitch(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PITCH_MAX)
    .trim();
}

/** Today's pitch, or "" when there is none or storage cannot be read */
export function readPitch(storage, date) {
  try {
    return cleanPitch(storage.getItem(pitchKey(date)));
  } catch {
    return "";
  }
}

/** Store a pitch, or remove it when the text is empty. Returns what was kept.
    A storage error is left to the caller, which has to say it was not saved. */
export function savePitch(storage, date, text) {
  const pitch = cleanPitch(text);
  if (pitch) storage.setItem(pitchKey(date), pitch);
  else storage.removeItem(pitchKey(date));
  return pitch;
}

/** Every pitch this browser holds, newest first: [{ date, text }] */
export function readStoredPitches(storage) {
  const pitches = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(PITCH_PREFIX)) continue;
      const date = key.slice(PITCH_PREFIX.length);
      const text = cleanPitch(storage.getItem(key));
      if (DATE_KEY.test(date) && text) pitches.push({ date, text });
    }
  } catch {
    return [];
  }
  return pitches.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Each pitch with the album it was written for. As with the cues, a day the
    server did not name is left out rather than given a guessed album. */
export function resolvePitches(pitches, albumsByDate) {
  return pitches
    .filter(({ date }) => albumsByDate[date])
    .map(({ date, text }) => ({ date, text, album: albumsByDate[date] }));
}
