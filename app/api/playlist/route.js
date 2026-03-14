import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { addPlaylistVote, getPlaylistDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import {
  checkRateLimit,
  checkDailyLimit,
  getRealIp,
  isValidDateKey,
} from "@/lib/rate-limit";

let playlistCache = { key: null, data: null, time: 0 };
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
    if (playlistCache.key === key && now - playlistCache.time < CACHE_TTL) {
      return NextResponse.json(playlistCache.data);
    }
    const data = getPlaylistDistribution(key);
    playlistCache = { key, data, time: now };
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/playlist error:", error);
    return NextResponse.json(
      { error: "Failed to load playlist votes" },
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

    if (!checkDailyLimit(ip, "playlist")) {
      return NextResponse.json(
        { error: "Daily playlist vote limit reached" },
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
    const { vote } = body;
    if (typeof vote !== "boolean") {
      return NextResponse.json(
        { error: "Vote must be true or false" },
        { status: 400 },
      );
    }

    const albumKey = getTodayKey();
    addPlaylistVote(albumKey, vote);
    const data = getPlaylistDistribution(albumKey);
    playlistCache = { key: albumKey, data, time: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/playlist error:", error);
    return NextResponse.json(
      { error: "Failed to save playlist vote" },
      { status: 500 },
    );
  }
}
