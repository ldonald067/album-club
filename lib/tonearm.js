/* The turntable on the hero: a deck beside the sleeve, a tonearm that is the
   progress bar, and the record you can play by hand.

   On an audio day the deck stands beside the sleeve with its arm parked.
   Press Play and the record slides out onto the platter and the arm swings
   onto the lead-in, then creeps toward the label as the album plays — a real
   stylus moves inward at a steady rate, because the groove's pitch is constant
   and the platter turns at a constant speed, so the radius falls in proportion
   to the time played. Pause lifts it where it is; Stop sends it home. The end
   of the album leaves it riding the run-out groove for a few seconds first.

   It also works the other way round: a click on the grooves, or the arm
   dragged and let go, drops the needle at that point of the album. The
   functions below turn a radius or an arm angle back into progress for that.

   Geometry is in units of the disc's radius, origin at the spindle of the
   record ON THE DECK, y pointing down, like the screen. The pivot sits off the
   record's top-right, as on a real turntable seen from above. Angles are CSS
   rotations of an arm that points straight down at 0°: positive turns it
   clockwise on screen, swinging the stylus left, toward the spindle.

   Everything the CSS draws the deck from comes from here as custom
   properties (DECK_VARS, set inline on .album-cover-wrap), so moving the pivot
   or resizing the plinth needs no second edit. */

import { MUSIC_INNER, MUSIC_OUTER } from "./vinyl-bands.js";

export const PIVOT = { x: 1.07, y: -0.89 };
export const ARM_LENGTH = 1.67;
/* Parked: leaning a few degrees out, so the arm clears the record on the deck
   by about a tenth of its radius rather than grazing its edge. */
export const REST_ANGLE = -4;
// The pivot's bearing, as a radius around the pivot
export const BASE_RADIUS = 0.11;
// How far the counterweight reaches back past the pivot
export const COUNTERWEIGHT = 0.3;
/* The headshell: its bottom centre is the stylus, and it is turned about that
   point toward the spindle, as an offset headshell is, so the angle never moves
   the stylus off the line the angles below are computed for. The finger lift
   sticks out from its far side. */
export const HEAD = { width: 0.13, length: 0.24, offset: 20, lift: 0.08 };
/* The deck, measured from the spindle: the plinth's four edges and the
   platter's radius. The platter is a little wider than the record, so its
   strobe-dotted rim shows around it; the plinth holds the platter, the parked
   arm and the counterweight (test/tonearm.test.mjs checks all three). */
export const DECK = { left: 1.2, right: 1.52, top: 1.26, bottom: 1.2 };
export const PLATTER = 1.1;
/* The run-out groove: past the last song (MUSIC_INNER) and short of the
   label, which covers 0.34 of the radius (.vinyl-label is 34% of the disc). */
export const RUNOUT_RADIUS = 0.38;
// A click inside this radius is on the label, not the grooves: it spins.
export const LABEL_EDGE = 0.4;

const DEG = 180 / Math.PI;
const PIVOT_DISTANCE = Math.hypot(PIVOT.x, PIVOT.y);
// The angle at which the arm would point straight at the spindle
const TOWARD_SPINDLE = Math.atan2(PIVOT.x, -PIVOT.y) * DEG;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** The arm angle that puts the stylus `r` radii from the spindle. */
export function angleAtRadius(r) {
  const cos =
    (PIVOT_DISTANCE ** 2 + ARM_LENGTH ** 2 - r ** 2) /
    (2 * PIVOT_DISTANCE * ARM_LENGTH);
  const offset = Math.acos(Math.min(1, Math.max(-1, cos))) * DEG;
  // The smaller of the two solutions: the near side of the record
  return TOWARD_SPINDLE - offset;
}

/** The arm angle `progress` (0 to 1) of the way through the album: from the
    first song's outer edge to the run-out, at the same radii the song rings
    use (lib/vinyl-bands.js). Out-of-range or missing progress clamps. */
export function armAngle(progress) {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const r = (MUSIC_OUTER - p * (MUSIC_OUTER - MUSIC_INNER)) / 100;
  return +angleAtRadius(r).toFixed(2);
}

export const RUNOUT_ANGLE = +angleAtRadius(RUNOUT_RADIUS).toFixed(2);

/** Where the stylus sits at `angle`, in radii from the spindle. */
export function stylusAt(angle) {
  const a = angle / DEG;
  return {
    x: PIVOT.x - ARM_LENGTH * Math.sin(a),
    y: PIVOT.y + ARM_LENGTH * Math.cos(a),
  };
}

/** How far through the album a needle `r` radii from the spindle is: 0 on the
    lead-in and outer edge, 1 at the last song's end. Clamps either side. */
export function progressAtRadius(r) {
  if (!Number.isFinite(r)) return 0;
  return clamp01((MUSIC_OUTER - r * 100) / (MUSIC_OUTER - MUSIC_INNER));
}

/** The same, for an arm at `angle`. */
export function progressAtAngle(angle) {
  const { x, y } = stylusAt(angle);
  return progressAtRadius(Math.hypot(x, y));
}

/* A song day: the video is one song (lib/song-videos.js), track `track` of
   `of`, and the needle plays only that song's band of the record. Songs are
   drawn evenly (lib/vinyl-bands.js), so track k fills (k−1)/n to k/n of the
   way through the album, and p of the way through the song is (k−1+p)/n. The
   player keeps counting in fractions of its video; these turn one into the
   other, and `song` is { track, of }. */

/** Where `song`'s band starts and ends, as album progress. */
export function songBand(song) {
  return { from: (song.track - 1) / song.of, to: song.track / song.of };
}

/** Album progress `p` (0 to 1) of the way through `song`. Clamps. */
export function songToAlbum(song, p) {
  const { from, to } = songBand(song);
  return from + (Number.isFinite(p) ? clamp01(p) : 0) * (to - from);
}

/** How far through `song` album progress `q` is. Clamps into the band, as a
    dragged arm let go beyond it does. */
export function albumToSong(song, q) {
  const { from, to } = songBand(song);
  return Number.isFinite(q) ? clamp01((q - from) / (to - from)) : 0;
}

/** Whether album progress `q` falls on `song`'s band: a click anywhere else
    on the record has nothing to play. */
export function inSongBand(song, q) {
  const { from, to } = songBand(song);
  return Number.isFinite(q) && q >= from && q <= to;
}

/** The arm angle that points at a spot `dx`, `dy` from the pivot. */
export function angleToward(dx, dy) {
  return Math.atan2(-dx, dy) * DEG;
}

/** A dragged arm goes no further out than its rest and no further in than
    the last song; the run-out is where the record takes it, not the hand. */
export function clampDragAngle(angle) {
  if (!Number.isFinite(angle)) return REST_ANGLE;
  return Math.min(armAngle(1), Math.max(REST_ANGLE, angle));
}

/** Whether an arm at `angle` has its stylus on the record at all. */
export function onRecord(angle) {
  const { x, y } = stylusAt(angle);
  return Math.hypot(x, y) <= 1;
}

/* How far right of the spindle the parked arm reaches — the bearing or the
   headshell's finger lift, whichever sticks out further. The plinth has to
   hold it: measured, the parked headshell sat 20px past the bearing and nearly
   touched the Play button when only the pivot was counted. */
function parkedReach() {
  const tip = stylusAt(REST_ANGLE);
  const a = (REST_ANGLE + HEAD.offset) / DEG;
  // The finger lift's end, relative to the stylus, before the head is turned
  const x = HEAD.width / 2 + HEAD.lift;
  const y = -HEAD.length * 0.8;
  const liftEnd = tip.x + x * Math.cos(a) - y * Math.sin(a);
  return Math.max(PIVOT.x + BASE_RADIUS, liftEnd);
}
export const ARM_REACH = +parkedReach().toFixed(3);

/** The custom properties the CSS draws the deck from. */
export const DECK_VARS = {
  "--pivot-x": PIVOT.x,
  "--pivot-y": PIVOT.y,
  "--arm-len": ARM_LENGTH,
  "--arm-base": BASE_RADIUS,
  "--arm-weight": COUNTERWEIGHT,
  "--head-w": HEAD.width,
  "--head-len": HEAD.length,
  "--head-offset": `${HEAD.offset}deg`,
  "--head-lift": HEAD.lift,
  "--arm-rest": `${REST_ANGLE}deg`,
  "--arm-runout": `${RUNOUT_ANGLE}deg`,
  "--arm-angle": `${armAngle(0)}deg`,
  "--deck-left": DECK.left,
  "--deck-right": DECK.right,
  "--deck-top": DECK.top,
  "--deck-bottom": DECK.bottom,
  "--platter": PLATTER,
};
