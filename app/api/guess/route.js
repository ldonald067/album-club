import { headers } from "next/headers";
import { addGuessStat, getGuessStats } from "@/lib/db";
import { getPuzzleKey, getTodayKey } from "@/lib/albums";
import {
  getPublicRouteError,
  getSecondsUntilNextUtcDay,
  jsonNoStore,
  jsonRateLimited,
  readJsonBody,
} from "@/lib/api-helpers";
import { checkRateLimit, checkDailyLimit, getRealIp } from "@/lib/rate-limit";
import {
  VALID_GUESS_TYPES as VALID_TYPES,
  validateGuessSubmission,
} from "@/lib/guess-validation";

// Cache per game type
const guessCaches = {};
const CACHE_TTL = 30000;

function resolveKey(type) {
  const today = getTodayKey();
  if (!type || type === "puzzle") return getPuzzleKey();
  return `${type}-${today}`;
}

export async function GET(request) {
  try {
    const hdrs = await headers();
    const ip = getRealIp(hdrs);
    if (!checkRateLimit(ip)) {
      return jsonRateLimited();
    }
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "puzzle").trim().toLowerCase();
    if (!VALID_TYPES.includes(type)) {
      return jsonNoStore({ error: "Invalid type" }, { status: 400 });
    }

    const key = resolveKey(type);
    const now = Date.now();
    const cached = guessCaches[type];
    if (cached && cached.key === key && now - cached.time < CACHE_TTL) {
      return jsonNoStore({ stats: cached.data });
    }
    const stats = getGuessStats(key);
    guessCaches[type] = { key, data: stats, time: now };
    return jsonNoStore({ stats });
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to load stats");
    if (publicError.status >= 500) {
      console.error("GET /api/guess error:", error);
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
    const validation = validateGuessSubmission(body);
    if (!validation.ok) {
      return jsonNoStore({ error: validation.error }, { status: 400 });
    }
    const { type, attempts, solved } = validation;

    // Daily vote cap: 3 submissions per IP per game type per day — checked
    // after validation so malformed requests don't consume the quota
    if (!checkDailyLimit(ip, `guess-${type}`)) {
      return jsonRateLimited("Daily guess limit reached", {
        retryAfter: getSecondsUntilNextUtcDay(),
      });
    }

    const puzzleKey = resolveKey(type);
    addGuessStat(puzzleKey, attempts, solved);
    const stats = getGuessStats(puzzleKey);
    guessCaches[type] = { key: puzzleKey, data: stats, time: Date.now() };
    return jsonNoStore({ stats });
  } catch (error) {
    const publicError = getPublicRouteError(error, "Failed to save stats");
    if (publicError.status >= 500) {
      console.error("POST /api/guess error:", error);
    }
    return jsonNoStore(
      { error: publicError.message },
      { status: publicError.status },
    );
  }
}
