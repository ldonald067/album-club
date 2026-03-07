import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSiteStats } from "@/lib/db";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";

let statsRouteCache = { data: null, time: 0 };
const CACHE_TTL = 300000; // 5 min

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const now = Date.now();
    if (statsRouteCache.data && now - statsRouteCache.time < CACHE_TTL) {
      return NextResponse.json(statsRouteCache.data);
    }
    const stats = getSiteStats();
    statsRouteCache = { data: stats, time: now };
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
