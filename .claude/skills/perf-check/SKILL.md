---
name: perf-check
description: Frontend engineer review for render performance, bundle size, and query efficiency
---

# Performance Check

Act as a senior frontend engineer auditing this site for performance bottlenecks across the full stack — client rendering, server queries, and bundle efficiency.

## Arguments

Optional: focus area (e.g., "bundle", "rendering", "database", "animations")

## Review Scope

### Client-Side Performance

**Rendering**

- Are any components re-rendering unnecessarily? (state changes in parent causing child re-renders)
- Are the three activity components (RateReveal, VibeCheck, GuessGame) independently rendered or do they share state that causes cascading updates?
- Is the autocomplete in GuessGame filtering efficiently? (30 albums is fine, but check the pattern)
- Do CSS animations use GPU-accelerated properties (transform, opacity) or expensive ones (width, height, top)?

**Bundle**

- What's the client bundle size? Run `npm run build` and check the output
- Is `lib/albums.js` (30 albums) being sent to the client? It should be — it's needed for autocomplete
- Are there any unnecessary dependencies being pulled in?
- Is `better-sqlite3` accidentally bundled for the client? (It's server-only)

**Hydration**

- Are there hydration mismatches? (random values, date-dependent rendering)
- Is `"use client"` on the right boundary? Could anything move to server components?

### Server-Side Performance

**Database Queries**

- Are SQLite queries using indexes? Check that `idx_ratings_album`, `idx_vibes_album`, `idx_guess_puzzle` are actually used
- Are queries efficient for the access patterns? (distribution aggregation, vibe counts)
- Could any queries become slow as the tables grow? (e.g., after a year of daily use)
- Is the database connection properly reused (singleton) or opened per-request?

**API Routes**

- Are responses cached or computed fresh every time?
- For GET endpoints (rating distribution, vibe distribution) — could these benefit from in-memory caching with short TTL?
- What's the response time for each endpoint under normal load?

**Rate Limiter**

- The in-memory Map in `rate-limit.js` — does it grow unbounded?
- Is the 1% random cleanup sufficient, or will it accumulate stale entries?

### CSS Performance

- Are CSS animations triggering layout/paint? Check for animations on `width`, `height`, `top`, `left`
- The vinyl disc uses multiple radial-gradient layers — is this causing paint bottlenecks?
- Are there any unused CSS rules bloating the stylesheet?

## Output Format

For each finding:

1. **Impact**: High / Medium / Low
2. **Area**: Client / Server / CSS / Bundle
3. **Finding**: What the issue is
4. **Evidence**: Measurement or observation (build output, render count, query plan)
5. **Fix**: Specific recommendation with effort estimate (quick / moderate / involved)

## How to Measure

- Run `npm run build` to get bundle sizes
- Use preview tools to check for console errors and render behavior
- Read the SQLite queries and analyze them against the schema
- Check CSS animation properties against the compositor-friendly list

## Boundaries

- Do NOT suggest React Server Components refactoring unless there's a clear win
- Do NOT suggest adding monitoring/APM tools — this is a hobby project
- Do NOT suggest lazy loading or code splitting — the app is a single page
- Focus on quick wins that improve perceived performance for real users
