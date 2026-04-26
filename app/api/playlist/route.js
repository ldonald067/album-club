import { headers } from "next/headers";
import { addPlaylistVote, getPlaylistDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import {
  getPublicRouteError,
  getSecondsUntilNextUtcDay,
  jsonNoStore,
  jsonRateLimited,
  readJsonBody,
} from "@/lib/api-helpers";
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
      return jsonRateLimited();
    }
    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get("key");
    const key = rawKey && isValidDateKey(rawKey) ? rawKey : getTodayKey();
    const now = Date.now();
    if (playlistCache.key === key && now - playlistCache.time < CACHE_TTL) {
      return jsonNoStore(playlistCache.data);
    }
    const data = getPlaylistDistribution(key);
    playlistCache = { key, data, time: now };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to load playlist votes",
    );
    if (publicError.status >= 500) {
      console.error("GET /api/playlist error:", error);
    }
    return jsonNoStore(
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
      return jsonRateLimited();
    }

    if (!checkDailyLimit(ip, "playlist")) {
      return jsonRateLimited("Daily playlist vote limit reached", {
        retryAfter: getSecondsUntilNextUtcDay(),
      });
    }

    const body = await readJsonBody(request, { maxChars: 1024 });
    const { vote } = body;
    if (typeof vote !== "boolean") {
      return jsonNoStore(
        { error: "Vote must be true or false" },
        { status: 400 },
      );
    }

    const albumKey = getTodayKey();
    addPlaylistVote(albumKey, vote);
    const data = getPlaylistDistribution(albumKey);
    playlistCache = { key: albumKey, data, time: Date.now() };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to save playlist vote",
    );
    if (publicError.status >= 500) {
      console.error("POST /api/playlist error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
