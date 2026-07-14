# Soundtrack Corner Authoring Guide

How curated overrides and generator knowledge get written. Not runtime data.

## Source Policy

- Use reviews, retrospectives, and interviews for recurring motifs, production details, and how the album is framed culturally.
- Use Reddit for fan hooks: which scenes people imagine, which songs hit hardest, and what emotional contradictions listeners keep circling.
- Treat Reddit as flavor, not fact-checking.
- Do not lift article prose into app copy. Distill it into short original notes, then write fresh Soundtrack Corner text from those notes.
- Good override inputs: visual motifs, emotional contradiction, production texture, common fan associations, smart "listen next" adjacency.

## Batch Pipeline (schedule-aware)

1. Run `npm run soundtrack-corner-report`.
2. Write from the **"Coming up in rotation"** section — it sorts uncovered recognizable albums by their next featured air date, so effort lands on albums visitors will actually see soon. Take the top ~12.
3. For each: capture what critics keep noticing, what fans keep feeling, what scene language fits, and three "listen next" moves that exist in `lib/albums.json` (exact titles — dangling recs are dropped at runtime and now fail `npm run eval-site`).
4. Write the override in `lib/soundtrack-corner-data.js` in the established voice: specific musical anchors, wit without snark, no generic praise. Every `extraAngles` entry uses one of the five real angle keys.
5. Run `npm run eval-site` (structural validation), `npm run build`, spot-check one entry in the browser, ship.

## Raising the Floor (generator knowledge)

Albums without an override fall to a genre profile in `SOUNDTRACK_PROFILES`; albums whose genre matches no profile fall to `DEFAULT_PROFILE` and read blandest. The report's **"Generator floor"** section tracks this. When a genre cluster accumulates there, write a new profile — one profile improves dozens of albums at once. Profiles are matched in array order, so append new ones at the end to preserve existing routing; broad catch-alls (like bare `rock`) belong in the last profile's regex.

`DECADE_FLAVORS` adds era texture on top of profiles; keep it split by real decades as the catalog grows.

## Working Rules

- Prefer depth over raw count, but keep pushing the curated tier outward in batches so the corner does not become "special for 60 records and generic for everything else."
- Coverage status lives in the report, not in this file.
- Per-album research notes for the first ~28 overrides lived in this file until 2026-07; they shipped as overrides and were removed (see git history if you need them).
