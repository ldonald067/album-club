import songVideos from "./song-videos.json" with { type: "json" };
import { fullAlbumKey } from "./full-album-videos.js";
import { MAX_TRACKS } from "./vinyl-bands.js";

/* Which stored videos are one song of the album, and which song — the days
   the hero's turntable plays just that song's band of the record
   (docs/components.md → "The record on the deck").

   The owner found a turntable on only the whole-album days "no fun" and
   chose (2026-10-08): one-song days get the deck too, with the needle on
   that song's own groove. That claims a position, so it is recorded only
   when it is known: the audit found the video's title names exactly one
   track, a MusicBrainz release with the same track count as the rings
   (lib/album-facts.json) has it at one place, and the rings are drawn at
   all, and the video runs as long as that track. Anything less is played as
   a single, across a record with no song rings (2026-10-09) — a needle on
   the wrong song is worse than one that names no song.

   Written by `npm run audit-youtube-ids -- --record`, beside
   lib/full-album-videos.json and keyed the same way — artist, album AND id —
   so a changed id loses its deck rather than inheriting another video's
   song. Server-only in practice: section-page.js looks it up and passes the
   song. */

/** Today's song as { track, of, title }, or null. `tracks` is the count the
    rings are drawn from: an entry recorded against another count would light
    a band that is not the song's, so it is ignored until re-recorded. */
export function songOnRecord(album, tracks) {
  if (!album?.youtubeId) return null;
  const entry = songVideos[fullAlbumKey(album)];
  if (
    !entry ||
    entry.of !== tracks ||
    !Number.isInteger(entry.of) ||
    entry.of < 2 ||
    entry.of > MAX_TRACKS ||
    !Number.isInteger(entry.track) ||
    entry.track < 1 ||
    entry.track > entry.of ||
    typeof entry.song !== "string" ||
    !entry.song
  ) {
    return null;
  }
  return { track: entry.track, of: entry.of, title: entry.song };
}
