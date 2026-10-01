/* What this browser remembers about the record on the deck. localStorage only,
   like every other per-visitor fact on the site, and private to the visitor:
   nothing here is sent anywhere.

   aotd_needle — where the needle was lifted today, so a reload or a return
   later the same day finds the arm where it was left and Play picks up from
   there. One key, overwritten, so old days never pile up; a different day or
   a different video reads as nothing. `heard` carries the seconds actually
   played so far, so a reload mid-album still counts toward a full play, and
   `d` the album's length, so the arm can be put back before the player has
   loaded.

   aotd_full_plays — the albums heard all the way through, as "artist::title"
   identities, so playing the same album twice counts once. "All the way
   through" means the album reached its end AND at least 90% of its length was
   actually played: a seek to the last minute reaches the end without hearing
   the album, and the run-out reward is for having heard it.

   Storage throws in browsers that block site data; every read here falls
   back to "nothing remembered" and every write is best-effort. */

export const NEEDLE_KEY = "aotd_needle";
export const FULL_PLAYS_KEY = "aotd_full_plays";
export const HEARD_ENOUGH = 0.9;

export function readNeedle(day, id) {
  try {
    const saved = JSON.parse(localStorage.getItem(NEEDLE_KEY));
    if (
      saved &&
      saved.day === day &&
      saved.id === id &&
      Number.isFinite(saved.t) &&
      saved.t >= 0
    ) {
      return {
        t: saved.t,
        heard:
          Number.isFinite(saved.heard) && saved.heard > 0 ? saved.heard : 0,
        d: Number.isFinite(saved.d) && saved.d > saved.t ? saved.d : 0,
      };
    }
  } catch {
    // Unreadable or malformed: nothing remembered
  }
  return null;
}

export function writeNeedle(day, id, t, heard, d) {
  try {
    localStorage.setItem(
      NEEDLE_KEY,
      JSON.stringify({
        day,
        id,
        t: Math.round(t * 10) / 10,
        heard: Math.round(heard),
        d: Math.round(d),
      }),
    );
  } catch {
    // Best-effort
  }
}

export function clearNeedle() {
  try {
    localStorage.removeItem(NEEDLE_KEY);
  } catch {
    // Best-effort
  }
}

/** Whether `heard` seconds of a `duration`-second album is a full play. */
export function heardThrough(heard, duration) {
  return duration > 0 && heard >= HEARD_ENOUGH * duration;
}

export function readFullPlays() {
  try {
    const list = JSON.parse(localStorage.getItem(FULL_PLAYS_KEY));
    if (Array.isArray(list)) return list.filter((x) => typeof x === "string");
  } catch {
    // Unreadable or malformed: none recorded
  }
  return [];
}

/** Record an album heard all the way through; returns how many there are. */
export function recordFullPlay(identity) {
  const list = readFullPlays();
  if (!list.includes(identity)) list.push(identity);
  try {
    localStorage.setItem(FULL_PLAYS_KEY, JSON.stringify(list));
  } catch {
    // Best-effort
  }
  return list.length;
}
