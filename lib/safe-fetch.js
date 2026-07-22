/* Client-side GET helper shared by ForumPage and SoundtrackCorner.
 *
 * API error paths (429 rate-limit, 503 DB-busy) return a VALID JSON {error}
 * body with a non-2xx status. A bare `.then(r => r.json())` resolves that
 * error object and stores it as component state, which then throws during
 * render (e.g. Object.values(results.distribution) on undefined) — and with
 * no error boundary that blanks the whole page. Throw instead, so callers
 * keep their results null and fall back to a pending/retry state. */
export async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== "object" || data.error) {
    throw new Error("Unexpected response body");
  }
  return data;
}
