import fs from "node:fs";
import path from "node:path";
import { SOUNDTRACK_OVERRIDES } from "../lib/soundtrack-corner-data.js";
import {
  buildSoundtrackCorner,
  getAngleLabel,
} from "../lib/soundtrack-corner.js";

const rootDir = process.cwd();

const albumsPath = path.join(rootDir, "lib", "albums.json");
const lyricsPath = path.join(rootDir, "lib", "lyrics.json");
const soundtrackDataPath = path.join(
  rootDir,
  "lib",
  "soundtrack-corner-data.js",
);
const forumPagePath = path.join(rootDir, "app", "ForumPage.js");
const soundtrackCornerPath = path.join(rootDir, "app", "SoundtrackCorner.js");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getAlbumKey(album) {
  return `${album.artist} - ${album.title}`.toLowerCase();
}

function getSoundtrackOverrideKeys(source) {
  return new Set(
    [...source.matchAll(/^  "([^"]+::[^"]+)": \{/gm)].map((match) => match[1]),
  );
}

function getSoundtrackOverrideKey(album) {
  return `${album.artist}::${album.title}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function groupCounts(items, getKey) {
  const counts = new Map();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function getDecadeLabel(year) {
  return `${Math.floor(year / 10) * 10}s`;
}

function getGenreFamily(genre) {
  const value = String(genre || "").toLowerCase();

  if (/(hip-hop|hip hop|rap|trap)/.test(value)) return "Hip-Hop / Rap";
  if (/(jazz|bossa|fusion|bebop|swing)/.test(value)) return "Jazz";
  if (/(folk|country|americana|bluegrass|alt-country|chamber folk)/.test(value))
    return "Folk / Country";
  if (/(r&b|soul|funk|disco|neo-soul)/.test(value)) return "Soul / R&B / Funk";
  if (
    /(electronic|idm|ambient|house|techno|dance|synth|hyperpop|lofi|downtempo|trip-hop|french house|electropop)/.test(
      value,
    )
  ) {
    return "Electronic";
  }
  if (/(metal|hardcore|punk|emo|grind|post-hardcore)/.test(value))
    return "Heavy / Punk";
  if (
    /(classical|orchestral|soundtrack|anime|cinematic|score|piano)/.test(value)
  )
    return "Scores / Classical";
  if (/(pop|k-pop|art pop|synth-pop|city pop)/.test(value)) return "Pop";
  if (
    /(rock|indie|shoegaze|grunge|post-punk|new wave|britpop|gothic|garage|madchester|dream pop)/.test(
      value,
    )
  ) {
    return "Rock / Indie";
  }

  return "Other";
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function printGuardrail(pass, label, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  console.log(`  ${detail}`);
  return pass ? 0 : 1;
}

const albums = readJson(albumsPath);
const lyrics = readJson(lyricsPath);
const soundtrackSource = readText(soundtrackDataPath);
const forumSource = readText(forumPagePath);
const soundtrackCornerSource = readText(soundtrackCornerPath);

const recognizableAlbums = albums.filter((album) => album.recognizable);
const lyricKeys = new Set(Object.keys(lyrics).map((key) => key.toLowerCase()));
const albumsWithLyrics = recognizableAlbums.filter((album) =>
  lyricKeys.has(getAlbumKey(album)),
);
const albumsWithYoutube = recognizableAlbums.filter((album) => album.youtubeId);
const albumsWithCover = recognizableAlbums.filter((album) => album.image);
const soundtrackOverrideKeys = getSoundtrackOverrideKeys(soundtrackSource);
const soundtrackCoveredAlbums = albums.filter((album) =>
  soundtrackOverrideKeys.has(getSoundtrackOverrideKey(album)),
);
const soundtrackCoveredRecognizable = recognizableAlbums.filter((album) =>
  soundtrackOverrideKeys.has(getSoundtrackOverrideKey(album)),
);

const decadeCounts = groupCounts(albums, (album) => getDecadeLabel(album.year));
const genreFamilyCounts = groupCounts(albums, (album) =>
  getGenreFamily(album.genre),
);

let failures = 0;

console.log("Album Of The Day Club - Site Eval");
console.log("=================================\n");

printSection("Album pool");
console.log(
  `Total albums: ${albums.length} (${recognizableAlbums.length} recognizable, ${formatPercent(
    recognizableAlbums.length / albums.length,
  )})`,
);
console.log(
  `Decade spread: ${decadeCounts.length} decades represented (${decadeCounts
    .slice(0, 5)
    .map(([decade, count]) => `${decade}: ${count}`)
    .join(", ")})`,
);
console.log(
  `Broad genre spread: ${genreFamilyCounts.length} families (${genreFamilyCounts
    .slice(0, 6)
    .map(([family, count]) => `${family}: ${count}`)
    .join(", ")})`,
);

printSection("Game source coverage");
console.log(
  `Guess / scramble pool: ${recognizableAlbums.length} recognizable albums`,
);
console.log(
  `Cover Challenge pool: ${albumsWithCover.length}/${recognizableAlbums.length} recognizable albums (${formatPercent(
    albumsWithCover.length / recognizableAlbums.length,
  )})`,
);
console.log(
  `Heardle pool: ${albumsWithYoutube.length}/${recognizableAlbums.length} recognizable albums (${formatPercent(
    albumsWithYoutube.length / recognizableAlbums.length,
  )})`,
);
console.log(
  `Lyric Challenge pool: ${albumsWithLyrics.length}/${recognizableAlbums.length} recognizable albums (${formatPercent(
    albumsWithLyrics.length / recognizableAlbums.length,
  )})`,
);

printSection("Soundtrack Corner");
console.log(
  `Curated overrides: ${soundtrackCoveredAlbums.length}/${albums.length} (${formatPercent(
    soundtrackCoveredAlbums.length / albums.length,
  )})`,
);
console.log(
  `Recognizable coverage: ${soundtrackCoveredRecognizable.length}/${recognizableAlbums.length} (${formatPercent(
    soundtrackCoveredRecognizable.length / recognizableAlbums.length,
  )})`,
);

printSection("Override structure");
{
  const albumTitles = new Set(albums.map((album) => album.title));
  const catalogKeys = new Set(
    albums.map((album) => `${album.artist}::${album.title}`),
  );
  /* Ask the generator whether a key is real rather than keeping a second copy
     of the list here — a hand-maintained duplicate drifts the moment someone
     adds an angle. getAngleLabel also proves the key resolves to a label, which
     is what the UI actually renders. */
  const structureProblems = [];
  for (const [key, override] of Object.entries(SOUNDTRACK_OVERRIDES)) {
    if (!catalogKeys.has(key)) {
      structureProblems.push(`key does not match any album: ${key}`);
    }
    for (const rec of override.recommendations || []) {
      if (!albumTitles.has(rec.title)) {
        structureProblems.push(`rec not in catalog (${key}): ${rec.title}`);
      }
    }
    for (const angle of override.extraAngles || []) {
      if (!getAngleLabel(angle.key) || !angle.title || !angle.body) {
        structureProblems.push(`bad extra angle (${key}): ${angle.key}`);
      }
    }
    for (const medium of ["game", "film", "tv"]) {
      if (override.cards && !override.cards[medium]?.body) {
        structureProblems.push(`missing ${medium} card body (${key})`);
      }
    }
  }
  structureProblems.forEach((problem) => console.log(`  ! ${problem}`));
  failures += printGuardrail(
    structureProblems.length === 0,
    "Curated overrides are structurally sound",
    "Bad keys or dangling recommendations silently vanish at runtime — catch them here.",
  );
}

printSection("Rendered corners");
{
  /* Everything above this section inspects the curated overrides as data. That
     left the 290 generated corners — the tier most visitors actually meet —
     with no check at all, and two faults shipped behind it: a doubled article
     in 33 bridge notes, and duplicate "Listen next" reasons in 63% of
     generated corners (11% printed the same sentence three times in one view).
     Both are obvious on sight and invisible to a structural read, so render
     every album and read the output. */
  const renderProblems = [];

  for (const album of albums) {
    const corner = buildSoundtrackCorner(album);
    const label = `${album.artist} - ${album.title}`;

    const reasons = corner.recommendations.map((rec) => rec.reason);
    if (new Set(reasons).size !== reasons.length) {
      renderProblems.push(`repeated recommendation reason (${label})`);
    }

    const prose = [
      corner.intro,
      corner.kicker,
      corner.bridgeNote,
      ...corner.cards.flatMap((card) => [card.title, card.body]),
      ...corner.extraAngles.flatMap((angle) => [angle.title, angle.body]),
      ...corner.listenFor,
      ...reasons,
    ].join(" \n ");

    const doubled = prose.match(/\b(the|a|an)\s+\1\b/i);
    if (doubled) {
      renderProblems.push(`doubled article "${doubled[0]}" (${label})`);
    }

    if (corner.cards.length !== 3 || corner.cards.some((card) => !card.body)) {
      renderProblems.push(`incomplete pitch cards (${label})`);
    }
    if (
      corner.extraAngles.length !== 2 ||
      corner.extraAngles.some((angle) => !getAngleLabel(angle.key))
    ) {
      renderProblems.push(`bad extra angles (${label})`);
    }
    if (corner.listenFor.length < 3) {
      renderProblems.push(`thin listen-for list (${label})`);
    }
    if (corner.recommendations.length !== 3) {
      renderProblems.push(`wrong recommendation count (${label})`);
    }
  }

  renderProblems
    .slice(0, 5)
    .forEach((problem) => console.log(`  ! ${problem}`));
  failures += printGuardrail(
    renderProblems.length === 0,
    "Every corner renders clean copy",
    renderProblems.length
      ? `${renderProblems.length} rendered corner problem(s) across ${albums.length} albums`
      : `All ${albums.length} corners render three distinct reasons and clean prose.`,
  );
}

printSection("UI and API guardrails");
failures += printGuardrail(
  forumSource.includes("Heardle switched formats."),
  "Heardle fallback is explicit",
  "Users should see why the game rolled over instead of getting a silent component swap.",
);
failures += printGuardrail(
  forumSource.includes("Lyric Challenge took the day off."),
  "Lyric fallback is explicit",
  "Lyric mode should explain the swap when no clean source exists.",
);
failures += printGuardrail(
  forumSource.includes("Fresh sheet today.") &&
    forumSource.includes("wake the") &&
    forumSource.includes("board up."),
  "Stats empty state feels authored",
  "The stats board should sound like the site, not a blank admin page.",
);
failures += printGuardrail(
  soundtrackCornerSource.includes("corner.listenNow.href") &&
    soundtrackCornerSource.includes("recommendation.href"),
  "Soundtrack Corner has clickable exits",
  "The corner should always give people somewhere real to go next.",
);
failures += printGuardrail(
  soundtrackCornerSource.includes("Where does this one belong tonight?") &&
    soundtrackCornerSource.includes("/api/soundtrack"),
  "Cue vote is wired into the corner",
  "The vote-then-see-the-room loop is the corner's daily ritual — keep it.",
);
failures += printGuardrail(
  forumSource.includes("SoundtrackMini") &&
    soundtrackCornerSource.includes("onPlayToday"),
  "Corner and daily loop cross-link both ways",
  "Home should tease the corner; the corner should hand people back to today's game.",
);
failures += printGuardrail(
  forumSource.includes(
    "Pick your number, lock it in, then see where the room landed.",
  ) &&
    forumSource.includes("Pick up to 3 moods that actually fit the record.") &&
    forumSource.includes("Start broad, then tighten up."),
  "Core activity prompts have been tuned",
  "Rate / vibe / puzzle copy should feel specific instead of stock filler.",
);

const apiRoutePaths = [
  path.join(rootDir, "app", "api", "rate", "route.js"),
  path.join(rootDir, "app", "api", "vibe", "route.js"),
  path.join(rootDir, "app", "api", "guess", "route.js"),
  path.join(rootDir, "app", "api", "playlist", "route.js"),
  path.join(rootDir, "app", "api", "matchup", "route.js"),
  path.join(rootDir, "app", "api", "stats", "route.js"),
  path.join(rootDir, "app", "api", "soundtrack", "route.js"),
  path.join(rootDir, "app", "api", "soundtrack", "history", "route.js"),
];
const apiSources = apiRoutePaths.map(readText);

failures += printGuardrail(
  apiSources.every((source) => source.includes("jsonNoStore(")),
  "API responses opt out of browser caching",
  "Public routes should stay fresh even when the browser gets overconfident.",
);
failures += printGuardrail(
  apiSources.every((source) => source.includes("jsonRateLimited(")),
  "API routes share rate-limit behavior",
  "429s should consistently send no-store headers and Retry-After guidance.",
);

// ─── Catalog data guardrails ───

// Read the cadence out of lib/albums.js rather than hardcoding 5, so this keeps
// working if the game rotation ever grows or shrinks.
const albumsSource = readText(path.join(rootDir, "lib", "albums.js"));
const gameTypesMatch = albumsSource.match(/const GAME_TYPES = \[([^\]]*)\]/);
const cadence = gameTypesMatch
  ? gameTypesMatch[1].split(",").filter((entry) => entry.trim()).length
  : 0;

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const gamePools = [
  ["recognizable (guess/cover/scramble)", recognizableAlbums.length],
  ["lyric", albumsWithLyrics.length],
  ["heardle", albumsWithYoutube.length],
];
// Guard the mechanism, not the arithmetic. A pool size sharing a factor with the
// cadence is only harmful while the sampler indexes on dayOfYear — that samples
// the pool at a stride of `cadence` and silently collapses variety to
// pool/cadence (80 albums would give 16 a year). Indexing by appearance ordinal
// removes the coupling, so what must never regress is the ordinal indexing.
const samplerUsesOrdinal =
  /const ordinal = Math\.floor\(getDayOfYear\(\)/.test(albumsSource) &&
  /order\[ordinal % pool\.length\]/.test(albumsSource);
const coupledPools = gamePools.filter(
  ([, size]) => size > 0 && cadence > 0 && gcd(size, cadence) > 1,
);
failures += printGuardrail(
  samplerUsesOrdinal,
  "Daily-game sampler indexes by appearance ordinal",
  samplerUsesOrdinal
    ? `Pool size cannot interact with cadence ${cadence}.${
        coupledPools.length
          ? ` (${coupledPools.map(([n, s]) => `${n}=${s}`).join(", ")} share a factor with it, which is now harmless.)`
          : ""
      }`
    : `pickRotatingPoolAlbum looks like it indexes on dayOfYear again — that samples each pool at a stride of ${cadence}, so any pool sharing a factor with it loses most of its variety.`,
);

const colorCounts = new Map();
const emojiCounts = new Map();
for (const album of albums) {
  const color = (album.color || "").toLowerCase();
  colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  emojiCounts.set(album.cover, (emojiCounts.get(album.cover) || 0) + 1);
}
const dupColors = [...colorCounts].filter(([, n]) => n > 1);
const dupEmoji = [...emojiCounts].filter(([, n]) => n > 1);
failures += printGuardrail(
  dupColors.length === 0 && dupEmoji.length === 0,
  "Album accent colors and cover emoji are unique",
  dupColors.length || dupEmoji.length
    ? `Repeated colors: ${dupColors.map(([c]) => c).join(", ") || "none"}. Repeated emoji: ${dupEmoji.map(([e]) => e).join(", ") || "none"}.`
    : `All ${albums.length} albums carry a distinct color and emoji.`,
);

/* Two albums sharing a cover URL reads as a bug to anyone who sees both — and
   it hides a worse one, since a cover fetch that matched the wrong release
   often lands on an image already in use. Boiler Room Berlin and Tokyo shipped
   sharing one for months without anyone noticing. */
const imageCounts = new Map();
for (const album of albums) {
  if (!album.image) continue;
  imageCounts.set(album.image, (imageCounts.get(album.image) || 0) + 1);
}
const sharedImages = [...imageCounts].filter(([, n]) => n > 1);
const missingImages = albums.filter((album) => !album.image);
/* Production is https, so an http:// cover is mixed content: the browser either
   blocks it or silently upgrades it, and neither shows up in local dev because
   localhost is http itself. Eight coverartarchive.org URLs shipped this way. */
const insecureImages = albums.filter((album) =>
  (album.image || "").startsWith("http://"),
);
failures += printGuardrail(
  sharedImages.length === 0 &&
    missingImages.length === 0 &&
    insecureImages.length === 0,
  "Every album has its own cover image, served over https",
  sharedImages.length || missingImages.length || insecureImages.length
    ? `Shared by more than one album: ${
        sharedImages.map(([url]) => url).join(", ") || "none"
      }. Missing an image: ${
        missingImages.map((a) => `${a.artist} - ${a.title}`).join(", ") ||
        "none"
      }. Insecure http:// URL: ${
        insecureImages.map((a) => `${a.artist} - ${a.title}`).join(", ") ||
        "none"
      }.`
    : `All ${albums.length} albums carry a distinct, populated https image URL.`,
);

/* A line whose blankable words are all the same word cannot be a puzzle: two
   get hidden, the rest stay printed, and the answer is sitting right there.
   "Okay (Okay, okay, okay)" shipped this way and read as broken rather than
   easy, because the blanks also swallowed the opening bracket. */
const selfRevealingLines = [];
for (const [key, value] of Object.entries(lyrics)) {
  const lines = Array.isArray(value) ? value : value.lines || [];
  for (const line of lines) {
    const words = line
      .split(" ")
      .filter((word) => word.replace(/[^a-zA-Z]/g, "").length > 3);
    const distinct = new Set(
      words.map((word) => word.replace(/[^a-zA-Z]/g, "").toLowerCase()),
    );
    if (distinct.size === 1 && words.length > 2) {
      selfRevealingLines.push(`${key}: "${line}"`);
    }
  }
}
failures += printGuardrail(
  selfRevealingLines.length === 0,
  "No lyric line gives its own answer away",
  selfRevealingLines.length
    ? `Every blankable word is the same, so the answer stays visible: ${selfRevealingLines.join("; ")}`
    : "No stored line repeats a single blankable word throughout.",
);

/* Every light background must resolve through the surface palette, so a skin
   can restyle the whole site by overriding variables. The vintage skin first
   tried enumerating classes and stayed incomplete through two audits — a raw
   hex here is exactly how the next surface escapes a skin unnoticed. Dark
   accent fills (bars, badges) are exempt; they are not surfaces. */
const cssSource = fs.readFileSync(
  path.join(rootDir, "app", "globals.css"),
  "utf-8",
);
const paletteEnd = cssSource.indexOf("VINTAGE SKIN — opt-in");
const cssBeforeSkin =
  paletteEnd === -1 ? cssSource : cssSource.slice(0, paletteEnd);
const rawSurfaces = [];
for (const match of cssBeforeSkin.matchAll(
  /background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})\s*;/g,
)) {
  const hex = match[1].toLowerCase();
  const full =
    hex.length === 4
      ? "#" +
        hex
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  // Only light values are "surfaces"; dark fills are decorative.
  if ((r + g + b) / 3 < 200) continue;
  // The palette definitions themselves are where the hexes belong.
  const line = cssBeforeSkin.slice(0, match.index).split("\n").length;
  rawSurfaces.push(`${hex} (globals.css:${line})`);
}
failures += printGuardrail(
  rawSurfaces.length === 0,
  "Light backgrounds go through the surface palette",
  rawSurfaces.length
    ? `Hardcoded light background(s) a skin cannot reach: ${rawSurfaces.join(", ")}. Add a --surface-* token instead.`
    : "No raw light background hexes outside the palette.",
);

// The lyric game blanks words longer than three characters and needs two of
// them to make a two-blank puzzle.
const blankable = (line) =>
  line.split(" ").filter((word) => word.replace(/[^a-zA-Z]/g, "").length > 3)
    .length;
const weakLyricLines = [];
for (const [key, value] of Object.entries(lyrics)) {
  const lines = Array.isArray(value) ? value : value.lines || [];
  for (const line of lines) {
    if (blankable(line) < 2) weakLyricLines.push(`${key}: "${line}"`);
  }
}
// A repeated line is dead weight: the game shows one line per airing, so
// storing the same chorus twice just narrows the variety when an album recurs.
const repeatedLineEntries = [];
const crossAlbumPayloads = new Map();
for (const [key, value] of Object.entries(lyrics)) {
  const lines = Array.isArray(value) ? value : value.lines || [];
  if (new Set(lines).size !== lines.length) repeatedLineEntries.push(key);
  const fingerprint = lines.join("\n");
  if (fingerprint) {
    crossAlbumPayloads.set(
      fingerprint,
      (crossAlbumPayloads.get(fingerprint) || []).concat(key),
    );
  }
}
const sharedPayloads = [...crossAlbumPayloads.values()].filter(
  (keys) => keys.length > 1,
);
failures += printGuardrail(
  repeatedLineEntries.length === 0,
  "No lyric entry repeats the same line",
  repeatedLineEntries.length
    ? `${repeatedLineEntries.length} entr(y/ies) store a duplicate line, e.g. ${repeatedLineEntries[0]}`
    : "Every stored line within an entry is distinct.",
);
// Two albums sharing lyrics means the fetcher matched the wrong song for at
// least one of them — the signature of a popularity-ranked search result.
// Compared line by line rather than as whole payloads: an earlier version only
// caught byte-identical blocks, so dropping or reordering a single line hid the
// very contamination it existed to detect.
const lineOwners = new Map();
for (const [key, value] of Object.entries(lyrics)) {
  const lines = Array.isArray(value) ? value : value.lines || [];
  for (const line of new Set(lines)) {
    const norm = line
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    // Very short lines ("oh oh oh") genuinely recur across songs
    if (norm.split(" ").length < 5) continue;
    if (!lineOwners.has(norm)) lineOwners.set(norm, new Set());
    lineOwners.get(norm).add(key);
  }
}
const overlaps = [...lineOwners.entries()].filter(([, keys]) => keys.size > 1);
failures += printGuardrail(
  overlaps.length === 0 && sharedPayloads.length === 0,
  "No two albums share the same lyrics",
  overlaps.length || sharedPayloads.length
    ? `${overlaps.length} distinctive line(s) appear under more than one album, e.g. "${overlaps[0]?.[0].slice(0, 50)}" in ${[...(overlaps[0]?.[1] || [])].join(" / ")}`
    : `All ${lineOwners.size} distinctive lines belong to exactly one album.`,
);

failures += printGuardrail(
  weakLyricLines.length === 0,
  "Every lyric line can carry two blanks",
  weakLyricLines.length
    ? `${weakLyricLines.length} line(s) have fewer than two blankable words, e.g. ${weakLyricLines[0]}`
    : "All stored lyric lines have at least two words long enough to blank.",
);

printSection("Manual checklist");
[
  "Check the forum at 375px wide and make sure the activity cards still breathe.",
  "Try one round each of Guess, Cover, Heardle, Lyric, and Scramble after a fresh reload.",
  "Open Soundtrack Corner and make sure the cards read like curation, not filler.",
  "Read the marquee, FAQ, and empty states once like a new visitor and trim anything that sounds canned.",
  "Spot-check a few recent rotation picks to keep decade and genre spread pleasantly unruly.",
].forEach((item) => console.log(`- ${item}`));

if (failures > 0) {
  console.log(`\n${failures} site eval check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll site eval checks passed.");
}
