/* The gaps between songs on the hero's record.

   A real LP shows its tracklist: the unmodulated land between two songs
   catches the light as a thin smooth ring, so you can count the songs on a
   side by eye. The disc used to draw three decorative rings on every album,
   which on a real record says "four songs" — for Donuts and for a one-track
   DJ set alike. It now draws one ring between each pair of songs, from the
   track count in lib/album-facts.json, and none at all when the count is not
   known.

   Geometry is a 12" LP's, as fractions of the disc's radius: the label
   covers 34% (the site's .vinyl-label is 34% of the diameter — the same
   proportion), the run-out groove sits between the label and ~42%, the music
   runs from 42% out to 95%, and the lead-in fills the edge. Songs play from
   the outside in, so track 1 is the outermost band.

   What is NOT known: each song's length. Only the count is stored, so the
   rings are evenly spaced. Constant angular velocity makes radius roughly
   proportional to playing time, so even spacing reads as "equal-length songs"
   — true of the count, approximate about the durations. */

export const MUSIC_INNER = 42; // % of radius
export const MUSIC_OUTER = 95;
/* More songs than this and the rings stop reading as rings: at 31 (Donuts)
   each gap is under half a pixel on the 180px disc and the set shimmers into
   moiré, worse on the 130px phone disc. 20 keeps ~2.4px between rings on
   desktop. The 15 catalog albums past it get no rings — never wrong, only
   less informative (measured in the browser, 2026-09-29). */
export const MAX_TRACKS = 20;

/** Ring positions for `tracks` songs, as [start, end] % of the radius, or
    null when there is nothing true to draw. */
export function trackBands(tracks) {
  if (!Number.isInteger(tracks) || tracks < 2 || tracks > MAX_TRACKS) {
    return null;
  }
  const span = MUSIC_OUTER - MUSIC_INNER;
  const pitch = span / tracks;
  // A gap is a fraction of a song, never wider than 1.4% of the radius
  const width = Math.min(1.4, pitch / 3);
  const bands = [];
  for (let k = 1; k < tracks; k++) {
    const centre = MUSIC_OUTER - k * pitch;
    bands.push([centre - width / 2, centre + width / 2]);
  }
  return bands;
}

const pct = (n) => `${+n.toFixed(2)}%`;

/** A single radial-gradient layer painting those rings in `color`, with a
    hairline of feathering so a 1px ring does not alias. */
export function trackBandsGradient(tracks, color = "var(--vinyl-band)") {
  const bands = trackBands(tracks);
  if (!bands) return null;
  const feather = 0.3;
  /* Stops must run inside-out. trackBands lists the outermost ring first, as
     the record plays; fed in that order, every stop after the first went
     backwards, the browser clamped them all onto the first ring, and exactly
     one ring rendered — while every geometry test passed. */
  const stops = [...bands]
    .reverse()
    .flatMap(([start, end]) => [
      `transparent ${pct(start - feather)}`,
      `${color} ${pct(start)}`,
      `${color} ${pct(end)}`,
      `transparent ${pct(end + feather)}`,
    ]);
  return `radial-gradient(circle closest-side, ${stops.join(", ")})`;
}
