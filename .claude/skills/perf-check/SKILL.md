---
name: perf-check
description: Frontend engineer review for render performance, bundle size, and query efficiency
---

# Performance Check

Act as a senior frontend engineer auditing this site for performance bottlenecks across the full stack — client rendering, server queries, and bundle efficiency.

## Two lessons this project already paid for

**`next/dynamic` is not a bundle guarantee.** Turbopack prefetches dynamic
chunks, so a "lazy" 295KB Webamp chunk went over the wire on the default view to
every visitor who never opened it. Anything genuinely heavy loads from `/vendor`
with a plain script tag instead — that is why `public/vendor/webamp.bundle.min.js`
(~917KB) exists and why `WebampView` does not import it.

**Measure a fresh production visit; chunk names are hashed.** Grepping a
filename for the library's name proves nothing. Load the built site and look at
what is actually requested. Every bundle claim in a finding needs that evidence
behind it — the 348KB home-path regression that split `lib/album-facts.js` out of
the Soundtrack Corner generator was found this way and would not have been found
by reading.

## Arguments

Optional: focus area (e.g., "bundle", "rendering", "database", "animations")

## Review Scope

### Client-Side Performance

**Rendering**

- Are any components re-rendering unnecessarily? (state changes in parent causing child re-renders)
- Are the activity components independently rendered or do they share state that causes cascading updates? There are about ten now — Rate & Reveal, Vibe Check, the five rotating games, Playlist Poll, Versus, Blind Taste Test — all inside one `ForumPage` client component
- `ForumPage` remounts on every tab change now that each section is a route. What re-runs on mount, and does any of it re-fetch what it just had?
- Is the autocomplete in GuessGame filtering efficiently? (424 albums — check the pattern)
- Do CSS animations use GPU-accelerated properties (transform, opacity) or expensive ones (width, height, top)?

**Bundle**

- What's the client bundle size? Run `npm run build` and check the output
- Is the Soundtrack Corner generator (large) still off the home path? It is behind `next/dynamic` on purpose, and `lib/album-facts.js` exists solely to keep the fact data from dragging it along
- Is anything on the default album view pulling in Webamp? Nothing should be fetched until that view is opened
- Is `lib/albums.json` (424 albums) being sent to the client? It should be — it's needed for autocomplete
- Are there any unnecessary dependencies being pulled in?
- Is `better-sqlite3` accidentally bundled for the client? (It's server-only)

**Hydration**

- Are there hydration mismatches? (random values, date-dependent rendering)
- Is `"use client"` on the right boundary? Could anything move to server components?

### Routing

- Six routes (`/`, `/soundtrack`, `/cozy`, `/archive`, `/stats`, `/faq`), all `force-dynamic`, all rendering the same `ForumPage`
- The nav links carry `prefetch`, so a tab click should issue **no** request. Verify with resource timings on a production build, not in dev
- Each tab route also serves an `opengraph-image` — those are `force-dynamic` too and regenerate per request by design (the album turns over at UTC midnight)

### Server-Side Performance

**Database Queries**

- Are SQLite queries using indexes? Check that `idx_ratings_album`, `idx_vibes_album`, `idx_guess_puzzle` are actually used
- Are queries efficient for the access patterns? (distribution aggregation, vibe counts)
- Could any queries become slow as the tables grow? (e.g., after a year of daily use)
- Is the database connection properly reused (singleton) or opened per-request?

**API Routes**

- Are responses cached or computed fresh every time?
- Eight GET endpoints already hold an in-memory cache (rate, vibe, playlist, matchup, guess, soundtrack, soundtrack/history, stats) — mostly 30s. Is the TTL still right, and is anything missing one that should have it?
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
- Do NOT assume the app is a single page — it is six routes, and it already code-splits deliberately (Soundtrack Corner via `next/dynamic`, Webamp via `/vendor`). Suggest splitting only with a measured before/after
- Focus on quick wins that improve perceived performance for real users
