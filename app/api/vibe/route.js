import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addVibe, getVibeDistribution } from "@/lib/db";
import { getTodayKey, VIBES } from "@/lib/albums";
import { getPublicRouteError, readJsonBody } from "@/lib/api-helpers";
import {
  checkRateLimit,
  checkDailyLimit,
  getRealIp,
  isValidDateKey,
} from "@/lib/rate-limit";

let vibeCache = { key: null, data: null, time: 0 };
const CACHE_TTL = 30000;

export async function GET(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get("key");
    const key = rawKey && isValidDateKey(rawKey) ? rawKey : getTodayKey();
    const now = Date.now();
    if (vibeCache.key === key && now - vibeCache.time < CACHE_TTL) {
      return NextResponse.json(vibeCache.data);
    }
    const data = getVibeDistribution(key);
    vibeCache = { key, data, time: now };
    return NextResponse.json(data);
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to load vibes");
    if (publicError.status >= 500) {
      console.error("GET /api/vibe error:", error);
    }
    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status },
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

    // Daily vote cap: 3 vibe submissions per IP per day
    if (!checkDailyLimit(ip, "vibe")) {
      return NextResponse.json(
        { error: "Daily vibe limit reached" },
        { status: 429 },
      );
    }

    const body = await readJsonBody(request, { maxChars: 1024 });
    const { vibes } = body;
    if (!Array.isArray(vibes) || vibes.length === 0 || vibes.length > 3) {
      return NextResponse.json({ error: "Pick 1-3 vibes" }, { status: 400 });
    }

    // Deduplicate before validation so ["Chill","Chill","Chill"] becomes ["Chill"]
    const uniqueVibes = [
      ...new Set(
        vibes.map((value) =>
          typeof value === "string" ? value.trim() : value,
        ),
      ),
    ];
    const validLabels = VIBES.map((v) => v.label);
    for (const v of uniqueVibes) {
      if (typeof v !== "string" || !validLabels.includes(v)) {
        return NextResponse.json({ error: "Invalid vibe" }, { status: 400 });
      }
    }

    const albumKey = getTodayKey();
    for (const v of uniqueVibes) {
      addVibe(albumKey, v);
    }

    const data = getVibeDistribution(albumKey);
    vibeCache = { key: albumKey, data, time: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to save vibes");
    if (publicError.status >= 500) {
      console.error("POST /api/vibe error:", error);
    }
    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
