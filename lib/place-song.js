/* Which song of an album a one-song YouTube video is — the placement the
   hero's song-day turntable lights (lib/song-videos.js). Used by
   scripts/audit-youtube-ids.mjs, which fetches the evidence and records the
   result; kept here, apart from the network, so the rules can be tested
   (test/place-song.test.mjs). */

import { MAX_TRACKS } from "./vinyl-bands.js";

/* Fold accents and combining marks (one upload spells it "lo̲ve̲l̲es̲s"),
   apostrophes and punctuation, so titles compare as plain words. */
export const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* A track title as a video would write it. MusicBrainz lists "For Free?
   (Interlude)" and "Come Together - 2019 Mix"; an upload says "For Free?". The
   first version of this audit compared full titles and reported TPAB's own
   track as not on the album. */
export const trackKey = (title) =>
  norm(title.replace(/\s*[([].*?[)\]]\s*/g, " ").replace(/\s+-\s+.*$/, ""));

// Titles too generic to identify anything on their own
export const GENERIC = new Set([
  "intro",
  "outro",
  "interlude",
  "skit",
  "reprise",
  "untitled",
]);

/* Whole-word match, so short titles count. The first version skipped anything
   under four characters to avoid noise and so missed SZA's "SOS", Charli's
   "360" and Kendrick's "gnx" — all real tracks, all reported as wrong. */
export const namesTrack = (videoTitle, tracks) => {
  const haystack = ` ${norm(videoTitle)} `;
  return tracks.filter((t) => {
    const key = trackKey(t);
    return (
      key.length >= 2 && !GENERIC.has(key) && haystack.includes(` ${key} `)
    );
  });
};

/* The video's title names the album, as whole words. Length alone proved
   nothing: any 30–60 minute upload passed as the full album. */
export const namesAlbum = (videoTitle, album) => {
  const key = norm(album.title);
  return key.length >= 2 && ` ${norm(videoTitle)} `.includes(` ${key} `);
};

/* Which song of the record a one-song video is, for the song-day turntable
   (lib/song-videos.js): { track, of, song }, or { why } it cannot be placed.
   The needle goes on that song's band, so every step must be certain:

   - The title names exactly one track, once the names it explains away are
     set aside: a track inside a longer one it names ("Sober" in "Sober II
     (Melodrama)"), the artist's own name when another track is named too
     (Slowdive's "Slowdive"), and the tracks the album's name accounts for
     when it names the album ("squabble up (GNX)" names "gnx" too). Most
     one-song videos are the title track — "Prince - Purple Rain (Official
     Video)" — so naming only the album is the title track, if its length
     agrees (below), and if the title says nothing else (namesOnlyAlbum).
   - The rings are drawn: the count album-facts settled on (`tracks`, the
     consensus across editions) is 2–20 (lib/vinyl-bands.js).
   - Every edition with exactly that many tracks has the song at one place,
     and all of them agree on where. One that lacks it or has it twice means
     the running order is not settled, so it refuses the placement rather
     than being passed over. The merged tracklist is no use for this — its
     order is not any edition's running order. (DAMN.'s collector's edition
     runs backwards; Born to Run has a cassette-sided edition.)
   - The video runs as long as that track, within SONG_LENGTH. Measured on
     all 72 one-song videos (2026-10-08): almost every one is within 5%. The
     ones that are not are what the needle cannot follow — a 13.7-minute film
     around Thriller's six, a video at twice its song's length, a 1.4-minute
     snippet — and the check is what settles a video that names only the
     album: it is the title track because it runs as long as the title track. */

/* What a title may add to the artist and the album and still name nothing
   but the title track: "(Official Video)", "(2018 Remaster)". Kept short on
   purpose — a word missing here costs a placement, never a wrong one. */
const DRESSING = new Set([
  "official",
  "video",
  "audio",
  "music",
  "lyric",
  "lyrics",
  "visualizer",
  "visualiser",
  "remaster",
  "remastered",
  "master",
]);

/** Whether `videoTitle` says nothing but the album's artist, its title and
    DRESSING (and a year). */
export const namesOnlyAlbum = (videoTitle, album) => {
  let rest = ` ${norm(videoTitle)} `;
  // The longer first: "The Miseducation of Lauryn Hill" holds its artist
  const names = [album.title, album.artist].sort((a, b) => b.length - a.length);
  for (const name of names) {
    const words = ` ${norm(name)} `;
    while (words.trim() && rest.includes(words))
      rest = rest.replace(words, " ");
  }
  return rest
    .split(" ")
    .every((w) => !w || DRESSING.has(w) || /^(19|20)\d\d$/.test(w));
};

export const SONG_LENGTH = { min: 0.75, max: 1.35 };
export function placeSong(
  album,
  videoTitle,
  videoMinutes,
  matched,
  releases,
  tracks,
) {
  let keys = [...new Set(matched.map(trackKey))];
  const within = (outer, inner) => ` ${outer} `.includes(` ${inner} `);
  keys = keys.filter((k) => !keys.some((o) => o !== k && within(o, k)));
  if (keys.length > 1)
    keys = keys.filter((k) => !within(norm(album.artist), k));
  if (namesAlbum(videoTitle, album)) {
    const others = keys.filter((k) => !within(norm(album.title), k));
    if (others.length) keys = others;
  }
  if (keys.length !== 1) return { why: `names ${keys.length} tracks` };
  if (!Number.isInteger(tracks)) return { why: "track count unknown" };
  if (tracks < 2 || tracks > MAX_TRACKS) {
    return { why: `${tracks} tracks: no rings drawn` };
  }
  const [key] = keys;
  /* Naming the album is naming the title track only when the title names
     nothing else: "Radiohead - Creep (The Bends sessions)" names no track
     but The Bends — Creep is not on it — and runs as long as most songs, so
     the length check alone would have placed it as the title track. */
  if (
    namesAlbum(videoTitle, album) &&
    within(norm(album.title), key) &&
    !namesOnlyAlbum(videoTitle, album)
  ) {
    return { why: "names the album and something else" };
  }
  /* The song on any edition is a track that names it, or a recording a
     track naming it was: "FTBC" and "Norman ******* Rockwell" are those
     songs, recording for recording, on editions that spell them so. A
     similar title on another recording is not proof, and does not count. */
  const named = releases.flat().filter((t) => trackKey(t.title) === key);
  const recordings = new Set(named.map((t) => t.recording).filter(Boolean));
  const isSong = (t) =>
    trackKey(t.title) === key || recordings.has(t.recording);
  const placings = new Map(); // track number -> that track on each edition
  for (const release of releases) {
    if (release.length !== tracks) continue;
    const at = release.flatMap((t, i) => (isSong(t) ? [i + 1] : []));
    /* An edition the rings' length that lacks the song, or has it twice,
       refuses the placement. Passing over it made "every edition agrees"
       mean "every edition that has it once agrees". */
    if (at.length !== 1) {
      return { why: `a ${tracks}-track edition has it ${at.length} times` };
    }
    placings.set(at[0], [...(placings.get(at[0]) || []), release[at[0] - 1]]);
  }
  if (!placings.size) return { why: `no ${tracks}-track edition` };
  if (placings.size > 1) {
    return {
      why: `${tracks}-track editions disagree: track ${[...placings.keys()].join(" or ")}`,
    };
  }
  const [[track, onEditions]] = placings;
  const lengths = onEditions
    .map((t) => t.ms)
    .filter((ms) => ms > 0)
    .sort((a, b) => a - b);
  if (!lengths.length) return { why: "no track length to check against" };
  const trackMinutes = lengths[Math.floor(lengths.length / 2)] / 60000;
  const ratio = videoMinutes / trackMinutes;
  if (!(ratio >= SONG_LENGTH.min && ratio <= SONG_LENGTH.max)) {
    return {
      why: `the video runs ${videoMinutes.toFixed(1)}m, the track ${trackMinutes.toFixed(1)}m`,
    };
  }
  /* The titles that name it agree once folded; show the one most editions
     use — never one only its recording matched, a censored "N*******" */
  const counts = new Map();
  for (const { title } of named) {
    counts.set(title, (counts.get(title) || 0) + 1);
  }
  const [song] = [...counts].sort(
    ([a, n], [b, m]) => m - n || a.length - b.length,
  )[0];
  return { track, of: tracks, song };
}
