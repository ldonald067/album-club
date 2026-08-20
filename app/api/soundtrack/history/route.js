import { headers } from "next/headers";
import { getSoundtrackHistory } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import {
  getPublicRouteError,
  jsonNoStore,
  jsonRateLimited,
} from "@/lib/api-helpers";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";

/* The Archive lists the last 30 days, so that is the whole window this needs.
   Read-only: the vote itself still goes to /api/soundtrack. */
const HISTORY_DAYS = 30;
const CACHE_TTL = 60000;

let historyCache = { key: null, data: null, time: 0 };

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return jsonRateLimited();
    }

    const key = getTodayKey();
    const now = Date.now();
    if (historyCache.key === key && now - historyCache.time < CACHE_TTL) {
      return jsonNoStore(historyCache.data);
    }

    const since = new Date(Date.now() - HISTORY_DAYS * 86400000)
      .toISOString()
      .split("T")[0];
    const data = { days: getSoundtrackHistory(since) };
    historyCache = { key, data, time: now };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to load cue history",
    );
    if (publicError.status >= 500) {
      console.error("GET /api/soundtrack/history error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
