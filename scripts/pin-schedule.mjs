/**
 * Record each day's picks in lib/schedule.json, so a catalog edit can never
 * re-derive a day that has started or ended.
 *
 * Usage: npm run pin-schedule
 *        npm run pin-schedule -- --bootstrap --album-history-from 2026-07-14
 *
 * WHEN TO RUN: after ANY change to lib/albums.json or lib/lyrics.json, before
 * committing. eval-site fails until you do ("the catalog changed since the
 * schedule was pinned"), so forgetting is loud, not silent.
 *
 * WHAT IT DOES: records every day from the last pinned date through TOMORROW
 * (UTC), computing each from the catalog at origin/master — what production is
 * serving — not from your working copy or branch, which hold the edit about to
 * change the future. (git fetch first if someone else may have pushed.) Then it fingerprints the working catalog,
 * so eval-site can tell whether the unrecorded future matches it.
 *
 * Why tomorrow and not just today: a deploy that lands a few minutes after
 * midnight UTC would otherwise re-derive a day that has already begun. Pinning
 * one day ahead means a catalog edit takes effect the day after tomorrow at
 * the earliest.
 *
 * Recorded days are never rewritten. History is immutable here by design; if a
 * recorded day is genuinely wrong, edit lib/schedule.json by hand and say why
 * in the commit.
 *
 * --bootstrap creates the file for the first time. --album-history-from D also
 * records the featured album (only) for every day from D up to yesterday. Only
 * use a D from which the featured album is exactly reproducible — i.e. after
 * the last change to the catalog's length or order — because a recorded wrong
 * album is worse than an unrecorded one. Game picks for past days are never
 * back-filled: nothing displays them, and their pools changed along the way.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as prettier from "prettier";

const rootDir = process.cwd();
const schedulePath = path.join(rootDir, "lib", "schedule.json");
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const bootstrap = args.includes("--bootstrap");
const albumHistoryFrom = argValue("--album-history-from");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
// What production serves: origin/master, or HEAD where there is no remote.
// Not HEAD on a branch — a committed catalog edit there is the future, and
// recording days from it would re-derive exactly the days this protects.
const SERVED_REF = (() => {
  try {
    execFileSync("git", ["rev-parse", "--verify", "-q", "origin/master"], {
      stdio: "ignore",
    });
    return "origin/master";
  } catch {
    return "HEAD";
  }
})();
const committed = (file) =>
  JSON.parse(
    execFileSync("git", ["show", `${SERVED_REF}:${file}`], {
      encoding: "utf8",
    }),
  );

const dayKey = (date) => date.toISOString().slice(0, 10);
const noonUtc = (key) => new Date(`${key}T12:00:00Z`);
const addDays = (key, n) =>
  dayKey(new Date(noonUtc(key).getTime() + n * 86400000));

// ── The schedule so far ─────────────────────────────────────────────────────
if (!fs.existsSync(schedulePath) && !bootstrap) {
  console.error(
    "lib/schedule.json does not exist. Run with --bootstrap to create it.",
  );
  process.exit(1);
}
if (fs.existsSync(schedulePath) && bootstrap) {
  console.error(
    "lib/schedule.json already exists; --bootstrap is only for the first run.",
  );
  process.exit(1);
}
// daily-picks.js imports schedule.json at load, so it must exist first
if (bootstrap) {
  fs.writeFileSync(schedulePath, JSON.stringify({ days: {} }) + "\n");
}
const schedule = readJson(schedulePath);
schedule.days ||= {};

// ── Compute from the SERVED catalog ──────────────────────────────────────
const lib = await import(path.join(rootDir, "lib", "albums.js"));
const { computeDayIds } = await import(
  path.join(rootDir, "lib", "daily-picks.js")
);
const { catalogFingerprint } = await import(
  path.join(rootDir, "lib", "catalog-fingerprint.js")
);

const servedAlbums = committed("lib/albums.json");
const servedLyricKeys = Object.keys(committed("lib/lyrics.json"));
// Every pick function reads the live ALBUMS array, so swap its contents for
// the served catalog for the duration of this script.
lib.ALBUMS.splice(0, lib.ALBUMS.length, ...servedAlbums);

const today = dayKey(new Date());
const through = addDays(today, 1);
const recorded = [];

if (bootstrap && albumHistoryFrom) {
  for (let key = albumHistoryFrom; key < today; key = addDays(key, 1)) {
    if (schedule.days[key]) continue;
    schedule.days[key] = {
      album: computeDayIds(noonUtc(key), servedLyricKeys).album,
    };
    recorded.push(`${key}  album only`);
  }
}

const start = bootstrap
  ? today
  : addDays(schedule.pinnedThrough || today, schedule.pinnedThrough ? 1 : 0);
for (let key = start; key <= through; key = addDays(key, 1)) {
  if (schedule.days[key]) continue; // never rewrite a recorded day
  const { key: _k, ...ids } = computeDayIds(noonUtc(key), servedLyricKeys);
  schedule.days[key] = ids;
  recorded.push(`${key}  ${ids.album}`);
}

// ── Fingerprint the WORKING catalog: what the unrecorded future will use ────
const workingAlbums = readJson(path.join(rootDir, "lib", "albums.json"));
const workingLyricKeys = Object.keys(
  readJson(path.join(rootDir, "lib", "lyrics.json")),
);

const sortedDays = Object.fromEntries(
  Object.entries(schedule.days).sort(([a], [b]) => a.localeCompare(b)),
);
const out = {
  about:
    "Each date's picks, recorded once and never re-derived. Written by scripts/pin-schedule.mjs; read by lib/daily-picks.js. See docs/album-data.md.",
  catalogFingerprint: catalogFingerprint(workingAlbums, workingLyricKeys),
  pinnedThrough: [schedule.pinnedThrough, through]
    .filter(Boolean)
    .sort()
    .at(-1),
  days: sortedDays,
};
fs.writeFileSync(
  schedulePath,
  await prettier.format(JSON.stringify(out), { parser: "json" }),
);

console.log(
  recorded.length
    ? `Recorded ${recorded.length} day(s):\n  ${recorded.slice(-6).join("\n  ")}${recorded.length > 6 ? `\n  … and ${recorded.length - 6} earlier` : ""}`
    : "Nothing new to record.",
);
console.log(
  `Pinned through ${out.pinnedThrough} from ${SERVED_REF}. Fingerprint ${out.catalogFingerprint}.`,
);
