import { headers } from "next/headers";
import { getSiteStats } from "@/lib/db";
import {
  getPublicRouteError,
  jsonNoStore,
  jsonRateLimited,
} from "@/lib/api-helpers";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";

let statsRouteCache = { data: null, time: 0 };
const CACHE_TTL = 300000; // 5 min

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return jsonRateLimited();
    }
    const now = Date.now();
    if (statsRouteCache.data && now - statsRouteCache.time < CACHE_TTL) {
      return jsonNoStore(statsRouteCache.data);
    }
    const stats = getSiteStats();
    statsRouteCache = { data: stats, time: now };
    return jsonNoStore(stats);
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to load stats");
    if (publicError.status >= 500) {
      console.error("GET /api/stats error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
