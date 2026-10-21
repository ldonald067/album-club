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
