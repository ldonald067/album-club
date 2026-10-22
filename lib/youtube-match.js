/* Is this YouTube video the whole album? The rules
   scripts/fetch-youtube-ids.mjs applies to every search result before it
   keeps one, and the session rule scripts/audit-youtube-ids.mjs shares with
   it — kept here, apart from the network, so they can be tested
   (test/youtube-match.test.mjs).

   Every rule leans the same way: a video that cannot be shown to be the
   album is left out. A day without a video wears a pattern; a day with the
   wrong one claims an album it is not playing (docs/album-data.md). */

import { namesAlbum, norm } from "./place-song.js";

/** An ISO 8601 duration from the Data API ("PT1H2M3S") in seconds, or null.
    A live stream or an unstarted premiere reports "P0D". */
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    iso || "",
  );
  if (!m || iso === "P" || iso === "PT") return null;
  const [d, h, min, s] = m.slice(1).map((n) => Number(n || 0));
  return ((d * 24 + h) * 60 + min) * 60 + s;
}

/* A named session played whole, as the series itself posted it. For each:
   the catalog entry names the series, the video is the series' own upload,
   its title says it is the whole set, and it runs long enough to be one. All
   four, because each alone is weak: a fan re-upload can copy the title but
   not the channel, the length tells a set from one song lifted out of it,
   and a long video under a session entry could be anything. `title` is the
   upload's title normalised and padded with spaces, so `has` matches whole
   words and "Tiny Desk (Home) Concert" counts too. */
const has = (title, words) => title.includes(` ${norm(words)} `);
export const SESSIONS = [
  {
    // "NPR Tiny Desk: Mac Miller" — "Mac Miller: NPR Music Tiny Desk Concert"
    entry: /\btiny desk\b/i,
    channel: "NPR Music",
    minMinutes: 10,
    whole: (title, album) =>
      / tiny desk (home )?concert /.test(title) && has(title, album.artist),
  },
  {
    /* "Boiler Room: Montreal" — "Kaytranada | Boiler Room: Montreal". Named
       by the entry, not the artist: a city's night is "Various Artists".
       Sets run 40+ minutes; a shorter upload is a clip of one. */
    entry: /\bboiler room\b/i,
    channel: "Boiler Room",
    minMinutes: 20,
    whole: (title, album) => has(title, album.title),
  },
  {
    /* "KEXP Live Sessions: Khruangbin" — "Khruangbin - Full Performance (Live
       on KEXP)". Each song of a session is also posted on its own, as
       "Khruangbin - White Gloves ii (Live on KEXP)". */
    entry: /\bkexp\b/i,
    channel: "KEXP",
    minMinutes: 10,
    whole: (title, album) =>
      / full performance /.test(title) && has(title, album.artist),
  },
];

export const isSessionEntry = (album) =>
  SESSIONS.some((session) => session.entry.test(album.title));

/** `video` is { title, channel, seconds }. */
export const isFullSession = (album, video) =>
  Boolean(video.title) &&
  SESSIONS.some(
    (session) =>
      session.entry.test(album.title) &&
      video.channel === session.channel &&
      video.seconds >= session.minMinutes * 60 &&
      session.whole(` ${norm(video.title)} `, album),
  );

/* The artist's own channel, in the forms YouTube gives it: "Radiohead",
   "RadioheadVEVO", "Radiohead - Topic". Exact forms only — "starts with the
   artist" would let "Radiohead Fan Archive" through. */
const squash = (s) => norm(s).replace(/ /g, "");
export const officialChannel = (channel, artist) => {
  const c = squash(channel || "");
  const a = squash(artist);
  return (
    a.length >= 2 &&
    [a, `${a}topic`, `${a}vevo`, `${a}official`, `official${a}`].includes(c)
  );
};

const namesArtist = (title, artist) => {
  const key = norm(artist);
  return key.length >= 2 && ` ${norm(title)} `.includes(` ${key} `);
};

/* Words that make a long upload under the album's name something else: a
   documentary or a review runs as long as the record, a live show or a
   slowed edit plays other recordings, and a concert of the whole album is
   not the album. Whole words, and skipped when the album's own title or
   artist uses one ("MTV Unplugged in New York" is live; that is the album). */
export const NOT_THE_ALBUM = [
  "documentary",
  "review",
  "reaction",
  "reacts",
  "react",
  "breakdown",
  "explained",
  "analysis",
  "interview",
  "podcast",
  "commentary",
  "track by track",
  "listening party",
  "first listen",
  "first time hearing",
  "every song",
  "ranking",
  "ranked",
  "live",
  "concert",
  "tour",
  "rehearsal",
  "rehearsals",
  "session",
  "sessions",
  "outtakes",
  "alternate",
  "demo",
  "demos",
  "unreleased",
  "leak",
  "leaked",
  "bootleg",
  "cover",
  "covers",
  "tribute",
  "karaoke",
  "instrumental",
  "instrumentals",
  "acapella",
  "a cappella",
  "piano",
  "acoustic",
  "orchestra",
  "orchestral",
  "8 bit",
  "8bit",
  "music box",
  "remix",
  "remixes",
  "remixed",
  "mashup",
  "medley",
  "slowed",
  "reverb",
  "sped up",
  "nightcore",
  "chopped",
  "screwed",
  "bass boosted",
  "8d",
  "ai",
  "fanmade",
  "fan made",
  "unofficial",
  "type beat",
  "loop",
  "trailer",
  "teaser",
  "snippet",
  "snippets",
  "preview",
  "lesson",
  "tutorial",
  "making of",
  "behind the scenes",
  // An uploader's edit of the record — its order, its joins, its tuning
  "reversed",
  "transition",
  "transitions",
  "continuous mix",
  "432",
  "528",
  "pitched",
  "pitch shifted",
  // "full album with enhanced female whispers": sounds laid over the record
  "enhanced",
  // A reissue in another order: DAMN.'s plays its tracklist backwards
  "collectors edition",
];

/* Uploads that dodge takedowns spell the title with combining marks
   ("S̲t̲evie W̲o̲nder - In̲n̲ervision̲s") and often shift the audio's pitch or
   speed as well, so the length can match and the record still not be the
   record. A real accent survives NFC as one character ("Björk"); these do
   not. The same uploads also spell it in styled maths letters
   ("𝐍𝐞𝐰𝐉𝐞𝐚𝐧𝐬 – 𝐆𝐞𝐭 𝐔𝐩"), which `norm` folds back to plain ones, so the
   title still names the album. A retuned copy says so in hertz
   ("432.001Hz"). Neither is offered as a near miss. */
const DISGUISED = /[̀-ͯ\u{1D400}-\u{1D7FF}]/u;
const RETUNED = /\d\s?hz\b/i;

/* An upload from anyone but the artist must say what it is. Without this a
   45-minute video titled "Artist - Album" could be anything that runs as
   long; with it, a fan upload of the album says so, as they do. */
const SAYS_FULL = [
  "full album",
  "full lp",
  "full ep",
  "complete album",
  "whole album",
  "entire album",
  "album completo",
  "album complet",
];

/* How close the video's length must be to the album's runtime
   (lib/album-facts.json, the consensus across editions). An upload of the
   album runs within seconds of it; one missing a song or carrying a deluxe
   edition's extra ones does not, and either would sweep the arm across rings
   drawn for another tracklist. The Hayley Williams bootleg ran 0.76 of its
   album. The audit's own floor is half the runtime: anything kept here
   passes it with room. */
export const FULL_RATIO = { min: 0.95, max: 1.08 };

const phraseIn = (padded, phrase) => padded.includes(` ${phrase} `);

/* A live album is allowed to say so. MusicBrainz types it "Live" whatever
   its title — _Unplugged in New York_, _The Köln Concert_ — and its upload
   says "live" or "concert" because that is what it is. */
const LIVE_WORDS = ["live", "concert", "tour", "session", "sessions"];

/** Whether one video is the whole album: { ok: true, official, ratio } or
    { ok: false, why }. `video` is { title, channel, seconds, embeddable,
    isPublic, live, ageRestricted, blockedInUS, published? }; `facts` is the
    album's lib/album-facts.json entry ({ runtimeMinutes, types }), or null
    when MusicBrainz has nothing on it. */
export function judgeVideo(album, facts, video) {
  const albumMinutes = facts?.runtimeMinutes || null;
  const isLive = Boolean(facts?.types?.includes("Live"));
  if (!video.isPublic) return { ok: false, why: "not public" };
  if (!video.embeddable) return { ok: false, why: "embedding disabled" };
  if (video.live) return { ok: false, why: "a live stream or premiere" };
  if (video.ageRestricted)
    return { ok: false, why: "age-restricted, which will not play embedded" };
  if (video.blockedInUS) return { ok: false, why: "blocked in the US" };
  if (!video.seconds) return { ok: false, why: "no length" };

  if (isSessionEntry(album)) {
    /* A series reposts old sets, so an upload can come years after its
       night, but never before it. Boiler Room has a Berlin set for most
       years; Maceo Plex's, posted in 2014, is not the 2019 entry. */
    const posted = Number(video.published?.slice(0, 4));
    if (posted && album.year && posted < album.year)
      return {
        ok: false,
        why: `posted in ${posted}, before the ${album.year} set`,
      };
    return isFullSession(album, video)
      ? { ok: true, official: true, ratio: null }
      : { ok: false, why: "not the series' own upload of the whole set" };
  }

  if (!namesAlbum(video.title, album))
    return { ok: false, why: "title does not name the album" };
  const official = officialChannel(video.channel, album.artist);
  if (!official && !namesArtist(video.title, album.artist))
    return {
      ok: false,
      why: "title does not name the artist, and the channel is not theirs",
    };

  if (DISGUISED.test(video.title.normalize("NFC")))
    return {
      ok: false,
      why: "disguised with combining marks, as uploads dodging takedowns are",
    };
  if (RETUNED.test(video.title))
    return { ok: false, why: "a retuned copy (hertz in the title)" };

  const padded = ` ${norm(video.title)} `;
  const own = ` ${norm(album.title)} ${norm(album.artist)} `;
  const word = NOT_THE_ALBUM.find(
    (w) =>
      phraseIn(padded, w) &&
      !phraseIn(own, w) &&
      !(isLive && LIVE_WORDS.includes(w)),
  );
  if (word) return { ok: false, why: `title says "${word}"` };
  if (!official && !SAYS_FULL.some((w) => phraseIn(padded, w)))
    return {
      ok: false,
      why: "not the artist's channel, and the title does not say full album",
    };

  if (!albumMinutes)
    return { ok: false, why: "no album runtime to check the length against" };
  const ratio = video.seconds / 60 / albumMinutes;
  if (ratio < FULL_RATIO.min || ratio > FULL_RATIO.max)
    return {
      ok: false,
      why: `${(video.seconds / 60).toFixed(1)}m against the album's ${albumMinutes}m`,
    };
  return { ok: true, official, ratio };
}

/** Judge every result of one search, in search order, and pick the best
    that passes: the artist's own upload first, then the length closest to
    the album's, then the search's own order. */
export function pickFullAlbum(album, facts, videos) {
  const judged = videos.map((video, rank) => ({
    video,
    rank,
    ...judgeVideo(album, facts, video),
  }));
  const passing = judged
    .filter((j) => j.ok)
    .sort(
      (a, b) =>
        Number(b.official) - Number(a.official) ||
        Math.abs((a.ratio ?? 1) - 1) - Math.abs((b.ratio ?? 1) - 1) ||
        a.rank - b.rank,
    );
  return { pick: passing[0] ?? null, judged };
}
