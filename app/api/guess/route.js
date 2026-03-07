import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addGuessStat, getGuessStats } from "@/lib/db";
import { getPuzzleKey, getTodayKey } from "@/lib/albums";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";

// Cache per game type
const guessCaches = {};
const CACHE_TTL = 30000;

const VALID_TYPES = ["puzzle", "cover", "heardle", "lyric", "scramble"];
const MAX_ATTEMPTS = { puzzle: 6, cover: 5, heardle: 6, lyric: 4, scramble: 5 };

function resolveKey(type) {
  const today = getTodayKey();
  if (!type || type === "puzzle") return getPuzzleKey();
  return `${type}-${today}`;
}

export async function GET(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "puzzle";
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const key = resolveKey(type);
    const now = Date.now();
    const cached = guessCaches[type];
    if (cached && cached.key === key && now - cached.time < CACHE_TTL) {
      return NextResponse.json({ stats: cached.data });
    }
    const stats = getGuessStats(key);
    guessCaches[type] = { key, data: stats, time: now };
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("GET /api/guess error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Body size guard: check actual body size, not spoofable content-length
    let body;
    try {
      const text = await request.text();
      if (text.length > 1024) {
        return NextResponse.json(
          { error: "Request too large" },
          { status: 413 },
        );
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { attempts, solved, type: rawType } = body;
    const type = rawType || "puzzle";
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Daily vote cap: 3 submissions per IP per game type per day
    if (!checkDailyLimit(ip, `guess-${type}`)) {
      return NextResponse.json(
        { error: "Daily guess limit reached" },
        { status: 429 },
      );
    }

    const maxAttempts = MAX_ATTEMPTS[type];
    if (!maxAttempts) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (
      typeof attempts !== "number" ||
      !Number.isInteger(attempts) ||
      attempts < 1 ||
      attempts > maxAttempts
    ) {
      return NextResponse.json({ error: "Invalid attempts" }, { status: 400 });
    }
    if (typeof solved !== "boolean") {
      return NextResponse.json(
        { error: "Invalid solved value" },
        { status: 400 },
      );
    }
    // Logical consistency: if not solved, attempts must be max
    if (!solved && attempts !== maxAttempts) {
      return NextResponse.json(
        { error: "Invalid attempts/solved combination" },
        { status: 400 },
      );
    }

    const puzzleKey = resolveKey(type);
    addGuessStat(puzzleKey, attempts, solved);
    const stats = getGuessStats(puzzleKey);
    guessCaches[type] = { key: puzzleKey, data: stats, time: Date.now() };
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("POST /api/guess error:", error);
    return NextResponse.json(
      { error: "Failed to save stats" },
      { status: 500 },
    );
  }
}
