import { headers } from "next/headers";
import { getAiredAlbums } from "@/lib/daily-picks";
import { getTodayKey } from "@/lib/albums";
import {
  getPublicRouteError,
  jsonNoStore,
  jsonRateLimited,
} from "@/lib/api-helpers";
import { checkRateLimit, getRealIp, isValidDateKey } from "@/lib/rate-limit";

/* Which album aired on each day, for the cue sheet (lib/cue-sheet.js). A
   browser stores its cues by date only, and the schedule is server-only.
   Never past today — a future day would give away what is coming — and never
   before the schedule's record began (getAiredAlbums). Read-only. */
const CACHE_TTL = 60000;

let daysCache = { key: null, data: null, time: 0 };

export async function GET(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return jsonRateLimited();
    }

    const since = new URL(request.url).searchParams.get("since");
    if (since !== null && !isValidDateKey(since)) {
      return jsonNoStore({ error: "Invalid date" }, { status: 400 });
    }

    const key = getTodayKey();
    const now = Date.now();
    if (daysCache.key !== key || now - daysCache.time >= CACHE_TTL) {
      daysCache = { key, data: getAiredAlbums(), time: now };
    }

    const days = since
      ? daysCache.data.filter((day) => day.date >= since)
      : daysCache.data;
    return jsonNoStore({ days });
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to load the days");
    if (publicError.status >= 500) {
      console.error("GET /api/soundtrack/days error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
