/* The tonearm on the hero's record: a progress bar drawn as the thing that
   actually tracks a record's progress.

   On an audio day the arm stands parked beside the sleeve. Press Play and it
   swings in onto the lead-in, then creeps toward the label as the album plays
   — a real stylus moves inward at a steady rate, because the groove's pitch is
   constant and the platter turns at a constant speed, so the radius falls in
   proportion to the time played. Pause lifts it where it is; Stop and the end
   of the record send it home.

   Geometry is in units of the disc's radius, origin at the spindle of the
   record ON THE DECK, y pointing down, like the screen. The pivot sits off the
   record's top-right, as on a real turntable seen from above. Angles are CSS
   rotations of an arm that points straight down at 0°: positive turns it
   clockwise on screen, swinging the stylus left, toward the spindle.

   The pivot, the arm's length and the angles all come from here; the CSS reads
   the pivot and length as custom properties (see .tonearm in globals.css), so
   moving the pivot needs no second edit. */

import { MUSIC_INNER, MUSIC_OUTER } from "./vinyl-bands.js";

export const PIVOT = { x: 1.07, y: -0.89 };
export const ARM_LENGTH = 1.67;
/* Parked: leaning a few degrees out, so the arm clears the record on the deck
   by about a tenth of its radius rather than grazing its edge. */
export const REST_ANGLE = -4;
// The pivot's bearing, as a radius around the pivot
export const BASE_RADIUS = 0.11;
/* The headshell: its bottom centre is the stylus, and it is turned about that
   point toward the spindle, as an offset headshell is, so the angle never moves
   the stylus off the line the angles below are computed for. The finger lift
   sticks out from its far side. */
export const HEAD = { width: 0.13, length: 0.24, offset: 20, lift: 0.08 };

const DEG = 180 / Math.PI;
const PIVOT_DISTANCE = Math.hypot(PIVOT.x, PIVOT.y);
// The angle at which the arm would point straight at the spindle
const TOWARD_SPINDLE = Math.atan2(PIVOT.x, -PIVOT.y) * DEG;

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
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const r = (MUSIC_OUTER - p * (MUSIC_OUTER - MUSIC_INNER)) / 100;
  return +angleAtRadius(r).toFixed(2);
}

/** Where the stylus sits at `angle`, in radii from the spindle. */
export function stylusAt(angle) {
  const a = angle / DEG;
  return {
    x: PIVOT.x - ARM_LENGTH * Math.sin(a),
    y: PIVOT.y + ARM_LENGTH * Math.cos(a),
  };
}

/* How far right of the spindle the parked arm reaches — the bearing or the
   headshell's finger lift, whichever sticks out further. This, not the pivot,
   is what the layout has to leave room for: measured, the parked headshell
   sat 20px past the bearing and nearly touched the Play button. */
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

/** The custom properties the CSS draws the arm from. */
export const TONEARM_VARS = {
  "--pivot-x": PIVOT.x,
  "--pivot-y": PIVOT.y,
  "--arm-len": ARM_LENGTH,
  "--arm-base": BASE_RADIUS,
  "--arm-reach": ARM_REACH,
  "--head-w": HEAD.width,
  "--head-len": HEAD.length,
  "--head-offset": `${HEAD.offset}deg`,
  "--head-lift": HEAD.lift,
  "--arm-rest": `${REST_ANGLE}deg`,
  "--arm-angle": `${armAngle(0)}deg`,
};
