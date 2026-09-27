import crypto from "node:crypto";

/* A fingerprint of exactly the catalog inputs that decide a day's picks, and
   nothing else. Used by scripts/pin-schedule.mjs (to record which catalog the
   unpinned future will be computed from) and by scripts/eval-site.mjs (to fail
   when the catalog has changed since the schedule was last pinned).

   What goes in: album order, identity, and the three flags the game pools
   filter on (recognizable, has a cover image, has a video), plus which albums
   have a lyric entry. What stays out: colour, genre, year, cover emoji — a
   colour fix must not demand a re-pin, because it cannot change a pick.

   Node-only (node:crypto). Never import this from anything the browser loads;
   nothing at runtime needs it. */
export function catalogFingerprint(albums, lyricKeys) {
  const rows = albums.map((a) =>
    [
      a.artist,
      a.title,
      a.recognizable ? 1 : 0,
      a.image ? 1 : 0,
      a.youtubeId ? 1 : 0,
    ].join("␟"),
  );
  const lyrics = [...lyricKeys].map((k) => k.toLowerCase()).sort();
  return crypto
    .createHash("sha256")
    .update(rows.join("\n"))
    .update("\n--lyrics--\n")
    .update(lyrics.join("\n"))
    .digest("hex")
    .slice(0, 16);
}
