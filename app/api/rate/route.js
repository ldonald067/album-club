import { headers } from "next/headers";
import { addRating, getRatingDistribution } from "@/lib/db";
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

let rateCache = { key: null, data: null, time: 0 };
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
    if (rateCache.key === key && now - rateCache.time < CACHE_TTL) {
      return jsonNoStore(rateCache.data);
    }
    const data = getRatingDistribution(key);
    rateCache = { key, data, time: now };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to load ratings");
    if (publicError.status >= 500) {
      console.error("GET /api/rate error:", error);
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

    // Daily vote cap: 3 ratings per IP per day
    if (!checkDailyLimit(ip, "rate")) {
      return jsonRateLimited("Daily rating limit reached", {
        retryAfter: getSecondsUntilNextUtcDay(),
      });
    }

    const body = await readJsonBody(request, { maxChars: 1024 });
    const { rating } = body;
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 10
    ) {
      return jsonNoStore(
        { error: "Rating must be an integer 1-10" },
        { status: 400 },
      );
    }

    const albumKey = getTodayKey();
    addRating(albumKey, rating);
    const data = getRatingDistribution(albumKey);
    rateCache = { key: albumKey, data, time: Date.now() };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to save rating");
    if (publicError.status >= 500) {
      console.error("POST /api/rate error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
