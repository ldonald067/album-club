export function makeRequestError(message, status, code = "REQUEST_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function readJsonBody(
  request,
  { maxChars = 1024, requireObject = true } = {},
) {
  const text = await request.text();

  if (text.length > maxChars) {
    throw makeRequestError("Request too large", 413, "REQUEST_TOO_LARGE");
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw makeRequestError("Invalid JSON", 400, "INVALID_JSON");
  }

  if (
    requireObject &&
    (!body || Array.isArray(body) || typeof body !== "object")
  ) {
    throw makeRequestError("JSON body must be an object", 400, "INVALID_BODY");
  }

  return body;
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
