/**
 * Audit every catalog entry's identity: is it a real release, and is it filed
 * under the artist who made it?
 *
 * Usage: node scripts/audit-catalog-identity.mjs [--albums path.json] [--json out.json]
 *
 *   --albums  audit a different catalog file — e.g. a candidate, before it is
 *             copied over lib/albums.json. Defaults to lib/albums.json.
 *   --json    also write the full per-entry results to a file.
 *
 * No API key. An entry lib/album-facts.json already matched is VERIFIED
 * without a request: that match cleared five independent checks (score,
 * primary type, artist, title, year — see docs/album-data.md). For everything
 * else the artist is resolved by name *or alias* (MusicBrainz keeps many names
 * in their native script), and that artist's albums, EPs and singles are
 * browsed and matched locally — search cannot tokenize "E•MO•TION" into
 * "Emotion". MusicBrainz asks for one request per second and an identifying
 * User-Agent; both are honoured. ~80 unmatched entries take ~5 minutes.
 *
 * READ-ONLY. It never edits the catalog. Removing or renaming an entry is a
 * decision a person makes after reading the report — and an entry that has
 * already aired is recorded in lib/schedule.json, so renaming or removing it
 * breaks those days (eval-site names them). The report lists each entry's
 * aired and upcoming dates so that cost is visible before anyone decides.
 *
 * Exits 1 if any entry is BORROWED_TITLE or UNTRACEABLE and not in DECIDED.
 *
 * WHY THIS EXISTS (2026-09-27): an adversarial review of the catalog noticed
 * that some entries borrow a real album's name under an artist that looks
 * invented — "Late Night Ambient — Geogaddi Ambient Mix" (Geogaddi is Boards
 * of Canada's), "Late Night Vibes — Vespertine Chill Mix" (Vespertine is
 * Björk's). These air as today's album and get rated.
 *
 * Verdicts, in the order they are decided:
 *   VERIFIED            matched in lib/album-facts.json. No request made.
 *   RELEASE_FOUND       this artist has a matching release, but the strict
 *                       fetcher skipped it. Usually a spelling or year
 *                       disagreement, not an identity problem — but read the
 *                       notes: NOT AN ALBUM (it is a single) and YEAR (the
 *                       catalog's year differs by more than one) are real
 *                       metadata faults, and a far-off year can mean the
 *                       nearest match is a different record altogether.
 *   BORROWED_TITLE      a mix-shaped title whose core ("Geogaddi Ambient Mix"
 *                       → "geogaddi") is exactly an album by someone else, or
 *                       an unknown artist whose whole title is. A full-title
 *                       hit under a stranger is NOT counted for a real artist:
 *                       "Zombie" and "Promises" exist under dozens.
 *   SERIES_SESSION      names a real series (Boiler Room, Essential Mix,
 *                       Cercle, Tiny Desk, KEXP, Anjunadeep Edition). The
 *                       series is real; a person confirms this performance is.
 *   MOOD_COMPILATION    "Various Artists", or mix/playlist wording, and no
 *                       release: a mood, not a record. It cannot be tied to
 *                       any tracklist.
 *   COMPILATION         Various Artists without mix wording, no match: may be
 *                       a real compilation under a shortened title.
 *   ARTIST_ONLY         the artist exists in MusicBrainz, the release does not.
 *                       Generic names ("Nature Sounds") exist there too, so
 *                       for those this is weak evidence.
 *   UNTRACEABLE         neither the artist nor the release exists.
 *   DECIDED             would have been flagged, but is in DECIDED: a person
 *                       looked and ruled. Listed, never counted.
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const albumsPath = path.resolve(
  argValue("--albums") || path.join(rootDir, "lib", "albums.json"),
);
const jsonOut = argValue("--json");
const albums = JSON.parse(fs.readFileSync(albumsPath, "utf8"));
const facts = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "album-facts.json"), "utf8"),
);
const schedule = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "schedule.json"), "utf8"),
);

/* Entries a person has looked at and ruled on despite a flag, keyed on the
   catalog id (artist AND title — never on something an unrelated entry could
   share). Add to this only after actually checking the record. */
const DECIDED = {
  "Late Night Ambient::Geogaddi Ambient Mix":
    "kept as a mix by owner decision; mixes are allowed in the catalog (reviewed 2026-09-27)",
  "Late Night Vibes::Vespertine Chill Mix":
    "kept as a mix by owner decision; mixes are allowed in the catalog (reviewed 2026-09-27)",
};

const USER_AGENT =
  "AlbumOfTheDayClub/1.0 (https://littlealbumclub.net) audit-catalog-identity";
const MB_DELAY_MS = 1100;
const MIN_SCORE = 80;
const UPCOMING_DAYS = 365;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const idOf = (album) => `${album.artist}::${album.title}`;

const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SERIES =
  /\b(boiler room|essential mix|cercle|tiny desk|kexp|anjunadeep edition)\b/i;

/* Words that make a title describe a mood rather than name a record. Stripping
   them leaves the "core" a borrowed title hides behind: "Geogaddi Ambient Mix"
   → "geogaddi". */
const MOOD_WORDS =
  /\b(mix|chill|ambient|vibes?|collection|playlist|radio|beats?|lofi|lo fi|sounds?|for|to|sleep|study|studying|code|focus|deep|binaural|slow jams|drive|midnight|late night|rainy day|cozy|winter|sunday morning|coffee|peaceful|piano|jazz|anime|city pop|synthwave|retrowave|korean|japanese|french house|r and b|90s|homework|calm)\b/g;
const isMoodShaped = (album) =>
  /\b(mix|playlist|collection|radio|beats to|sounds for|slow jams|lofi)\b/i.test(
    album.title,
  ) || /\/(mix|focus|nature)\b/i.test(album.genre);
const coreTitle = (title) =>
  norm(title).replace(MOOD_WORDS, " ").replace(/\s+/g, " ").trim();

/* "Floating Points, Pharoah Sanders & LSO" is three artists; MusicBrainz knows
   each separately. */
const artistParts = (artist) =>
  artist
    .split(/\s*(?:,|&|\band\b|\bwith\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

async function mbGet(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(MB_DELAY_MS * (attempt + 1));
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 503) continue; // rate limited — back off and retry
      if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 2) return { error: String(err.message || err) };
    }
  }
  return { error: "MusicBrainz kept answering 503" };
}

async function mb(entity, query) {
  const url = new URL(`https://musicbrainz.org/ws/2/${entity}/`);
  url.search = new URLSearchParams({ query, fmt: "json", limit: "25" });
  return mbGet(url);
}

const creditOf = (rg) =>
  (rg["artist-credit"] || [])
    .map((c) => c.name + (c.joinphrase || ""))
    .join("") ||
  rg.browsedArtist ||
  "";
const rgSummary = (rg) =>
  `"${rg.title}" by ${creditOf(rg)} (${rg["primary-type"] || "no type"}${
    rg["secondary-types"]?.length
      ? ` / ${rg["secondary-types"].join(", ")}`
      : ""
  }, ${rg["first-release-date"] || "no date"})`;

/* Titles compare as plain words and, failing that, with spaces squeezed out:
   MusicBrainz spells Carly Rae Jepsen's record "E•MO•TION". One must contain
   the other, growing by at most 2× — the fetcher's rule, so "Cross" cannot
   match "A Cross the Universe". */
const squeeze = (s) => norm(s).replace(/ /g, "");
function sameTitle(a, b) {
  for (const f of [norm, squeeze]) {
    const x = f(a);
    const y = f(b);
    if (!x || !y) continue;
    if (x === y) return true;
    const [short, long] = x.length <= y.length ? [x, y] : [y, x];
    if (long.includes(short) && long.length <= short.length * 2) return true;
  }
  return false;
}

/* Title variants worth searching: the catalog's, and with a parenthetical or
   a "Series:" prefix removed — "Weezer (Blue Album)" is "Weezer" there. */
const titleVariants = (title) =>
  [
    ...new Set([
      title,
      title.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
      /* After a series name the colon introduces the performer — "Essential
         Mix: Four Tet" stripped to "Four Tet" matched his DJ-Kicks. */
      title.includes(":") && !SERIES.test(title)
        ? title.split(":").slice(1).join(":").trim()
        : "",
    ]),
  ].filter(Boolean);

/* Resolve each credited artist to a MusicBrainz id. Aliases count: the
   database keeps many names in their native script — BTS is 방탄소년단 and
   Ichiko Aoba is 青葉市子 — so matching on the display name alone reported
   real artists as nonexistent. */
/* Credits compare with "and"/"&"/"|" and spacing ignored: MusicBrainz keeps
   Robert Plant & Alison Krauss as one duo entity, "Robert Plant | Alison
   Krauss", which owns Raising Sand — neither solo artist does. So a
   collaboration is tried whole first, then part by part. */
const artistKey = (s) => norm(s).replace(/\band\b/g, "").replace(/ /g, "");

async function resolveArtists(artist) {
  if (/^various artists$/i.test(artist)) return { various: true, found: [] };
  const parts = artistParts(artist);
  const names = parts.length > 1 ? [artist, ...parts] : parts;
  const found = [];
  for (const name of names) {
    const res = await mb("artist", `artist:"${name}" OR alias:"${name}"`);
    if (res.error) return { error: res.error };
    const target = artistKey(name);
    const hit = (res.artists || []).find(
      (a) =>
        !a.name.startsWith("[") && // "[no artist]", "[unknown]": placeholders
        (artistKey(a.name) === target ||
        artistKey(a["sort-name"] || "") === target ||
        (a.aliases || []).some((al) => artistKey(al.name) === target)),
    );
    if (hit && !found.some((f) => f.id === hit.id)) found.push(hit);
  }
  return { found };
}
const artistLabel = (a) =>
  `${a.name}${a.disambiguation ? ` (${a.disambiguation})` : ""}`;

/* Browse each artist's release groups and match locally, rather than trust
   search: Lucene cannot tokenize "E•MO•TION" into "Emotion", and a credit in
   another script — or "London Symphony Orchestra" for "LSO" — defeats a name
   query. Among matches, an album beats a single and the nearest year wins, so
   "Weezer (Blue Album)" lands on 1994's Weezer rather than 2001's. */
async function artistReleaseGroups(artist) {
  const all = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const body = await mbGet(
      `https://musicbrainz.org/ws/2/release-group?artist=${artist.id}&type=album|ep|single&limit=100&offset=${offset}&fmt=json`,
    );
    if (body.error) return { error: body.error };
    const page = body["release-groups"] || [];
    all.push(...page.map((rg) => ({ ...rg, browsedArtist: artist.name })));
    if (!page.length || all.length >= (body["release-group-count"] ?? 0)) break;
  }
  return { groups: all };
}

/* "SIMBI" is how everyone writes Little Simz's "Sometimes I Might Be
   Introvert". */
const initials = (s) =>
  norm(s)
    .split(" ")
    .map((w) => w[0])
    .join("");

const rgYear = (rg) => Number((rg["first-release-date"] || "").slice(0, 4)) || null;

async function findUnderArtist(album, artists) {
  const variants = titleVariants(album.title);
  const matches = [];
  for (const artist of artists.slice(0, 2)) {
    const { groups, error } = await artistReleaseGroups(artist);
    if (error) return { error };
    for (const rg of groups) {
      /* norm() drops scripts it cannot fold, so "AKIRAのテーマ" squeezes to
         "akira". A title that loses letters that way is never exact. */
      const lossless = !/\p{L}/u.test(
        rg.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[a-z]/gi, ""),
      );
      const exact =
        lossless && variants.some((t) => squeeze(t) === squeeze(rg.title));
      const loose = variants.some((t) => sameTitle(rg.title, t));
      const acronym =
        album.title.length >= 3 &&
        /^[A-Z0-9]+$/.test(album.title) &&
        initials(rg.title) === album.title.toLowerCase();
      if (exact || loose || acronym) matches.push({ rg, exact, acronym });
    }
  }
  const isAlbum = (rg) => ["Album", "EP"].includes(rg["primary-type"]);
  /* A single only counts when its title is exact — "Weightless" really is a
     single. A single that merely contains the title ("Windswept Adan roots")
     says nothing about the album. */
  /* A loose title match years away is a different record — "AKIRA REMIX"
     (2024) is not 1988's Akira, "Spirited Away Suite" (2019) not the 2001
     score. Exact titles keep a far year and get it reported instead. */
  const near = (rg) => Math.abs((rgYear(rg) ?? album.year) - album.year) <= 1;
  const usable = matches.filter(
    (m) => (isAlbum(m.rg) || m.exact) && (m.exact || m.acronym || near(m.rg)),
  );
  if (!usable.length) return {};
  const dist = (rg) => Math.abs((rgYear(rg) ?? 9999) - album.year);
  usable.sort(
    (x, y) =>
      Number(isAlbum(y.rg)) - Number(isAlbum(x.rg)) ||
      Number(y.exact) - Number(x.exact) ||
      dist(x.rg) - dist(y.rg),
  );
  return { hit: usable[0].rg, acronym: usable[0].acronym };
}

/* A borrowed title, looked for only where it means something. Any common
   title — "Zombie", "Promises" — exists under some stranger, so a full-title
   hit elsewhere is evidence only when the credited artist does not exist. For
   a mix-shaped title the core is checked instead, and must be distinctive
   (6+ characters, exact, score 100) — "Coffee Shop Radio" leaves "shop". */
async function findElsewhere(album, artistKnown) {
  const candidates = [];
  if (!artistKnown) candidates.push({ title: album.title, strict: false });
  const core = coreTitle(album.title);
  if (isMoodShaped(album) && core.length >= 6 && core !== norm(album.title))
    candidates.push({ title: core, strict: true });

  for (const { title, strict } of candidates) {
    const res = await mb("release-group", `releasegroup:"${title}"`);
    if (res.error) return { error: res.error };
    const hit = (res["release-groups"] || []).find(
      (rg) =>
        (rg.score ?? 0) >= (strict ? 100 : 90) &&
        ["Album", "EP"].includes(rg["primary-type"]) &&
        norm(rg.title) === norm(title) &&
        !/^various artists$/i.test(creditOf(rg)),
    );
    if (hit) return { hit, via: title };
  }
  return {};
}

/* Air dates: recorded days from the schedule, then the rotation for the rest
   of the next year — the same computation production makes for an unrecorded
   day. */
async function airDates() {
  const { getAlbumForDate } = await import(
    path.join(rootDir, "lib", "albums.js")
  );
  const aired = new Map();
  const upcoming = new Map();
  const push = (map, id, date) => map.set(id, [...(map.get(id) || []), date]);

  const today = new Date().toISOString().slice(0, 10);
  for (const [date, day] of Object.entries(schedule.days)) {
    const id = typeof day === "string" ? day : day.album;
    push(date <= today ? aired : upcoming, id, date);
  }
  const start = new Date(`${schedule.pinnedThrough}T12:00:00Z`);
  for (let i = 1; i <= UPCOMING_DAYS; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    push(upcoming, idOf(getAlbumForDate(d)), d.toISOString().slice(0, 10));
  }
  return { aired, upcoming };
}

async function auditOne(album) {
  const id = idOf(album);
  if (facts[id])
    return { verdict: "VERIFIED", evidence: `MusicBrainz ${facts[id].mbid}` };

  const artists = await resolveArtists(album.artist);
  if (artists.error) return { verdict: "ERROR", evidence: artists.error };
  const known = artists.found.length > 0;
  const who = artists.found.map(artistLabel).join(", ");

  if (known) {
    const under = await findUnderArtist(album, artists.found);
    if (under.error) return { verdict: "ERROR", evidence: under.error };
    if (under.hit) {
      const notes = [];
      if (!["Album", "EP"].includes(under.hit["primary-type"]))
        notes.push("NOT AN ALBUM");
      const year = rgYear(under.hit);
      if (year && Math.abs(year - album.year) > 1)
        notes.push(`YEAR: catalog ${album.year}, MusicBrainz ${year}`);
      if (under.acronym) notes.push("title is its initials");
      return {
        verdict: "RELEASE_FOUND",
        evidence: `${rgSummary(under.hit)}${notes.length ? ` — ${notes.join("; ")}` : ""}`,
      };
    }
  }

  /* A Various Artists record has no owner to borrow from: "Tropicália" under
     a 2010 EP by one band says nothing about a 1968 compilation. */
  const elsewhere = artists.various ? {} : await findElsewhere(album, known);
  if (elsewhere.error) return { verdict: "ERROR", evidence: elsewhere.error };
  if (elsewhere.hit) {
    return {
      verdict: "BORROWED_TITLE",
      evidence: `"${elsewhere.via}" is ${rgSummary(elsewhere.hit)}`,
    };
  }

  if (SERIES.test(album.title)) {
    return {
      verdict: "SERIES_SESSION",
      evidence: artists.various
        ? "series is real; credited to Various Artists, so no performer to check"
        : known
          ? `series is real; performer in MusicBrainz: ${who}`
          : "series is real; performer NOT found in MusicBrainz",
    };
  }
  if (artists.various && !isMoodShaped(album)) {
    return {
      verdict: "COMPILATION",
      evidence:
        "Various Artists, not mix-shaped — may be a real compilation filed under a shortened title",
    };
  }
  if (artists.various || isMoodShaped(album)) {
    return {
      verdict: "MOOD_COMPILATION",
      evidence: artists.various
        ? "Various Artists, no release"
        : `mix/playlist-shaped, no release; ${known ? `an artist named ${who} exists` : "artist not in MusicBrainz"}`,
    };
  }
  if (known) return { verdict: "ARTIST_ONLY", evidence: `artist: ${who}` };
  return { verdict: "UNTRACEABLE", evidence: "no artist, no release" };
}

const ORDER = [
  "BORROWED_TITLE",
  "UNTRACEABLE",
  "MOOD_COMPILATION",
  "ARTIST_ONLY",
  "COMPILATION",
  "SERIES_SESSION",
  "RELEASE_FOUND",
  "DECIDED",
  "ERROR",
  "VERIFIED",
];
const FAILING = new Set(["BORROWED_TITLE", "UNTRACEABLE"]);

const { aired, upcoming } = await airDates();
const results = [];
const toCheck = albums.filter((a) => !facts[idOf(a)]).length;
let checked = 0;

for (const album of albums) {
  const id = idOf(album);
  let result = await auditOne(album);
  if (result.verdict !== "VERIFIED") {
    checked++;
    process.stderr.write(`\r${checked}/${toCheck} checked`);
  }
  if (DECIDED[id] && result.verdict !== "VERIFIED") {
    result = {
      verdict: "DECIDED",
      evidence: `${result.verdict}: ${DECIDED[id]}`,
    };
  }
  results.push({
    id,
    year: album.year,
    genre: album.genre,
    recognizable: Boolean(album.recognizable),
    ...result,
    aired: aired.get(id) || [],
    next: (upcoming.get(id) || [])[0] || null,
  });
}
process.stderr.write("\n");

const counts = Object.fromEntries(ORDER.map((v) => [v, 0]));
for (const r of results) counts[r.verdict]++;

console.log(
  `Catalog identity audit — ${albums.length} entries (${path.relative(rootDir, albumsPath)})\n`,
);
for (const v of ORDER)
  if (counts[v]) console.log(`  ${v.padEnd(18)} ${counts[v]}`);

for (const v of ORDER) {
  if (v === "VERIFIED" || !counts[v]) continue;
  console.log(`\n## ${v}\n`);
  for (const r of results.filter((x) => x.verdict === v)) {
    const airedNote = r.aired.length
      ? `aired ${r.aired.length}× (last ${r.aired.at(-1)})`
      : "not yet aired";
    console.log(
      `- ${r.id} (${r.year}, ${r.genre}${r.recognizable ? ", recognizable" : ""})`,
    );
    console.log(`    ${r.evidence}`);
    console.log(`    ${airedNote}; next ${r.next || "not within a year"}`);
  }
}

if (jsonOut) {
  fs.writeFileSync(
    jsonOut,
    JSON.stringify({ counts, results }, null, 2) + "\n",
  );
  console.log(`\nFull results: ${jsonOut}`);
}

const failing = results.filter((r) => FAILING.has(r.verdict)).length;
if (counts.ERROR)
  console.log(`\n${counts.ERROR} lookup(s) failed — re-run before deciding.`);
if (failing) {
  console.log(
    `\n${failing} entr${failing === 1 ? "y" : "ies"} cannot be tied to a release by this artist. A person decides; see DECIDED.`,
  );
  process.exit(1);
}
