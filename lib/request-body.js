/**
 * Request-body parsing, deliberately free of any `next/server` import so it can
 * be exercised by node:test directly. `lib/api-helpers.js` re-exports these, so
 * route handlers keep importing from one place.
 */

export function makeRequestError(message, status, code = "REQUEST_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Read the body without ever buffering more than the cap allows.
 *
 * `request.text()` reads the whole stream into memory before anyone can
 * measure it, so a Content-Length precheck only protects against clients that
 * declare a length. A chunked request declares none, and used to sail past the
 * check and get buffered in full regardless of size. Reading the stream by hand
 * lets us stop at the first chunk that crosses the limit.
 *
 * The cap is in bytes because that is what the transport actually costs;
 * UTF-8 runs up to 4 bytes per character, so byte budget = maxChars * 4. The
 * caller still checks character length afterwards for the real limit.
 */
async function readTextWithLimit(request, maxBytes) {
  if (!request.body) return request.text();

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        throw makeRequestError("Request too large", 413, "REQUEST_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    // Stop the sender rather than leaving a half-read stream open
    reader.cancel().catch(() => {});
    throw err;
  }

  return text + decoder.decode();
}

export async function readJsonBody(
  request,
  { maxChars = 1024, requireObject = true } = {},
) {
  const maxBytes = maxChars * 4;

  // Cheap early reject for clients that declare a length — saves reading a
  // stream we already know is too big. Not a substitute for the limit below.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw makeRequestError("Request too large", 413, "REQUEST_TOO_LARGE");
  }

  const text = await readTextWithLimit(request, maxBytes);

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
