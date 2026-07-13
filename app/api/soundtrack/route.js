import { headers } from "next/headers";
import { addSoundtrackVote, getSoundtrackDistribution } from "@/lib/db";
import { getTodayKey } from "@/lib/albums";
import {
  getPublicRouteError,
  getSecondsUntilNextUtcDay,
  jsonNoStore,
  jsonRateLimited,
  readJsonBody,
} from "@/lib/api-helpers";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";

const VALID_PICKS = ["game", "film", "tv"];
let soundtrackCache = { key: null, data: null, time: 0 };
const CACHE_TTL = 30000;

export async function GET() {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return jsonRateLimited();
    }

    const key = getTodayKey();
    const now = Date.now();
    if (soundtrackCache.key === key && now - soundtrackCache.time < CACHE_TTL) {
      return jsonNoStore(soundtrackCache.data);
    }
    const data = getSoundtrackDistribution(key);
    soundtrackCache = { key, data, time: now };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to load soundtrack votes",
    );
    if (publicError.status >= 500) {
      console.error("GET /api/soundtrack error:", error);
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

    const body = await readJsonBody(request, { maxChars: 1024 });
    const pick =
      typeof body.pick === "string" ? body.pick.trim().toLowerCase() : "";
    if (!VALID_PICKS.includes(pick)) {
      return jsonNoStore(
        { error: "Pick must be game, film, or tv" },
        { status: 400 },
      );
    }

    // After validation so malformed requests don't consume the daily quota
    if (!checkDailyLimit(ip, "soundtrack")) {
      return jsonRateLimited("Daily soundtrack vote limit reached", {
        retryAfter: getSecondsUntilNextUtcDay(),
      });
    }

    const albumKey = getTodayKey();
    addSoundtrackVote(albumKey, pick);
    const data = getSoundtrackDistribution(albumKey);
    soundtrackCache = { key: albumKey, data, time: Date.now() };
    return jsonNoStore(data);
  } catch (error) {
    const publicError = getPublicRouteError(
      error,
      "Failed to save soundtrack vote",
    );
    if (publicError.status >= 500) {
      console.error("POST /api/soundtrack error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
