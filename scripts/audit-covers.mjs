/**
 * Cover audit — does every cover load, and whose record is it?
 *
 * Usage: npm run audit-covers   (about a minute; network)
 *
 * READ-ONLY. Two checks, because eval-site can see neither:
 *
 *   DEAD    the image does not load after three tries. last.fm's CDN 404s
 *           now and then, so one failure proves nothing; three spaced tries
 *           that all fail do. A dead cover is a broken image on the hero.
 *           Exits 1 if any is dead.
 *   OWNER   the cover's URL names the release it belongs to — archive.org
 *           and coverartarchive.org carry a MusicBrainz release id, newer
 *           Apple art a UPC — and that release shares no title word with the
 *           entry and is not the release group lib/album-facts.json matched.
 *           Listed for a person to look at, never counted: an original-script
 *           title (千年女優 for Millennium Actress) or initials (SIMBI for
 *           Sometimes I Might Be Introvert) are right and will show here. Five
 *           do, all checked on 2026-10-22. A lookup that fails is listed too.
 *
 * WHY THIS EXISTS (2026-10-22): a hand check found 43 covers belonging to
 * someone else's record, from Akira wearing a 2024 remix album to a Korean
 * R&B playlist wearing The Nightmare Before Christmas, and four dead links.
 * Every guardrail passed: they check that a cover exists, not whose it is.
 * last.fm and old Apple art name nothing in the URL — those were checked by
 * eye, and still have to be (docs/album-data.md → "Catalog identity").
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const albums = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "albums.json"), "utf8"),
);
const facts = JSON.parse(
  fs.readFileSync(path.join(rootDir, "lib", "album-facts.json"), "utf8"),
);
const USER_AGENT =
  "AlbumOfTheDayClub/1.0 (https://littlealbumclub.net) audit-covers";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) =>
  new Set(
    s
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2),
  );

async function loads(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok && /^image\//.test(res.headers.get("content-type") || ""))
        return true;
    } catch {}
    await sleep(2000);
  }
  return false;
}

async function owner(url) {
  const mbid = url.match(
    /(?:mbid-|coverartarchive\.org\/release\/)([0-9a-f-]{36})/,
  )?.[1];
  if (mbid) {
    await sleep(1100);
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release/${mbid}?inc=artist-credits+release-groups&fmt=json`,
      { headers: { "User-Agent": USER_AGENT } },
    );
    if (!res.ok) return { failed: true };
    const r = await res.json();
    const by = (r["artist-credit"] || []).map((c) => c.name).join(", ");
    return {
      title: r.title,
      label: `${by} — ${r.title}`,
      rg: r["release-group"]?.id,
    };
  }
  const upc = url.match(/mzstatic\.com\/.*\/(\d{8,14})\.(?:jpg|png)\//)?.[1];
  if (upc) {
    await sleep(1500);
    const res = await fetch(`https://itunes.apple.com/lookup?upc=${upc}`);
    if (!res.ok) return { failed: true };
    const c = (await res.json()).results?.[0];
    return c
      ? {
          title: c.collectionName,
          label: `${c.artistName} — ${c.collectionName}`,
        }
      : null;
  }
  return null;
}

const withCover = albums.filter((a) => a.image);
const dead = [];
for (let i = 0; i < withCover.length; i += 8) {
  const batch = withCover.slice(i, i + 8);
  const ok = await Promise.all(batch.map((a) => loads(a.image)));
  batch.forEach((a, j) => ok[j] || dead.push(a));
  process.stderr.write(
    `\r${Math.min(i + 8, withCover.length)}/${withCover.length} loaded`,
  );
}
process.stderr.write("\n");

const askAbout = [];
const unchecked = [];
for (const a of withCover) {
  const o = await owner(a.image);
  if (!o) continue;
  const id = `${a.artist}::${a.title}`;
  /* A failed lookup is not a pass: SIMBI went unlisted once this way. */
  if (o.failed) {
    unchecked.push(id);
    continue;
  }
  if (o.rg && o.rg === facts[id]?.mbid) continue;
  const mine = words(a.title);
  if ([...words(o.title)].some((w) => mine.has(w))) continue;
  askAbout.push(`- ${id} (${a.year})\n    cover is ${o.label}`);
}

console.log(`Cover audit — ${withCover.length} covers\n`);
console.log(`## DEAD (${dead.length})\n`);
for (const a of dead) console.log(`- ${a.artist}::${a.title}\n    ${a.image}`);
console.log(`\n## OWNER — look at these (${askAbout.length})\n`);
for (const line of askAbout) console.log(line);
if (unchecked.length) {
  console.log(`\n## OWNER — lookup failed, re-run (${unchecked.length})\n`);
  for (const id of unchecked) console.log(`- ${id}`);
}
if (dead.length) process.exit(1);
