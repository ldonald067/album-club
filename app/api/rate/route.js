import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addRating, getRatingDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";

let rateCache = { key: null, data: null, time: 0 };
const CACHE_TTL = 30000;

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const key = getTodayKey();
    const now = Date.now();
    if (rateCache.key === key && now - rateCache.time < CACHE_TTL) {
      return NextResponse.json(rateCache.data);
    }
    const data = getRatingDistribution(key);
    rateCache = { key, data, time: now };
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/rate error:", error);
    return NextResponse.json(
      { error: "Failed to load ratings" },
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

    // Daily vote cap: 3 ratings per IP per day
    if (!checkDailyLimit(ip, "rate")) {
      return NextResponse.json(
        { error: "Daily rating limit reached" },
        { status: 429 },
      );
    }

    const { rating } = await request.json();
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 10
    ) {
      return NextResponse.json(
        { error: "Rating must be an integer 1-10" },
        { status: 400 },
      );
    }

    const albumKey = getTodayKey();
    addRating(albumKey, rating);
    const data = getRatingDistribution(albumKey);
    rateCache = { key: albumKey, data, time: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/rate error:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 },
    );
  }
}
