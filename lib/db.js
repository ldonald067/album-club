import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "aotd.db");

let db;
let stmts;

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
      CREATE INDEX IF NOT EXISTS idx_ratings_covering ON ratings(album_key, rating);
      CREATE INDEX IF NOT EXISTS idx_vibes_album ON vibes(album_key);
      CREATE INDEX IF NOT EXISTS idx_vibes_covering ON vibes(album_key, vibe);
      CREATE INDEX IF NOT EXISTS idx_guess_puzzle ON guess_stats(puzzle_key);
      CREATE INDEX IF NOT EXISTS idx_guess_covering ON guess_stats(puzzle_key, attempts, solved);

      CREATE TABLE IF NOT EXISTS playlist_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_key TEXT NOT NULL,
        vote INTEGER NOT NULL CHECK(vote IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_playlist_album ON playlist_votes(album_key);
      CREATE INDEX IF NOT EXISTS idx_playlist_covering ON playlist_votes(album_key, vote);
    `);

    // Cache prepared statements to avoid re-parsing SQL per request
    stmts = {
      addRating: db.prepare(
        "INSERT INTO ratings (album_key, rating) VALUES (?, ?)",
      ),
      getRatingDist: db.prepare(
        "SELECT rating, COUNT(*) as count FROM ratings WHERE album_key = ? GROUP BY rating",
      ),
      addVibe: db.prepare("INSERT INTO vibes (album_key, vibe) VALUES (?, ?)"),
      getVibeDist: db.prepare(
        "SELECT vibe, COUNT(*) as count FROM vibes WHERE album_key = ? GROUP BY vibe ORDER BY count DESC",
      ),
      addGuess: db.prepare(
        "INSERT INTO guess_stats (puzzle_key, attempts, solved) VALUES (?, ?, ?)",
      ),
      getGuessDist: db.prepare(
        "SELECT attempts, solved, COUNT(*) as count FROM guess_stats WHERE puzzle_key = ? GROUP BY attempts, solved",
      ),
      statsRatings: db.prepare(
        "SELECT COUNT(*) as totalRatings, AVG(rating) as avgRating FROM ratings",
      ),
      statsAlbums: db.prepare(
        "SELECT COUNT(DISTINCT album_key) as count FROM ratings",
      ),
      statsVibes: db.prepare(
        "SELECT vibe, COUNT(*) as count FROM vibes GROUP BY vibe ORDER BY count DESC LIMIT 5",
      ),
      statsPuzzles: db.prepare(
        "SELECT COUNT(*) as totalPlayed, SUM(solved) as totalSolved FROM guess_stats",
      ),
      addPlaylistVote: db.prepare(
        "INSERT INTO playlist_votes (album_key, vote) VALUES (?, ?)",
      ),
      getPlaylistDist: db.prepare(
        "SELECT vote, COUNT(*) as count FROM playlist_votes WHERE album_key = ? GROUP BY vote",
      ),
    };
  }
  return db;
}

export function addRating(albumKey, rating) {
  getDb();
  stmts.addRating.run(albumKey, rating);
}

export function getRatingDistribution(albumKey) {
  getDb();
  const rows = stmts.getRatingDist.all(albumKey);

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
  getDb();
  stmts.addVibe.run(albumKey, vibe);
}

export function getVibeDistribution(albumKey) {
  getDb();
  const rows = stmts.getVibeDist.all(albumKey);

  const distribution = {};
  let total = 0;
  for (const row of rows) {
    distribution[row.vibe] = row.count;
    total += row.count;
  }

  return { distribution, total };
}

export function addGuessStat(puzzleKey, attempts, solved) {
  getDb();
  stmts.addGuess.run(puzzleKey, attempts, solved ? 1 : 0);
}

let statsCache = null;
let statsCacheTime = 0;
const STATS_TTL = 300000; // 5 min — stats don't need to be real-time

export function getSiteStats() {
  const now = Date.now();
  if (statsCache && now - statsCacheTime < STATS_TTL) return statsCache;
  getDb();
  const ratingRow = stmts.statsRatings.get();
  const albumsRated = stmts.statsAlbums.get();
  const topVibes = stmts.statsVibes.all();
  const puzzleRow = stmts.statsPuzzles.get();
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

export function addPlaylistVote(albumKey, vote) {
  getDb();
  stmts.addPlaylistVote.run(albumKey, vote ? 1 : 0);
}

export function getPlaylistDistribution(albumKey) {
  getDb();
  const rows = stmts.getPlaylistDist.all(albumKey);
  let yes = 0,
    no = 0;
  for (const row of rows) {
    if (row.vote === 1) yes = row.count;
    else no = row.count;
  }
  return { yes, no, total: yes + no };
}

export function getGuessStats(puzzleKey) {
  getDb();
  const rows = stmts.getGuessDist.all(puzzleKey);

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
