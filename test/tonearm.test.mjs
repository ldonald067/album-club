import { test } from "node:test";
import assert from "node:assert/strict";
import {
  armAngle,
  stylusAt,
  progressAtAngle,
  progressAtRadius,
  angleToward,
  clampDragAngle,
  onRecord,
  PIVOT,
  ARM_LENGTH,
  REST_ANGLE,
  BASE_RADIUS,
  COUNTERWEIGHT,
  ARM_REACH,
  DECK,
  PLATTER,
  RUNOUT_RADIUS,
  RUNOUT_ANGLE,
  LABEL_EDGE,
  DECK_VARS,
} from "../lib/tonearm.js";
import { MUSIC_INNER, MUSIC_OUTER } from "../lib/vinyl-bands.js";

const radiusAt = (angle) => Math.hypot(stylusAt(angle).x, stylusAt(angle).y);
const near = (a, b, eps = 0.002) => Math.abs(a - b) < eps;

test("the stylus starts on the first song and ends in the run-out", () => {
  assert.ok(near(radiusAt(armAngle(0)), MUSIC_OUTER / 100));
  assert.ok(near(radiusAt(armAngle(1)), MUSIC_INNER / 100));
  assert.ok(near(radiusAt(RUNOUT_ANGLE), RUNOUT_RADIUS));
});

test("the run-out groove sits between the last song and the label", () => {
  assert.ok(RUNOUT_RADIUS < MUSIC_INNER / 100);
  assert.ok(RUNOUT_RADIUS > 0.34, "the label covers 0.34 of the radius");
  assert.ok(LABEL_EDGE > RUNOUT_RADIUS && LABEL_EDGE <= MUSIC_INNER / 100);
});

test("the arm only ever moves inward as the album plays", () => {
  let lastAngle = -Infinity;
  let lastRadius = Infinity;
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const angle = armAngle(p);
    assert.ok(angle > lastAngle, `angle at ${p.toFixed(2)}`);
    assert.ok(radiusAt(angle) < lastRadius, `radius at ${p.toFixed(2)}`);
    lastAngle = angle;
    lastRadius = radiusAt(angle);
  }
});

test("out-of-range progress clamps instead of leaving the record", () => {
  assert.equal(armAngle(-1), armAngle(0));
  assert.equal(armAngle(2), armAngle(1));
  for (const bad of [NaN, Infinity, null, undefined, "0.5"]) {
    assert.equal(armAngle(bad), armAngle(0), String(bad));
  }
});

test("a dropped needle lands where the arm would have played to", () => {
  // Angle → progress is the inverse of progress → angle
  for (let p = 0; p <= 1.0001; p += 0.1) {
    assert.ok(
      near(progressAtAngle(armAngle(p)), Math.min(p, 1), 0.005),
      `${p}`,
    );
  }
  // The lead-in and the edge are the start; the run-out and label the end
  assert.equal(progressAtRadius(0.98), 0);
  assert.equal(progressAtRadius(1.2), 0);
  assert.equal(progressAtRadius(MUSIC_INNER / 100), 1);
  assert.equal(progressAtRadius(0.2), 1);
  assert.equal(progressAtRadius(NaN), 0);
  assert.ok(near(progressAtRadius((MUSIC_OUTER + MUSIC_INNER) / 200), 0.5));
});

test("a dragged arm follows the pointer and stays between rest and the last song", () => {
  // Pointing at the stylus's own spot gives back the arm's angle
  for (const angle of [REST_ANGLE, 0, 12, 25, armAngle(1)]) {
    const tip = stylusAt(angle);
    assert.ok(near(angleToward(tip.x - PIVOT.x, tip.y - PIVOT.y), angle, 1e-6));
  }
  assert.equal(clampDragAngle(-40), REST_ANGLE);
  assert.equal(clampDragAngle(80), armAngle(1));
  assert.equal(clampDragAngle(20), 20);
  assert.equal(clampDragAngle(NaN), REST_ANGLE);
  assert.equal(onRecord(REST_ANGLE), false, "parked is off the record");
  assert.equal(onRecord(armAngle(0)), true);
});

test("parked, the arm and its bearing clear the record on the deck", () => {
  // Closest point of the parked arm (pivot to stylus) to the spindle
  const ux = -Math.sin((REST_ANGLE * Math.PI) / 180);
  const uy = Math.cos((REST_ANGLE * Math.PI) / 180);
  const t = Math.min(ARM_LENGTH, Math.max(0, -(PIVOT.x * ux + PIVOT.y * uy)));
  const nearest = Math.hypot(PIVOT.x + t * ux, PIVOT.y + t * uy);
  assert.ok(nearest > 1.08, `parked arm comes within ${nearest} radii`);
  assert.ok(Math.hypot(PIVOT.x, PIVOT.y) - BASE_RADIUS > 1.1, "bearing");
});

test("the plinth holds the platter, the parked arm and the counterweight", () => {
  assert.ok(PLATTER > 1, "the platter's rim shows around the record");
  assert.ok(DECK.left > PLATTER && DECK.bottom > PLATTER, "platter fits");
  assert.ok(DECK.top > PLATTER, "platter fits");
  assert.ok(DECK.right > ARM_REACH + 0.05, "the parked headshell fits");
  assert.ok(DECK.top > -(PIVOT.y - COUNTERWEIGHT), "the counterweight fits");
  assert.ok(DECK.bottom > stylusAt(REST_ANGLE).y + 0.05, "the stylus fits");
});

test("the stylus stays right of the sleeve's edge all the way in", () => {
  /* The record comes out of the sleeve far enough that the sleeve's edge sits
     at least 0.15 radii left of the spindle (globals.css, --vinyl-slide). A
     stylus left of that would play a record hidden inside its sleeve. */
  for (let p = 0; p <= 1.0001; p += 0.05) {
    assert.ok(stylusAt(armAngle(p)).x > -0.05, `stylus at ${p.toFixed(2)}`);
  }
  assert.ok(stylusAt(RUNOUT_ANGLE).x > -0.05, "run-out");
});

test("the CSS draws the deck from these numbers", () => {
  assert.equal(DECK_VARS["--arm-angle"], `${armAngle(0)}deg`);
  assert.equal(DECK_VARS["--arm-rest"], `${REST_ANGLE}deg`);
  assert.equal(DECK_VARS["--arm-runout"], `${RUNOUT_ANGLE}deg`);
  assert.equal(DECK_VARS["--pivot-x"], PIVOT.x);
  assert.equal(DECK_VARS["--deck-right"], DECK.right);
  assert.equal(DECK_VARS["--platter"], PLATTER);
});
