/* What hangs in the empty margins either side of the page on a wide screen:
   the owner's pick from a list of ideas (2026-10-18) — 1990s and 2004
   sidebar junk, styled after the Web Design Museum's "Web Banners in the
   90s" and the deceptive ad formats of the era, all as parody.

   On the left, a 160×600 "skyscraper" poster that plays its joke in two
   beats like an animated GIF banner: a clickbait teaser ("Hot singles in
   your area"), then the deflating punchline and a fact about the day. On
   the right, bevelled 88×31 micro-banners, a webring bar, a fake error box
   and a disclaimer. Every poster is a notice for one of the club's own tabs.

   The copy writes itself. The owner asked not to have to keep changing it,
   so each poster, badge and error box is a frame filled from what the
   server already knows about the day: today's record and how the turntable
   plays it, its year, length and track count, yesterday's album, tomorrow's
   genre and decade, the size of the catalog, the date. The album changes
   every day, so the margins do too, and every fact is read off the same
   data the page shows. A frame whose fact is unknown that day steps aside
   for one that needs nothing. Halloween week (24–31 October) brings its own
   frames and an orange-and-black costume, and gives Dead Air top billing,
   by the date alone, every year.

   Parody, on the owner's call (2026-10-18): the badges name real 1990s
   products, and the error box and the fake close buttons copy the era's
   deceptive formats. A disclaimer under them says so, one of the posters
   jokes about it, and the fakes are harmless — a fake button never sends
   anyone anywhere, it only says "Nice try."

   Nothing is fetched from anywhere else: a feed would be one more thing
   that can fail or say something wrong, and wrong data is worse than
   missing data (CLAUDE.md). Rendered on the server (app/MarginRails.js)
   and drawn by app/globals.css, so it costs the browser no script.

   `day` is { dayKey, album, facts, plays, song, yesterday, tomorrow,
   catalogSize } — facts from lib/album-facts.js, `plays` and `song` as the
   turntable decides them (lib/tonearm.js recordPlays, lib/song-videos.js). */

import { recordArt } from "./record-art.js";

const mod = (n, m) => ((n % m) + m) % m;
const dayNumber = (dayKey) =>
  Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86400000);
const decade = (year) => `${Math.floor(year / 10) * 10}s`;
const WEEKDAYS = [
  "Thursday", // 1970-01-01, day 0
  "Friday",
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
];
// A title short enough to sit inside a headline, or a stand-in
const short = (title, max, instead) => (title.length <= max ? title : instead);
// The hero's rule: a coloured pressing in an album's round-number year
const anniversary = ({ dayKey, album }) => {
  const age = Number(dayKey.slice(0, 4)) - album.year;
  return age > 0 && age % 5 === 0 ? age : null;
};

/** Nights until Halloween during Halloween week (24–31 October, the
    club's UTC day): 7 down to 0 on the night itself. Null otherwise. */
export function halloween(dayKey) {
  if (dayKey.slice(5, 7) !== "10") return null;
  const date = Number(dayKey.slice(8, 10));
  return date >= 24 ? 31 - date : null;
}
const spooky = (d) => halloween(d.dayKey) !== null;

/* Each poster's frames, best first: a frame returns { tease, head, body,
   cta } — the teaser, the punchline, the fact, the button — or null when
   its fact is not known today. `to` is the section key it links to
   (app/sections.js). test/margin-rails.test.mjs renders every day of two
   years through all of them and checks each resolves, fits and never
   prints a hole. */
export const POSTERS = [
  {
    id: "turntable",
    to: "home",
    frames: [
      (d) =>
        spooky(d)
          ? {
              tease: "Something wicked spins this way",
              head: "Trick or treat?",
              body: `Today's treat is ${d.album.title} by ${d.album.artist}. ${d.plays ? "Press play" : "Spin it"} if you dare.`,
              cta: "TREAT ME",
            }
          : null,
      (d) => {
        const age = anniversary(d);
        return age
          ? {
              tease: `Someone in your area is turning ${age}`,
              head: `It's ${short(d.album.title, 24, "today's album")}.`,
              body: `${d.album.title} has been out since ${d.album.year}. Today it's pressed on coloured vinyl.`,
              cta: "SEE IT",
            }
          : null;
      },
      (d) =>
        d.plays === "song" && d.song
          ? {
              tease: "Hot singles in your area",
              head: "One is on the turntable.",
              body: `Track ${d.song.track} of ${d.song.of}, “${d.song.title}”. Drop the needle on it.`,
              cta: "PRESS PLAY",
            }
          : null,
      (d) =>
        d.plays === "album"
          ? {
              tease: "Doctors hate this one weird album",
              head: "No skips, no tricks.",
              body: `${d.facts?.tracks ? `All ${d.facts.tracks} songs of ` : ""}${d.album.title}, start to finish. Hear it through for the run-out.`,
              cta: "PRESS PLAY",
            }
          : null,
      (d) =>
        d.plays === "single"
          ? {
              tease: "Local record has just one groove",
              head: "One video, one groove.",
              body: `${d.album.title} plays as a single today.`,
              cta: "PRESS PLAY",
            }
          : null,
      /* A picture disc gives way to a zoetrope in the browser when the cover
         fails to load, which the server cannot know — so only the two
         patterns that never change hands get named */
      (d) => {
        const pattern = d.plays ? null : recordArt(d.dayKey)?.pattern;
        return pattern === "zoetrope" || pattern === "spiral"
          ? {
              tease: "You won't believe what this record does",
              head: `It's a ${pattern}.`,
              body: `${d.album.title} is pressed as a ${pattern === "spiral" ? "spinning spiral" : "zoetrope"} today. Spin it and see.`,
              cta: "SPIN IT",
            }
          : null;
      },
      (d) => ({
        tease: "Hot records in your area",
        head: "Well, one.",
        body: `Today it's ${d.album.title} by ${d.album.artist}.`,
        cta: "TAKE A LOOK",
      }),
    ],
  },
  {
    id: "cozy",
    to: "cozy",
    frames: [
      (d) =>
        spooky(d)
          ? {
              tease: "Too spooked to sleep?",
              head: "Cozy Vibes.",
              body: "Small, slow games with no score, no timer and no jump scares.",
              cta: "SLOW DOWN",
            }
          : null,
      (d) =>
        d.facts?.runtimeMinutes
          ? {
              tease: "Is your PC running slow?",
              head: "Good.",
              body: `${d.album.title} runs ${d.facts.runtimeMinutes} minutes. Cozy Vibes runs as long as you like.`,
              cta: "SLOW DOWN",
            }
          : null,
      () => ({
        tease: "Is your PC running slow?",
        head: "Good.",
        body: "Small, slow games with no score and no timer.",
        cta: "SLOW DOWN",
      }),
    ],
  },
  {
    id: "soundtrack",
    to: "soundtrack",
    frames: [
      (d) =>
        spooky(d)
          ? {
              tease: `Where does ${short(d.album.title, 20, "this album")} belong on Halloween?`,
              head: "A horror film?",
              body: `${d.album.genre} from ${d.album.year}. Cast tonight's cue.`,
              cta: "VOTE NOW",
            }
          : null,
      (d) => ({
        tease: `Where does ${short(d.album.title, 20, "this album")} belong tonight?`,
        head: "You decide.",
        body: `${d.album.genre} from ${d.album.year}: a game, a film or a TV show? Cast today's cue.`,
        cta: "VOTE NOW",
      }),
    ],
  },
  {
    id: "dead-air",
    to: "dead-air",
    frames: [
      (d) => {
        const nights = halloween(d.dayKey);
        if (nights === null) return null;
        return {
          tease: "Do not play this alone. Especially this week.",
          head:
            nights === 0
              ? "Tonight's the night."
              : `${nights} night${nights === 1 ? "" : "s"} to Halloween.`,
          body: "A music horror escape room. Lights off, sound on, if you dare.",
          cta: "TUNE IN",
        };
      },
      (d) => ({
        tease: "Do not play this alone",
        head: "Seriously.",
        body: `A music horror escape room. Especially not on a ${WEEKDAYS[mod(dayNumber(d.dayKey), 7)]} night.`,
        cta: "TUNE IN",
      }),
    ],
  },
  {
    id: "archive",
    to: "archive",
    frames: [
      (d) =>
        spooky(d) && d.yesterday
          ? {
              tease: "The ghosts of albums past",
              head: "Thirty days of them.",
              body: `Yesterday's was ${d.yesterday.title} by ${d.yesterday.artist}. It's haunting the Archive.`,
              cta: "BOO",
            }
          : null,
      (d) =>
        d.yesterday
          ? {
              tease: "Congrats! You've won!",
              head: "Nothing. You won nothing.",
              body: `There is no prize. Yesterday was ${d.yesterday.title} by ${d.yesterday.artist}, and it's in the Archive.`,
              cta: "CLAIM NOTHING",
            }
          : null,
      () => ({
        tease: "Congrats! You've won!",
        head: "Nothing. You won nothing.",
        body: "There is no prize. There are thirty days of albums.",
        cta: "CLAIM NOTHING",
      }),
    ],
  },
  {
    id: "faq",
    to: "faq",
    frames: [
      (d) => ({
        tease: "Free! No sign-up! No catch!",
        head: "Really.",
        body: `${d.catalogSize} albums, one a day, nothing to sign up for. Today's is ${d.album.title}.`,
        cta: "READ MORE",
      }),
    ],
  },
  // The joke about the disclaimer, which the owner asked for
  {
    id: "legal",
    to: "faq",
    frames: [
      () => ({
        tease: "Netscape did not pay for this ad",
        head: "Nobody did.",
        body: "Netscape Navigator retired in 2008. The badges on the right are parodies, and so is this.",
        cta: "FINE PRINT",
      }),
    ],
  },
];

/* Cozy Vibes and Dead Air widen their game frames into the margins on a
   wide screen (globals.css, .cozy-panel), and a game is the whole point of
   those tabs, so the rails stay off them. */
export const showsRails = (section) =>
  section !== "cozy" && section !== "dead-air";

/* The poster's costume, a different 2004 ad format every week (the owner's
   ask, 2026-10-23): its colours, type, border and a sticker slapped on the
   record, drawn by .rail-look-<id> in globals.css. Weekly, not monthly: the
   copy already changes every day, and a daily visitor would wear one look
   out over a month. Each turns over on a Monday, the club's UTC day, and
   comes back every eight weeks. Halloween week wears its own instead.
   Classic is the yellow, red and navy the poster started in, and the only
   look a skin restyles; the others are costumes, the same in every skin. */
export const LOOKS = [
  { id: "classic", sticker: null },
  { id: "winner", sticker: "WINNER!" },
  { id: "slime", sticker: "FREE!!" },
  { id: "scan", sticker: "FREE SCAN" },
  { id: "jackpot", sticker: "777" },
  { id: "tabloid", sticker: "SHOCKING!" },
  { id: "y2k", sticker: "NEW!" },
  { id: "dating", sticker: "HOT ♥" },
];

/** The look for the week `dayKey` falls in, or null in Halloween week. */
export function lookFor(dayKey) {
  if (halloween(dayKey) !== null) return null;
  const n = dayNumber(dayKey);
  // Day 0, 1970-01-01, was a Thursday: three days on, every week starts on
  // a Monday
  const week = Math.floor(((Number.isFinite(n) ? n : 0) + 3) / 7);
  return LOOKS[mod(week, LOOKS.length)];
}

/** The poster for `day` beside `section`: the posters it may hang — all
    but those for the tab it hangs beside — one a day in turn, in that
    poster's best frame with a fact today. In Halloween week Dead Air has
    every other day. Skipping its own tab's turn instead of filtering put
    the next poster up two days running. */
export function posterFor(day, section) {
  const posters = POSTERS.filter((p) => p.to !== section);
  const n = dayNumber(day.dayKey);
  const at = Number.isFinite(n) ? n : 0;
  const billed =
    spooky(day) && at % 2 === 0
      ? posters.find((p) => p.id === "dead-air")
      : null;
  const poster = billed || posters[mod(at, posters.length)];
  for (const frame of poster.frames) {
    const copy = frame(day);
    if (copy) {
      return {
        id: poster.id,
        to: poster.to,
        spooky: spooky(day),
        look: lookFor(day.dayKey),
        ...copy,
      };
    }
  }
  return null;
}

/* Bevelled 88×31 micro-banners: an icon square, a small pixel-type line
   and a bold word in an inset box, in one of four icon colours (.rail-
   badge-a … -d). The day's facts always; three of the 1990s parodies,
   taking turns by date. Inert: a badge was a link with "copy this code to
   link to us" under it, and that is a share button (CLAUDE.md). */
export const PARODY_BADGES = [
  { icon: "N", small: "NETSCAPE", big: "THEN!", look: "c" },
  { icon: "e", small: "OPTIMISED", big: "FOR IE6", look: "c" },
  { icon: "G", small: "GEOCITIES", big: "RIP '09", look: "d" },
  { icon: "f", small: "GET FLASH", big: "(CAN'T)", look: "a" },
  { icon: "▶", small: "REALPLAYER", big: "BUFFER…", look: "b" },
  { icon: "⌘", small: "MADE ON A", big: "MAC", look: "b" },
  { icon: "⚠", small: "HARD HAT", big: "AREA", look: "d" },
];

export function badgesFor(day) {
  const { album, facts, tomorrow } = day;
  const n = dayNumber(day.dayKey);
  const at = Number.isFinite(n) ? n : 0;
  const nights = halloween(day.dayKey);
  const parodies = [0, 1, 2].map(
    (k) => PARODY_BADGES[mod(at + k * 2, PARODY_BADGES.length)],
  );
  if (nights !== null) {
    parodies[2] = {
      icon: "☾",
      small: "HALLOWEEN",
      big: nights === 0 ? "TONIGHT" : `IN ${nights}`,
      look: "a",
    };
  }
  return [
    { icon: "◉", small: "PRESSED", big: `${album.year}`, look: "a" },
    facts?.tracks && facts?.runtimeMinutes
      ? {
          icon: "♫",
          small: `${facts.tracks} TRACKS`,
          big: `${facts.runtimeMinutes} MIN`,
          look: "b",
        }
      : { icon: "♫", small: "SPINS AT", big: "33⅓ RPM", look: "b" },
    // Tomorrow's decade, no more than the tomorrow teaser already shows
    tomorrow
      ? { icon: "?", small: "NEXT UP", big: decade(tomorrow.year), look: "c" }
      : { icon: "?", small: "NEXT UP", big: "SOON", look: "c" },
    { icon: "✕", small: "NO SHARE", big: "BUTTONS", look: "d" },
    ...parodies,
  ];
}

/* The fake error box, Windows-98 grey, in the era's best-known deceptive
   format: every button looks like a way out. Here OK goes where it says
   (`to`), and Cancel and the close box only say "Nice try." One a day by
   date, off-step from the poster, and Halloween's own that week. */
const ERRORS = [
  (d) => ({
    title: "AOTD.EXE",
    message: `This program has performed an illegal operation: too much ${d.album.genre}.`,
  }),
  (d) => ({
    title: "Disk Full",
    message: `Your crate holds ${d.catalogSize} albums. Delete nothing.`,
  }),
  (d) => {
    const age = Number(d.dayKey.slice(0, 4)) - d.album.year;
    return {
      title: "Warning",
      message:
        age > 0
          ? `Today's album is ${age} year${age === 1 ? "" : "s"} old. Proceed with nostalgia?`
          : "Today's album came out this year. Proceed anyway?",
    };
  },
  (d) => ({
    title: "Error",
    message: `A fatal exception has occurred. Today's album is ${d.album.title}.`,
  }),
  () => ({
    title: "Low RPM",
    message: "This record needs 33⅓ RPM. Your mouse is doing 0.",
  }),
];

export function errorFor(day, section) {
  const n = dayNumber(day.dayKey);
  const at = Number.isFinite(n) ? n : 0;
  const copy = spooky(day)
    ? {
        title: "Boo.exe",
        message: `There are ghosts in your machine. They're listening to ${day.album.title}.`,
      }
    : ERRORS[mod(at + 3, ERRORS.length)](day);
  return { ...copy, to: section === "home" ? "archive" : "home" };
}

export const DISCLAIMER =
  "Parody of 1990s web ads. The badges, poster, square and error box are jokes: no company named endorses this site, nobody has won anything, and the X never closes.";

/* The 125×125 square in the badge column, one of the era's banner
   formats in turn (the owner's ask, 2026-10-27): punch the monkey, the
   millionth-visitor prize, the system-tray balloon, the fake search box,
   the fake download button, the flashing CLICK HERE and the fake security
   warning. Drawn in CSS (.rail-promo-<id>), in our own words, and each a
   notice for one of the club's tabs like the poster. One a day by date,
   never for the tab it hangs beside or the poster's tab that day, so the
   two never say the same thing. A square with a fake field or button is
   still one link, and the fake parts are drawn, not controls.

   Each returns { kicker, head, field, cta, fine }; any may be missing.
   test/margin-rails.test.mjs holds each to the lengths measured in the
   square at 1380px. */
export const PROMOS = [
  {
    id: "monkey",
    to: "cozy",
    copy: () => ({
      kicker: "Bop the record",
      head: "Win a nap!*",
      cta: "PLAY",
      fine: "*Cozy Vibes: no score",
    }),
  },
  {
    id: "winner",
    to: "stats",
    copy: () => ({
      kicker: "Congratulations!",
      head: "Listener #1,000,000",
      cta: "THE REAL STATS",
      fine: "*you are not",
    }),
  },
  {
    id: "balloon",
    to: "home",
    copy: () => ({
      kicker: "New music found",
      head: "1 album is ready to play.",
      cta: "Play it now",
      fine: "12:00 AM UTC",
    }),
  },
  {
    id: "search",
    to: "archive",
    copy: (d) => ({
      kicker: "Search the crate",
      // "Hip-Hop/Soul" types as "Hip-Hop"; a longer genre as "albums"
      field: short(d.album.genre.split("/")[0].trim(), 16, "albums"),
      cta: "GO",
      fine: "Thirty days in the Archive",
    }),
  },
  {
    id: "download",
    to: "faq",
    copy: () => ({
      kicker: "Free download",
      head: "0 KB",
      cta: "DOWNLOAD",
      fine: "Nothing to install. It's a web page.",
    }),
  },
  {
    id: "click",
    to: "soundtrack",
    copy: () => ({
      kicker: "Don't miss it",
      head: "CLICK HERE!!!",
      fine: "to cast today's cue in the Soundtrack Corner",
    }),
  },
  {
    id: "warning",
    to: "dead-air",
    copy: () => ({
      kicker: "Warning",
      head: "Your speakers are playing silence.",
      cta: "FIX IT",
      fine: "It's Dead Air, a horror escape room",
    }),
  },
];

/** The square for `day` beside `section`: the day's in turn, stepping on
    past one for this tab or for the poster's. */
export function promoFor(day, section) {
  const n = dayNumber(day.dayKey);
  const at = Number.isFinite(n) ? n : 0;
  const poster = posterFor(day, section)?.to;
  for (let k = 0; k < PROMOS.length; k++) {
    const promo = PROMOS[mod(at + k, PROMOS.length)];
    if (promo.to !== section && promo.to !== poster) {
      return { id: promo.id, to: promo.to, ...promo.copy(day) };
    }
  }
  return null;
}

/* The exhibitions the formats were studied from, credited under the
   disclaimer. Plain outbound links: the club describing where its jokes
   came from, nothing about any visitor. */
export const CREDITS = [
  {
    name: "Web Design Museum",
    href: "https://www.webdesignmuseum.org/exhibitions/web-banners-in-the-90s",
  },
  {
    name: "Luna Media",
    href: "https://lunamedia.io/news/banner-ads-at-30-a-look-back-on-three-decades-of-evolution/",
  },
  {
    name: "Vintage Computing",
    href: "https://www.vintagecomputing.com/index.php/archives/831/31-vintage-web-ad-banners",
  },
];

/** The webring's "next ►": tomorrow's genre and decade, which the tomorrow
    teaser already shows, and not a word more. */
export const ringNextTitle = ({ tomorrow }) =>
  tomorrow
    ? `Tomorrow: ${tomorrow.genre}, the ${decade(tomorrow.year)}`
    : "Unboxed at midnight";
