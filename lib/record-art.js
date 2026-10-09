/* What the record wears on a day with nothing to play.

   On a day whose album has a video the record goes on the turntable. The
   other days — most of them — it used to be plain black vinyl in its sleeve.
   The owner asked for something fun there (2026-10-09), and chose all three
   of the patterns offered, taking turns, with their colours changing too:

   - a ZOETROPE: a ring of frames that animates when the record spins. Real
     zoetrope picture discs do this under a strobe light; on screen the spin
     is stepped (globals.css, .art-zoetrope), so each step carries every
     frame exactly into the next one's place and the dots bounce in place;
   - a SPIRAL: op-art that seems to flow as the record turns;
   - a PICTURE DISC: today's cover printed across the whole record.

   The pattern and the ink both come from the date, so every visitor sees
   the same record on the same day. Three patterns and seven inks (both
   prime) cycle independently: consecutive days never repeat a pattern, and a
   pattern comes back in a different colour. The inks are tokens in
   globals.css (--vinyl-ink-1 … 7), bright enough to read on black vinyl.

   Geometry is in a 200-unit box centred on the spindle, so 100 is the
   record's edge; the label covers 34 (.vinyl-label is 34% of the disc). */

export const ART_PATTERNS = ["zoetrope", "spiral", "picture"];
export const INKS = 7;

const mod = (n, m) => ((n % m) + m) % m;

/** Today's pattern and ink, from a "YYYY-MM-DD" key, or null. */
export function recordArt(dayKey) {
  const day = Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
  if (!Number.isFinite(day)) return null;
  return {
    pattern: ART_PATTERNS[mod(day, ART_PATTERNS.length)],
    ink: mod(day, INKS) + 1,
  };
}

/* The zoetrope: FRAMES dots, one per step of the stepped spin, so a turn is
   FRAMES steps. Each is a ball in a bounce BOUNCE frames long — out from the
   label and back, squashed a little at the bottom — and after one step every
   spot holds the next pose. A bounce is the same forwards and backwards, so
   it reads right whichever way the record turns (side B spins in reverse). */
export const FRAMES = 24;
const BOUNCE = 8;
const LOW = 50; // the bottom of the bounce, clear of the label
const HIGH = 86; // the top, inside the record's edge
const BALL = 4.2;
const SQUASH = 2.2;

export const ZOETROPE_FRAMES = Array.from({ length: FRAMES }, (_, k) => {
  const a = (k * 2 * Math.PI) / FRAMES;
  const h = Math.abs(Math.sin((Math.PI * k) / BOUNCE));
  const r = LOW + h * (HIGH - LOW);
  return {
    cx: +(Math.sin(a) * r).toFixed(2),
    cy: +(-Math.cos(a) * r).toFixed(2),
    r: +(BALL + (1 - h) * SQUASH).toFixed(2),
  };
});

/* The spiral: an Archimedean spiral, evenly spaced like a groove, from just
   outside the label to just inside the edge. Turning, it seems to pour
   toward the spindle, or away from it on side B. */
const SPIRAL_IN = 42;
const SPIRAL_OUT = 93;
const TURNS = 5;

function spiralPath() {
  const end = TURNS * 2 * Math.PI;
  const points = [];
  for (let t = 0; t <= end + 1e-9; t += 0.08) {
    const r = SPIRAL_IN + ((SPIRAL_OUT - SPIRAL_IN) * t) / end;
    points.push(
      `${(Math.cos(t) * r).toFixed(1)} ${(Math.sin(t) * r).toFixed(1)}`,
    );
  }
  return `M${points.join("L")}`;
}
export const SPIRAL_PATH = spiralPath();
export const SPIRAL_RANGE = { inner: SPIRAL_IN, outer: SPIRAL_OUT };
