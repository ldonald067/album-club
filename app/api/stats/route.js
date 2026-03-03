import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSiteStats } from "@/lib/db";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const stats = getSiteStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
