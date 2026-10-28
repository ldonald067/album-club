import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  POSTERS,
  PARODY_BADGES,
  DISCLAIMER,
  LOOKS,
  PROMOS,
  CREDITS,
  posterFor,
  promoFor,
  badgesFor,
  errorFor,
  halloween,
  lookFor,
  ringNextTitle,
  showsRails,
} from "../lib/margin-rails.js";
import { SECTIONS, sectionPath } from "../app/sections.js";
import { ALBUMS, getAlbumForDate } from "../lib/albums.js";
import { getAlbumFacts } from "../lib/album-facts.js";
import { playsWholeAlbum } from "../lib/full-album-videos.js";
import { songOnRecord } from "../lib/song-videos.js";
import { recordPlays } from "../lib/tonearm.js";

/* A day as SectionPage builds it, from the real catalog. Days computed from
   the catalog rather than the pinned schedule — the copy only needs a real
   album on each, and every album in the catalog gets its turn. */
const dayAt = (ms) => {
  const date = new Date(ms);
  const album = getAlbumForDate(date);
  const facts = getAlbumFacts(album);
  const song = songOnRecord(album, facts?.tracks ?? null);
  return {
    dayKey: date.toISOString().slice(0, 10),
    album,
    facts,
    plays: recordPlays(album.youtubeId, playsWholeAlbum(album), song),
    song,
    yesterday: getAlbumForDate(new Date(ms - 86400000)),
    tomorrow: getAlbumForDate(new Date(ms + 86400000)),
    catalogSize: ALBUMS.length,
  };
};
const DAYS = Array.from({ length: 730 }, (_, i) =>
  dayAt(Date.UTC(2026, 0, 1 + i, 12)),
);
const RAIL_TABS = SECTIONS.map((s) => s.key).filter(showsRails);
const HOLE = /undefined|null|NaN|\[object|\$\{/;

test("every poster advertises a real tab", () => {
  for (const poster of POSTERS) {
    assert.doesNotThrow(() => sectionPath(poster.to), poster.id);
  }
  assert.equal(new Set(POSTERS.map((p) => p.id)).size, POSTERS.length);
});

test("two years of posters, every tab: no holes, and they fit the poster", () => {
  for (const day of DAYS) {
    for (const tab of RAIL_TABS) {
      const p = posterFor(day, tab);
      const where = `${day.dayKey} beside ${tab}: ${JSON.stringify(p)}`;
      assert.ok(p, where);
      assert.notEqual(p.to, tab, `${where} — advertises its own tab`);
      for (const text of [p.tease, p.head, p.body, p.cta]) {
        assert.ok(text && !HOLE.test(text), where);
      }
      // Measured on the poster: the teaser fills it at 34px, the punchline
      // sits above the record, the body above the stars
      assert.ok(p.tease.length <= 52, `${where} — tease ${p.tease.length}`);
      assert.ok(p.head.length <= 32, `${where} — head ${p.head.length}`);
      assert.ok(p.body.length <= 150, `${where} — body ${p.body.length}`);
      assert.ok(p.cta.length <= 13, `${where} — cta`);
    }
  }
});

test("the copy changes with the day by itself", () => {
  const week = DAYS.slice(0, 7).map((d) => posterFor(d, "stats").body);
  assert.equal(new Set(week).size, 7, "a week of posters, all different");
  const year = new Set(
    DAYS.slice(0, 365).map((d) => posterFor(d, "stats").body),
  );
  // Dead Air's frame turns with the weekday and the joke about the
  // disclaimer never changes; every other poster carries the day's album
  assert.ok(year.size >= 240, `${year.size} different posters in a year`);
});

test("every frame gets a turn over two years", () => {
  // A frame that never fires is copy nobody sees. The last frame of a
  // poster is its fallback, needed only when a fact is missing.
  const seen = new Set();
  for (const day of DAYS) {
    for (const tab of RAIL_TABS) {
      const p = posterFor(day, tab);
      const poster = POSTERS.find((x) => x.id === p.id);
      seen.add(`${p.id}:${poster.frames.findIndex((f) => f(day))}`);
    }
  }
  const unreached = POSTERS.flatMap((p) =>
    p.frames
      .slice(0, -1)
      .map((_, i) => `${p.id}:${i}`)
      .filter((k) => !seen.has(k)),
  );
  assert.deepEqual(unreached, []);
});

test("the song poster names the song the turntable lights", () => {
  const day = DAYS.find((d) => d.plays === "song" && !halloween(d.dayKey));
  const turntable = POSTERS.find((p) => p.id === "turntable");
  const copy = turntable.frames.map((f) => f(day)).find(Boolean);
  assert.match(
    copy.body,
    new RegExp(`Track ${day.song.track} of ${day.song.of}`),
  );
  assert.ok(copy.body.includes(day.song.title));
});

test("Halloween week: 24–31 October, counting down, every year", () => {
  assert.equal(halloween("2026-10-23"), null);
  assert.equal(halloween("2026-10-24"), 7);
  assert.equal(halloween("2026-10-30"), 1);
  assert.equal(halloween("2027-10-31"), 0);
  assert.equal(halloween("2026-11-01"), null);
  assert.equal(halloween("2026-03-31"), null);
});

test("in Halloween week the poster dresses up and Dead Air has every other day", () => {
  const week = DAYS.filter((d) => halloween(d.dayKey) !== null);
  assert.equal(week.length, 16, "eight days in each of two years");
  for (const tab of RAIL_TABS) {
    const posters = week.map((d) => posterFor(d, tab));
    assert.ok(
      posters.every((p) => p.spooky),
      tab,
    );
    const deadAir = posters.filter((p) => p.id === "dead-air").length;
    assert.ok(deadAir >= 8, `${tab}: Dead Air on ${deadAir} of 16 days`);
  }
  const night = DAYS.find((d) => d.dayKey === "2026-10-31");
  const deadAir = POSTERS.find((p) => p.id === "dead-air").frames[0](night);
  assert.equal(deadAir.head, "Tonight's the night.");
  const before = DAYS.find((d) => d.dayKey === "2026-10-30");
  assert.equal(
    POSTERS.find((p) => p.id === "dead-air").frames[0](before).head,
    "1 night to Halloween.",
  );
  assert.ok(
    !DAYS.filter((d) => halloween(d.dayKey) === null).some(
      (d) => posterFor(d, "home").spooky,
    ),
    "no costume outside the week",
  );
});

test("the poster changes its look on Mondays only, and every look takes its turn", () => {
  const seen = new Set();
  for (const day of DAYS.filter((d) => halloween(d.dayKey) === null)) {
    const look = lookFor(day.dayKey);
    seen.add(look.id);
    assert.equal(posterFor(day, "home").look, look, day.dayKey);
    const at = Date.parse(`${day.dayKey}T12:00:00Z`);
    const yesterday = new Date(at - 86400000).toISOString().slice(0, 10);
    if (halloween(yesterday) !== null) continue;
    const monday = new Date(at).getUTCDay() === 1;
    assert.equal(lookFor(yesterday) !== look, monday, day.dayKey);
  }
  assert.deepEqual([...seen].sort(), LOOKS.map((l) => l.id).sort());
  assert.equal(new Set(LOOKS.map((l) => l.id)).size, LOOKS.length);
});

test("Halloween week wears its own costume, not the week's look", () => {
  for (const day of DAYS.filter((d) => halloween(d.dayKey) !== null)) {
    assert.equal(lookFor(day.dayKey), null, day.dayKey);
    assert.equal(posterFor(day, "home").look, null, day.dayKey);
  }
});

test("every look but classic has a costume in globals.css and a sticker that fits", () => {
  const css = fs.readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  for (const look of LOOKS) {
    if (look.id === "classic") {
      assert.equal(look.sticker, null);
      continue;
    }
    assert.ok(css.includes(`.rail-look-${look.id} {`), look.id);
    // and in both :is() lists, for sentence case and a one-line button
    const listed = css.match(
      new RegExp(`\\.rail-look-${look.id}(?=\\s*[,)])`, "g"),
    );
    assert.ok(listed?.length >= 2, `${look.id}: in the shared :is() lists`);
    // Measured on the record at 1380px: "FREE SCAN" and "SHOCKING!" fit
    assert.ok(look.sticker && look.sticker.length <= 9, look.id);
  }
});

test("badges fit an 88×31 micro-banner, every day", () => {
  for (const day of DAYS) {
    const badges = badgesFor(day);
    assert.equal(badges.length, 7);
    assert.equal(new Set(badges.map((b) => b.small)).size, badges.length);
    for (const b of badges) {
      const where = `${day.dayKey}: ${b.small} / ${b.big}`;
      assert.ok(!HOLE.test(b.small + b.big + b.icon), where);
      // Measured in the browser: ten pixel-type characters, seven bold
      assert.ok(b.small.length <= 10 && b.big.length <= 7, where);
      assert.ok(b.icon.length >= 1 && b.icon.length <= 2, where);
      assert.match(b.look, /^[a-d]$/);
    }
  }
  const halloweenNight = badgesFor(DAYS.find((d) => d.dayKey === "2026-10-31"));
  assert.ok(halloweenNight.some((b) => b.big === "TONIGHT"));
});

test("every 1990s parody badge takes its turn", () => {
  const seen = new Set(DAYS.flatMap((d) => badgesFor(d).map((b) => b.small)));
  for (const b of PARODY_BADGES) assert.ok(seen.has(b.small), b.small);
});

test("the fake error box: no holes, and OK goes somewhere else", () => {
  for (const day of DAYS) {
    for (const tab of RAIL_TABS) {
      const e = errorFor(day, tab);
      const where = `${day.dayKey} beside ${tab}: ${JSON.stringify(e)}`;
      assert.ok(!HOLE.test(e.title + e.message), where);
      assert.ok(e.title.length <= 14, where);
      assert.ok(e.message.length <= 110, `${where} — ${e.message.length}`);
      assert.notEqual(e.to, tab, where);
      assert.doesNotThrow(() => sectionPath(e.to));
    }
  }
});

test("every square advertises a real tab and has its costume in globals.css", () => {
  const css = fs.readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.equal(new Set(PROMOS.map((p) => p.id)).size, PROMOS.length);
  for (const promo of PROMOS) {
    assert.doesNotThrow(() => sectionPath(promo.to), promo.id);
    assert.ok(css.includes(`.rail-promo-${promo.id} {`), promo.id);
  }
});

/* Each square's copy at the lengths it was measured at in the browser,
   at 1380px in both skins (2026-10-28): nothing left its square or
   overlapped. The layouts differ — the warning's head is 11px, the
   monkey's 14px Arial Black — so one limit for all of them would pass
   copy that does not fit. Lengthen a line and this fails until it is
   measured again. The search field carries the day's genre, and every
   value it can take (112 of them) was measured: 16 characters fit. */
const MEASURED = {
  monkey: { kicker: 14, head: 11, cta: 4, fine: 21 },
  winner: { kicker: 16, head: 20, cta: 14, fine: 12 },
  balloon: { kicker: 15, head: 25, cta: 11, fine: 12 },
  search: { kicker: 16, field: 16, cta: 2, fine: 26 },
  download: { kicker: 13, head: 4, cta: 8, fine: 36 },
  click: { kicker: 13, head: 13, fine: 44 },
  warning: { kicker: 7, head: 34, cta: 6, fine: 35 },
};

test("two years of squares, every tab: no holes, and the copy is as measured", () => {
  assert.deepEqual(
    Object.keys(MEASURED).sort(),
    PROMOS.map((p) => p.id).sort(),
  );
  for (const day of DAYS) {
    for (const tab of RAIL_TABS) {
      const p = promoFor(day, tab);
      const where = `${day.dayKey} beside ${tab}: ${JSON.stringify(p)}`;
      assert.notEqual(p.to, tab, `${where} — advertises its own tab`);
      assert.notEqual(p.to, posterFor(day, tab).to, `${where} — the poster's`);
      const fields = ["kicker", "head", "field", "cta", "fine"];
      for (const f of fields) {
        const limit = MEASURED[p.id][f];
        if (limit === undefined) {
          assert.equal(p[f], undefined, `${where} — ${f} was never measured`);
          continue;
        }
        assert.ok(p[f] && !HOLE.test(p[f]), `${where} — ${f}`);
        assert.ok(p[f].length <= limit, `${where} — ${f} ${p[f].length}`);
      }
    }
  }
});

test("every square takes its turn beside every tab but its own, within half its share", () => {
  for (const tab of RAIL_TABS) {
    const count = {};
    for (const d of DAYS) {
      const id = promoFor(d, tab).id;
      count[id] = (count[id] || 0) + 1;
    }
    const due = PROMOS.filter((p) => p.to !== tab).map((p) => p.id);
    assert.deepEqual(Object.keys(count).sort(), due.sort(), tab);
    // A square cannot air on its poster's day, and the poster's days are
    // not even: two posters advertise the FAQ, and Dead Air has every
    // other day in Halloween week. So beside Stats the FAQ square airs 70
    // days in two years and the square that stands in for it 173. Each
    // still gets more than half its share and less than half as much
    // again (tried 2026-10-28: no other stand-in did better without
    // repeating the day before).
    const share = DAYS.length / due.length;
    for (const [id, n] of Object.entries(count)) {
      assert.ok(
        n > share / 2 && n < share * 1.5,
        `${tab}: ${id} ${n} days — ${JSON.stringify(count)}`,
      );
    }
  }
});

test("the square never repeats the day before", () => {
  for (const tab of RAIL_TABS) {
    for (let i = 1; i < DAYS.length; i++) {
      assert.notEqual(
        promoFor(DAYS[i], tab).id,
        promoFor(DAYS[i - 1], tab).id,
        `${DAYS[i].dayKey} beside ${tab}`,
      );
    }
  }
});

test("the square takes the poster's tab from the caller as it would find it", () => {
  for (const day of DAYS.slice(0, 60)) {
    for (const tab of RAIL_TABS) {
      assert.deepEqual(
        promoFor(day, tab, posterFor(day, tab).to),
        promoFor(day, tab),
      );
    }
  }
});

test("the search square types the day's genre, or gives up on a long one", () => {
  const search = PROMOS.find((p) => p.id === "search");
  const at = (genre) => search.copy({ album: { genre } }).field;
  assert.equal(at("Hip-Hop/Soul"), "Hip-Hop");
  assert.equal(at("Progressive Rock"), "Progressive Rock");
  assert.equal(at("Progressive Electronic"), "albums");
});

test("the credit links the three exhibitions the formats came from", () => {
  assert.deepEqual(
    CREDITS.map((c) => c.name),
    ["Web Design Museum", "Luna Media", "Vintage Computing"],
  );
  for (const c of CREDITS) assert.match(c.href, /^https:\/\//);
});

test("the disclaimer owns up to all four fakes", () => {
  for (const word of [
    "Parody",
    "badges",
    "poster",
    "square",
    "error box",
    "won",
    "X",
  ]) {
    assert.ok(DISCLAIMER.includes(word), word);
  }
});

test("tomorrow gives away its genre and decade, as the teaser does, no more", () => {
  for (const day of DAYS.slice(0, 60)) {
    const title = ringNextTitle(day);
    assert.ok(!title.includes(day.tomorrow.title), day.dayKey);
    assert.ok(!title.includes(day.tomorrow.artist), day.dayKey);
    const next = badgesFor(day).find((b) => b.small === "NEXT UP");
    assert.ok(!next.big.includes(day.tomorrow.title));
  }
});

test("the game tabs keep their margins: their frames go wide", () => {
  assert.equal(showsRails("cozy"), false);
  assert.equal(showsRails("dead-air"), false);
  for (const key of ["home", "soundtrack", "archive", "stats", "faq"]) {
    assert.equal(showsRails(key), true, key);
  }
});
