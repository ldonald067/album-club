import { test } from "node:test";
import assert from "node:assert/strict";
import {
  armAngle,
  stylusAt,
  PIVOT,
  ARM_LENGTH,
  REST_ANGLE,
  BASE_RADIUS,
  TONEARM_VARS,
} from "../lib/tonearm.js";
import { MUSIC_INNER, MUSIC_OUTER } from "../lib/vinyl-bands.js";

const radiusAt = (angle) => Math.hypot(stylusAt(angle).x, stylusAt(angle).y);

test("the stylus starts on the first song and ends in the run-out", () => {
  assert.ok(Math.abs(radiusAt(armAngle(0)) - MUSIC_OUTER / 100) < 0.001);
  assert.ok(Math.abs(radiusAt(armAngle(1)) - MUSIC_INNER / 100) < 0.001);
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

test("parked, the arm and its bearing clear the record on the deck", () => {
  // Closest point of the parked arm (pivot to stylus) to the spindle
  const ux = -Math.sin((REST_ANGLE * Math.PI) / 180);
  const uy = Math.cos((REST_ANGLE * Math.PI) / 180);
  const t = Math.min(ARM_LENGTH, Math.max(0, -(PIVOT.x * ux + PIVOT.y * uy)));
  const nearest = Math.hypot(PIVOT.x + t * ux, PIVOT.y + t * uy);
  assert.ok(nearest > 1.08, `parked arm comes within ${nearest} radii`);
  assert.ok(Math.hypot(PIVOT.x, PIVOT.y) - BASE_RADIUS > 1.1, "bearing");
});

test("the stylus stays right of the sleeve's edge all the way in", () => {
  /* The record comes out of the sleeve far enough that the sleeve's edge sits
     at least 0.15 radii left of the spindle (globals.css, --vinyl-slide). A
     stylus left of that would play a record hidden inside its sleeve. */
  for (let p = 0; p <= 1.0001; p += 0.05) {
    assert.ok(stylusAt(armAngle(p)).x > -0.05, `stylus at ${p.toFixed(2)}`);
  }
});

test("the CSS starts the arm where the album starts", () => {
  assert.equal(TONEARM_VARS["--arm-angle"], `${armAngle(0)}deg`);
  assert.equal(TONEARM_VARS["--arm-rest"], `${REST_ANGLE}deg`);
  assert.equal(TONEARM_VARS["--pivot-x"], PIVOT.x);
});
