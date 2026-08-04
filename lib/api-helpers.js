import { NextResponse } from "next/server";

// Body parsing lives in a next-free module so node:test can import it; routes
// still get everything from here.
export { makeRequestError, readJsonBody } from "./request-body.js";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function withNoStoreHeaders(headers = {}) {
  return {
    ...NO_STORE_HEADERS,
    ...headers,
  };
}

export function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: withNoStoreHeaders(init.headers),
  });
}

export function getSecondsUntilNextUtcDay(now = new Date()) {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );

  return Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1000));
}

export function jsonRateLimited(
  message = "Too many requests",
  { retryAfter = 60, headers = {} } = {},
) {
  return jsonNoStore(
    { error: message },
    {
      status: 429,
      headers: withNoStoreHeaders({
        "Retry-After": String(Math.max(1, Math.ceil(retryAfter))),
        ...headers,
      }),
    },
  );
}

export function getPublicRouteError(error, fallbackMessage) {
  if (error?.status && typeof error.message === "string") {
    return {
      message: error.message,
      status: error.status,
      code: typeof error.code === "string" ? error.code : "REQUEST_ERROR",
    };
  }

  const code = typeof error?.code === "string" ? error.code : "";

  if (/SQLITE_(?:BUSY|LOCKED)/.test(code)) {
    return {
      message: "The site is a little busy right now. Try again in a moment.",
      status: 503,
      code,
    };
  }

  if (
    /SQLITE_(?:READONLY|CANTOPEN|IOERR|FULL|PERM|CORRUPT|NOTADB)/.test(code)
  ) {
    return {
      message: "The site data is temporarily unavailable. Try again in a bit.",
      status: 503,
      code,
    };
  }

  return {
    message: fallbackMessage,
    status: 500,
    code: code || "INTERNAL_ERROR",
  };
}
