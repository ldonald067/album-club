import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "aotd.db");

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_key TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vibes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_key TEXT NOT NULL,
        vibe TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS guess_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puzzle_key TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        solved INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_album ON ratings(album_key);
      CREATE INDEX IF NOT EXISTS idx_vibes_album ON vibes(album_key);
      CREATE INDEX IF NOT EXISTS idx_guess_puzzle ON guess_stats(puzzle_key);
    `);
  }
  return db;
}

export function addRating(albumKey, rating) {
  const db = getDb();
  db.prepare("INSERT INTO ratings (album_key, rating) VALUES (?, ?)").run(
    albumKey,
    rating,
  );
}

export function getRatingDistribution(albumKey) {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT rating, COUNT(*) as count FROM ratings WHERE album_key = ? GROUP BY rating",
    )
    .all(albumKey);

  const distribution = {};
  for (let i = 1; i <= 10; i++) distribution[i] = 0;
  for (const row of rows) distribution[row.rating] = row.count;

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const avg =
    total > 0
      ? rows.reduce((sum, r) => sum + r.rating * r.count, 0) / total
      : 0;

  return { distribution, total, average: Math.round(avg * 10) / 10 };
}

export function addVibe(albumKey, vibe) {
  const db = getDb();
  db.prepare("INSERT INTO vibes (album_key, vibe) VALUES (?, ?)").run(
    albumKey,
    vibe,
  );
}

export function getVibeDistribution(albumKey) {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT vibe, COUNT(*) as count FROM vibes WHERE album_key = ? GROUP BY vibe ORDER BY count DESC",
    )
    .all(albumKey);

  const distribution = {};
  let total = 0;
  for (const row of rows) {
    distribution[row.vibe] = row.count;
    total += row.count;
  }

  return { distribution, total };
}

export function addGuessStat(puzzleKey, attempts, solved) {
  const db = getDb();
  db.prepare(
    "INSERT INTO guess_stats (puzzle_key, attempts, solved) VALUES (?, ?, ?)",
  ).run(puzzleKey, attempts, solved ? 1 : 0);
}

let statsCache = null;
let statsCacheTime = 0;
const STATS_TTL = 60000; // 60s

export function getSiteStats() {
  const now = Date.now();
  if (statsCache && now - statsCacheTime < STATS_TTL) return statsCache;
  const db = getDb();
  const ratingRow = db
    .prepare(
      "SELECT COUNT(*) as totalRatings, AVG(rating) as avgRating FROM ratings",
    )
    .get();
  const albumsRated = db
    .prepare("SELECT COUNT(DISTINCT album_key) as count FROM ratings")
    .get();
  const topVibes = db
    .prepare(
      "SELECT vibe, COUNT(*) as count FROM vibes GROUP BY vibe ORDER BY count DESC LIMIT 5",
    )
    .all();
  const puzzleRow = db
    .prepare(
      "SELECT COUNT(*) as totalPlayed, SUM(solved) as totalSolved FROM guess_stats",
    )
    .get();
  statsCache = {
    totalRatings: ratingRow.totalRatings,
    avgRating: ratingRow.avgRating
      ? Math.round(ratingRow.avgRating * 10) / 10
      : 0,
    albumsRated: albumsRated.count,
    topVibes,
    totalPuzzlePlayed: puzzleRow.totalPlayed,
    totalPuzzleSolved: puzzleRow.totalSolved || 0,
  };
  statsCacheTime = now;
  return statsCache;
}

export function getGuessStats(puzzleKey) {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT attempts, solved, COUNT(*) as count FROM guess_stats WHERE puzzle_key = ? GROUP BY attempts, solved",
    )
    .all(puzzleKey);

  let totalPlayers = 0;
  let totalSolved = 0;
  const attemptDist = {};

  for (const row of rows) {
    totalPlayers += row.count;
    if (row.solved) {
      totalSolved += row.count;
      attemptDist[row.attempts] = (attemptDist[row.attempts] || 0) + row.count;
    }
  }

  return { totalPlayers, totalSolved, attemptDist };
}
