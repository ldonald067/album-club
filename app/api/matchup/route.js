import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addMatchupVote, getMatchupDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";

const VALID_TYPES = ["versus", "taste"];
const matchupCaches = {};
const CACHE_TTL = 30000;

export async function GET(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "versus";
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const key = `${type}-${getTodayKey()}`;
    const now = Date.now();
    const cached = matchupCaches[type];
    if (cached && cached.key === key && now - cached.time < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }
    const data = getMatchupDistribution(key);
    matchupCaches[type] = { key, data, time: now };
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/matchup error:", error);
    return NextResponse.json(
      { error: "Failed to load matchup votes" },
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

    if (!checkDailyLimit(ip, "matchup")) {
      return NextResponse.json(
        { error: "Daily matchup vote limit reached" },
        { status: 429 },
      );
    }

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
    const { type, pick } = body;
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (pick !== "A" && pick !== "B") {
      return NextResponse.json(
        { error: "Pick must be A or B" },
        { status: 400 },
      );
    }

    const key = `${type}-${getTodayKey()}`;
    addMatchupVote(key, pick);
    const data = getMatchupDistribution(key);
    matchupCaches[type] = { key, data, time: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/matchup error:", error);
    return NextResponse.json(
      { error: "Failed to save matchup vote" },
      { status: 500 },
    );
  }
}
