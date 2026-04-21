import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addMatchupVote, getMatchupDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import { getPublicRouteError, readJsonBody } from "@/lib/api-helpers";
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
    const type = (searchParams.get("type") || "versus").trim().toLowerCase();
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
    const publicError = getPublicRouteError(
      error,
      "Failed to load matchup votes",
    );
    if (publicError.status >= 500) {
      console.error("GET /api/matchup error:", error);
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

    if (!checkDailyLimit(ip, "matchup")) {
      return NextResponse.json(
        { error: "Daily matchup vote limit reached" },
        { status: 429 },
      );
    }

    const body = await readJsonBody(request, { maxChars: 1024 });
    const { type, pick } = body;
    const normalizedType =
      typeof type === "string" ? type.trim().toLowerCase() : "";
    if (!VALID_TYPES.includes(normalizedType)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const normalizedPick =
      typeof pick === "string" ? pick.trim().toUpperCase() : "";
    if (normalizedPick !== "A" && normalizedPick !== "B") {
      return NextResponse.json(
        { error: "Pick must be A or B" },
        { status: 400 },
      );
    }

    const key = `${normalizedType}-${getTodayKey()}`;
    addMatchupVote(key, normalizedPick);
    const data = getMatchupDistribution(key);
    matchupCaches[normalizedType] = { key, data, time: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to save matchup vote",
    );
    if (publicError.status >= 500) {
      console.error("POST /api/matchup error:", error);
    }
    return NextResponse.json(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
