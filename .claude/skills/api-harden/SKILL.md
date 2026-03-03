---
name: api-harden
description: Backend engineer review of API routes for security, validation, and robustness
---

# API Harden

Act as a senior backend engineer auditing the API routes for security vulnerabilities, input validation gaps, and robustness issues.

## Arguments

Optional: specific route to audit (e.g., "rate", "vibe", "guess") — defaults to all routes

## Review Scope

### Files to Audit

- `app/api/rate/route.js` — POST rating (1-10), GET distribution
- `app/api/vibe/route.js` — POST vibes (1-3 mood picks), GET distribution
- `app/api/guess/route.js` — POST game result stats, GET aggregate stats
- `lib/db.js` — SQLite queries (check for injection, error handling)
- `lib/rate-limit.js` — Rate limiter implementation

### Security Checklist

**Input Validation**

- Are all POST body fields validated for type, range, and format?
- Can a malicious payload crash the server (e.g., missing fields, wrong types, huge strings)?
- Are SQL parameters properly bound (not string-concatenated)?
- Can someone submit ratings outside 1-10? Vibes not in the VIBES list? Negative attempts?

**Rate Limiting**

- Is the rate limiter applied consistently to all routes?
- Can it be bypassed via header spoofing (X-Forwarded-For)?
- Does it handle IPv6 correctly?
- What happens under memory pressure (is the Map cleaned up)?

**Abuse Prevention**

- Can someone vote multiple times from the same browser by clearing localStorage?
- Can someone stuff the ballot via curl (no localStorage check server-side)?
- Are there any denial-of-service vectors (huge request bodies, slow queries)?

**Error Handling**

- Do routes return proper HTTP status codes (400 for bad input, 429 for rate limit, 500 for server error)?
- Are error messages safe (no stack traces, no internal paths leaked)?
- What happens if the database file is locked or corrupted?

**Data Integrity**

- Are album_key and puzzle_key validated against expected formats?
- Could someone inject data for future dates?
- Is there any risk of SQLite write contention under concurrent requests?

### SQLite-Specific

- WAL mode is enabled — is this sufficient for concurrent reads/writes?
- Are prepared statements cached or re-created per request?
- Is the connection properly shared (singleton pattern)?

## Output Format

For each issue found, report:

1. **Severity**: Critical / High / Medium / Low
2. **Route**: Which API route
3. **Issue**: What's wrong
4. **Exploit**: How it could be abused (be specific)
5. **Fix**: Code-level recommendation

Prioritize issues that could actually be exploited on a public-facing site. Skip theoretical issues that require unrealistic attack vectors for a hobby project.

## Boundaries

- Do NOT add authentication — the site is intentionally anonymous
- Do NOT suggest switching databases — SQLite is the right choice here
- Do NOT over-engineer — this is a fun community site, not a bank
- Focus on practical hardening that prevents the most likely abuse scenarios
