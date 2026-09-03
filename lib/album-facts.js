import albumFacts from "./album-facts.json" with { type: "json" };

/* Its own module so that reading a fact does not drag in the Soundtrack Corner
   generator. `getAlbumFacts` used to live in lib/soundtrack-corner.js, and when
   the Club Player imported it from there the home page inherited the whole
   corner — soundtrack-corner-data.js is 348KB and is kept off the home path
   behind next/dynamic on purpose (CLAUDE.md, docs/performance.md). The largest
   home-page chunk went from 70KB to 147KB before this was spotted. */
export function getAlbumFacts(album) {
  return albumFacts[`${album.artist}::${album.title}`] || null;
}
