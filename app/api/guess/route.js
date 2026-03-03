import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addGuessStat, getGuessStats } from "@/lib/db";
import { getPuzzleKey } from "@/lib/albums";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";

let guessCache = { key: null, data: null, time: 0 };
const CACHE_TTL = 30000;

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const key = getPuzzleKey();
    const now = Date.now();
    if (guessCache.key === key && now - guessCache.time < CACHE_TTL) {
      return NextResponse.json({ stats: guessCache.data });
    }
    const stats = getGuessStats(key);
    guessCache = { key, data: stats, time: now };
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

    // Body size guard
    const contentLength = hdrs.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    // Daily vote cap: 3 guess submissions per IP per day
    if (!checkDailyLimit(ip, "guess")) {
      return NextResponse.json(
        { error: "Daily guess limit reached" },
        { status: 429 },
      );
    }

    const { attempts, solved } = await request.json();
    if (
      typeof attempts !== "number" ||
      !Number.isInteger(attempts) ||
      attempts < 1 ||
      attempts > 6
    ) {
      return NextResponse.json({ error: "Invalid attempts" }, { status: 400 });
    }
    if (typeof solved !== "boolean") {
      return NextResponse.json(
        { error: "Invalid solved value" },
        { status: 400 },
      );
    }
    // Logical consistency: if not solved, attempts must be 6
    if (!solved && attempts !== 6) {
      return NextResponse.json(
        { error: "Invalid attempts/solved combination" },
        { status: 400 },
      );
    }

    const puzzleKey = getPuzzleKey();
    addGuessStat(puzzleKey, attempts, solved);
    const stats = getGuessStats(puzzleKey);
    guessCache = { key: puzzleKey, data: stats, time: Date.now() };
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("POST /api/guess error:", error);
    return NextResponse.json(
      { error: "Failed to save stats" },
      { status: 500 },
    );
  }
}
