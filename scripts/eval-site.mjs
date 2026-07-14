import fs from "node:fs";
import path from "node:path";
import { SOUNDTRACK_OVERRIDES } from "../lib/soundtrack-corner-data.js";

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
  const validAngleKeys = new Set([
    "boss-fight",
    "needle-drop",
    "cold-open",
    "studio-match",
    "end-credits",
  ]);
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
      if (!validAngleKeys.has(angle.key) || !angle.title || !angle.body) {
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
    soundtrackCornerSource.includes("/api/soundtrack") &&
    soundtrackCornerSource.includes("Share The Verdict"),
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
