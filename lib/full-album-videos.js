import fullAlbumVideos from "./full-album-videos.json" with { type: "json" };

/* Which stored videos are the whole album, played through — the days the hero
   gets its turntable (docs/components.md → "The record on the deck").

   A youtubeId alone does not say that: it was collected for Heardle and the
   Taste Test, where one song is enough, and most stored ids are one song
   (docs/album-data.md). On those days the arm crossed every one of the
   album's song rings during a single track, a click on the fifth ring sought
   inside that one song, and hearing it out counted as hearing the album.

   The list is written by `npm run audit-youtube-ids -- --record` from its
   FULL_ALBUM verdicts and its FULL_SESSION ones (a Tiny Desk, Boiler Room or
   KEXP set as the series posted it, played whole), and keyed on artist, album AND id, so a refetched or
   reassigned id loses its turntable until the audit has seen it, rather
   than inheriting another video's verdict. Server-only in practice, like
   lib/album-facts.js: section-page.js looks it up and passes a boolean. */
export const fullAlbumKey = (album) =>
  `${album.artist}::${album.title}::${album.youtubeId}`;

export function playsWholeAlbum(album) {
  return (
    Boolean(album?.youtubeId) &&
    Object.hasOwn(fullAlbumVideos, fullAlbumKey(album))
  );
}
