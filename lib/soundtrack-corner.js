import albumFacts from "./album-facts.json" with { type: "json" };
import { ALBUMS, getListenUrl } from "./albums.js";
import {
  DECADE_FLAVORS,
  DEFAULT_PROFILE,
  FILM_CODAS,
  GAME_CODAS,
  MEDIUM_ICONS,
  SOUNDTRACK_OVERRIDES,
  SOUNDTRACK_PROFILES,
  TV_CODAS,
} from "./soundtrack-corner-data.js";

const PROFILE_CACHE = new Map();
const GENRE_SEGMENT_CACHE = new Map();

/* Every generated corner used to open "<album> by <artist> feels built for
   scene work" and close its bridge with "stay louder than generic background
   mood" — 290 of 290, which is what a daily visitor actually meets. These
   frames are seeded per album so the sentence changes with the record.

   None of them says the album suits scene work. The vote now sits above the
   pitch cards and asks exactly that; answering it in the first line was the
   page arguing with itself. Describe the record and let the reader decide. */
/* Skipped for the 23 catalog titles that already contain a colon, which would
   otherwise read "What Operation: Doomsday trades in: streetlight detail". */
const COLON_INTRO_FRAME = (album, texture) =>
  `What ${album.title} trades in: ${texture}.`;

const INTRO_FRAMES = [
  (album, texture) => `${album.title} by ${album.artist} runs on ${texture}.`,
  (album, texture) =>
    `Put ${album.title} on and the room fills with ${texture}.`,
  (album, texture) => `${album.artist} built ${album.title} out of ${texture}.`,
  COLON_INTRO_FRAME,
  (album, texture) =>
    `${album.title} is ${album.artist} working with ${texture}.`,
];

/* Two short sentences at most. The single sentence these replaced ran 25 words
   with two profile phrases stacked into one subject — "lands best on screen
   when shine that carries real weight under the sugar and gloss, hooks, and
   feelings hiding in plain sight stay louder than generic background mood."
   Nothing here makes a texture phrase the subject of a verb: some are plural
   ("gloss, hooks, and feelings") and some are not. */
const BRIDGE_FRAMES = [
  (genre, decade, focus, texture) =>
    `On screen, ${genre} from the ${decade} lives or dies on ${focus}. Keep ${texture} in front and the scene has a point of view.`,
  (genre, decade, focus) =>
    `The trick with ${decade} ${genre} on screen: ${focus}. Lose that and it turns into background.`,
  (genre, decade, focus) =>
    `Supervisors reach for ${decade} ${genre} when a scene needs ${focus}, not volume.`,
  (genre, decade, focus) =>
    `${genre} from the ${decade} is only background music if you treat it that way. What earns its place is ${focus}.`,
  (genre, decade, focus, texture) =>
    `Cue ${decade} ${genre} for ${focus}, and let ${texture} carry the rest.`,
];

/* A generated pitch used to run location + action + coda, plus a decade note on
   one card — four clauses where the curated cards use two, and it showed:
   generated corners ran a median 332 words against curated's 250 and said less.
   Each card now gets at most one flourish, and the two carriers are different
   cards, so one pitch of the three lands bare. */
const MEDIA_ORDER = ["game", "film", "tv"];

/* Keyed off the album, never the card: each card's own seed is salted by medium
   (see getAlbumSeed(album, kind)), so deciding per card let all three elect
   themselves independently. One album, one carrier for each flourish. */
function getFlourishCarriers(album) {
  const noteIndex = getAlbumSeed(album, "scene-note") % MEDIA_ORDER.length;
  const others = MEDIA_ORDER.filter((_, index) => index !== noteIndex);

  return {
    sceneNote: MEDIA_ORDER[noteIndex],
    coda: others[getAlbumSeed(album, "coda") % others.length],
  };
}

/* Everything else in this file is inferred from two fields — genre and year.
   These are the only facts: track count, runtime, longest track, and what
   MusicBrainz calls the record (Album, Live, Compilation, DJ-mix, Soundtrack).
   Sourced by scripts/fetch-album-facts.mjs, never written by hand, and absent
   for the DJ sets and curated playlists that do not exist in MusicBrainz —
   which is why every read of them is optional.

   Type lines come first because a genre profile cannot know them: a live set
   arrives with a room and an audience, and a mix has no arc to respect. The
   generator described both as though they were studio albums with a shape. */
const FACT_TYPE_LINES = {
  Live: "Recorded live, so the room and the crowd come with it — either the point of your scene or a problem for it.",
  Compilation:
    "A compilation, so there is no arc to respect. Drop in wherever the scene needs it.",
  "DJ-mix":
    "A continuous mix: it was built to be joined in the middle, which is exactly what a scene does.",
  Soundtrack:
    "This already scored a picture once. It knows how to sit under one without competing.",
  Remix: "Remix work — someone else already took it apart, so the seams show.",
  Mixtape:
    "Mixtape logic: loose, front-loaded, and not precious about sequence.",
};

/* Ordered widest-signal-first. A 90-minute record and a 12-track one are not
   the same job on screen, and the generator had no way to know the difference. */
function getShapeLine(facts) {
  if (facts.longestMinutes >= 8) {
    return `Its longest track runs ${facts.longestMinutes} minutes — long enough to score a whole sequence rather than a moment.`;
  }
  if (facts.tracks >= 18) {
    return `${facts.tracks} tracks deep: you are cueing a moment off this, not the record.`;
  }
  if (facts.runtimeMinutes <= 32) {
    return `${facts.runtimeMinutes} minutes end to end — likely shorter than the thing you are scoring.`;
  }
  return `${facts.tracks} tracks across ${facts.runtimeMinutes} minutes, so there is room to pick.`;
}

export function getAlbumFacts(album) {
  return albumFacts[`${album.artist}::${album.title}`] || null;
}

/** One sentence of fact, or nothing. Types outrank shape: they change what the
    record *is*, where shape only changes how much of it you would use.
    Exported as a pure function of the facts so it can be tested against shapes
    the catalog does not happen to contain yet. */
export function buildFactLine(facts) {
  if (!facts) return null;

  for (const type of facts.types || []) {
    if (FACT_TYPE_LINES[type]) return FACT_TYPE_LINES[type];
  }

  return getShapeLine(facts);
}

function getFactLine(album) {
  return buildFactLine(getAlbumFacts(album));
}

/* Two records of similar shape are a better next listen than two records that
   merely share a genre tag: a 4-track, 42-minute ambient record and a 22-track
   compilation sit in the same lane and do completely different jobs. Worth 3
   against genre's 7 — a nudge between comparable candidates, never an override.
   Silent when either side has no facts, which is most of the catalog's DJ sets. */
function getShapeAffinity(baseFacts, candidate) {
  if (!baseFacts) return 0;
  const facts = getAlbumFacts(candidate);
  if (!facts) return 0;

  const longFormBoth =
    baseFacts.longestMinutes >= 8 && facts.longestMinutes >= 8;
  const runtimeClose =
    Math.abs(baseFacts.runtimeMinutes - facts.runtimeMinutes) <= 12;
  const tracksClose = Math.abs(baseFacts.tracks - facts.tracks) <= 4;

  if (longFormBoth) return 3;
  return (runtimeClose ? 2 : 0) + (tracksClose ? 1 : 0);
}

const MEDIA_CARD_CONFIG = {
  game: {
    label: "Game",
    icon: MEDIUM_ICONS.game,
    titleField: "gameTitles",
    codas: GAME_CODAS,
    buildBody(album, profile, seed) {
      return `If ${album.title} scored ${pick(profile.gameLocations, seed, 2)}, it would be the part where ${pick(profile.gameActions, seed, 3)}.`;
    },
  },
  film: {
    label: "Film",
    icon: MEDIUM_ICONS.film,
    titleField: "filmTitles",
    codas: FILM_CODAS,
    buildBody(album, profile, seed) {
      return `${album.title} works for ${pick(profile.filmShots, seed, 2)}, especially when ${pick(profile.filmTurns, seed, 3)}.`;
    },
  },
  tv: {
    label: "TV",
    icon: MEDIUM_ICONS.tv,
    titleField: "tvTitles",
    codas: TV_CODAS,
    buildBody(album, profile, seed) {
      return `Use it for ${pick(profile.tvSetups, seed, 2)}, when ${pick(profile.tvTurns, seed, 3)}.`;
    },
  },
};

const EXTRA_ANGLE_CONFIG = [
  {
    key: "boss-fight",
    label: "Boss Fight Energy",
    titles: [
      "This boss definitely has a second phase",
      "Danger with production design",
      "A fight you lose once on principle",
      "Health bar reveal music",
    ],
    buildBody(profile, _decadeFlavor, seed) {
      /* No scene-note here. One of the three pitch cards always carries it, and
         this angle repeating it put the same sentence on the page twice for 37%
         of generated albums — the other extra angles are single sentences too. */
      return `${pickCapitalized(profile.bossFightModes, seed, 2)}.`;
    },
  },
  {
    key: "needle-drop",
    label: "Needle Drop Scene",
    titles: [
      "This is where the movie gets honest",
      "The perfect cut-to-montage cue",
      "A scene nobody should talk over",
      "The walk-out song for consequences",
    ],
    buildBody(profile, _decadeFlavor, seed) {
      return `Use it for ${pick(profile.needleDropScenes, seed, 2)}.`;
    },
  },
  {
    key: "cold-open",
    label: "Prestige TV Cold Open",
    titles: [
      "Open on the city before the plot",
      "Episode starts with vibes and a problem",
      "Character first, exposition later",
      "A cold open that trusts the audience",
    ],
    buildBody(profile, _decadeFlavor, seed) {
      return `This works for ${pick(profile.tvSetups, seed, 2)}, especially when ${pick(profile.tvTurns, seed, 3)}.`;
    },
  },
  {
    key: "studio-match",
    label: "Best Used By",
    titles: null,
    buildTitle(profile, seed) {
      return pick(profile.studios, seed, 1);
    },
    buildBody(profile, _decadeFlavor, seed, title) {
      return `${title} could use this when the world design needs ${pick(profile.recommendationTraits, seed, 2)} without flattening the personality.`;
    },
  },
  {
    key: "end-credits",
    label: "End Credits Mood",
    titles: [
      "Roll credits while the feeling is still warm",
      "The credits should arrive before you recover",
      "Leave the last image hanging",
      'Perfect for the "nobody is fine yet" crawl',
    ],
    buildBody(profile, _decadeFlavor, seed) {
      return `${pickCapitalized(profile.endCreditsMoods, seed, 2)}.`;
    },
  },
];

/* An angle's label is a property of its key, not of the album, so overrides do
   not restate it — all 196 hand-written labels were byte-identical to these
   before this was derived, and a missing one rendered a blank label while
   passing validation. Built from EXTRA_ANGLE_CONFIG so the two cannot drift. */
const ANGLE_LABELS = Object.fromEntries(
  EXTRA_ANGLE_CONFIG.map((angle) => [angle.key, angle.label]),
);

export function getAngleLabel(key) {
  return ANGLE_LABELS[key] || null;
}

function withAngleLabel(angle) {
  return { ...angle, label: ANGLE_LABELS[angle.key] || angle.label };
}

function hashString(input) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getAlbumSeed(album, salt = "") {
  return hashString(
    `${album.title}|${album.artist}|${album.genre}|${album.year}|${salt}`,
  );
}

function pick(items, seed, salt = 0) {
  return items[hashString(`${seed}:${salt}`) % items.length];
}

function pickDistinct(items, seed, count, salt = 0) {
  return [...items]
    .map((item, index) => ({
      item,
      score: hashString(`${seed}:${salt}:${index}`),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((entry) => entry.item);
}

function pickCapitalized(items, seed, salt = 0) {
  const value = pick(items, seed, salt);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pickIntroFrame(album) {
  const usable = album.title.includes(":")
    ? INTRO_FRAMES.filter((frame) => frame !== COLON_INTRO_FRAME)
    : INTRO_FRAMES;

  return pick(usable, getAlbumSeed(album, "intro"), 1);
}

function getProfileForGenre(genre) {
  const cacheKey = String(genre || "");

  if (PROFILE_CACHE.has(cacheKey)) {
    return PROFILE_CACHE.get(cacheKey);
  }

  const profile =
    SOUNDTRACK_PROFILES.find((entry) => entry.match.test(cacheKey)) ||
    DEFAULT_PROFILE;

  PROFILE_CACHE.set(cacheKey, profile);
  return profile;
}

function getDecadeFlavor(year) {
  return (
    DECADE_FLAVORS.find((entry) => year <= entry.maxYear) ||
    DECADE_FLAVORS[DECADE_FLAVORS.length - 1]
  );
}

function getDecadeLabel(year) {
  return `${Math.floor(year / 10) * 10}s`;
}

function getOverrideKey(album) {
  return `${album.artist}::${album.title}`;
}

function getSoundtrackOverride(album) {
  return SOUNDTRACK_OVERRIDES[getOverrideKey(album)] || null;
}

function getGenreSegments(genre) {
  const cacheKey = String(genre || "");

  if (GENRE_SEGMENT_CACHE.has(cacheKey)) {
    return GENRE_SEGMENT_CACHE.get(cacheKey);
  }

  const segments = cacheKey
    .split(/[\/,&]+/)
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);

  GENRE_SEGMENT_CACHE.set(cacheKey, segments);
  return segments;
}

function getGenreRelationship(baseAlbum, candidate) {
  const baseSegments = getGenreSegments(baseAlbum.genre);
  const candidateSegments = getGenreSegments(candidate.genre);
  const sharedSegments = baseSegments.filter((segment) =>
    candidateSegments.includes(segment),
  );

  return {
    sharedCount: sharedSegments.length,
    sharedSegment: sharedSegments[0] || null,
    sameProfileKey:
      getProfileForGenre(baseAlbum.genre).key ===
      getProfileForGenre(candidate.genre).key,
  };
}

function areSameAlbum(left, right) {
  return left.title === right.title && left.artist === right.artist;
}

function scoreRecommendation(baseAlbum, candidate, baseFacts) {
  if (areSameAlbum(baseAlbum, candidate)) {
    return -Infinity;
  }

  const relationship = getGenreRelationship(baseAlbum, candidate);
  const yearDistance = Math.abs(baseAlbum.year - candidate.year);

  let score = relationship.sharedCount * 7;

  if (candidate.genre === baseAlbum.genre) {
    score += 3;
  }

  if (relationship.sameProfileKey) {
    score += 4;
  }

  if (yearDistance <= 3) {
    score += 4;
  } else if (yearDistance <= 8) {
    score += 3;
  } else if (yearDistance <= 15) {
    score += 2;
  } else if (yearDistance <= 25) {
    score += 1;
  }

  if (candidate.artist === baseAlbum.artist) {
    score += 1;
  }

  if (candidate.recognizable) {
    score += 1;
  }

  score += getShapeAffinity(baseFacts, candidate);

  return score;
}

/* Three phrasings per branch, selected by the recommendation's position rather
   than by a hash of the candidate. Two of an album's three picks routinely land
   on the same branch, and the trait pools hold three entries, so a seeded pick
   collided constantly: 63% of generated corners printed at least two identical
   reasons and 11% printed one sentence three times, under three different
   records, in one view. Only an index can guarantee distinctness; a better hash
   cannot. `eval-site` renders every corner and fails on a repeat. */
const RECOMMENDATION_PHRASINGS = {
  sameArtist: [
    ({ trait }) =>
      `Same artist, different angle. It keeps the ${trait} while changing the framing.`,
    ({ trait }) =>
      `The same hands pointed somewhere else — the ${trait} survives the move.`,
    ({ trait }) =>
      `Another room in the same house, and the ${trait} came with it.`,
  ],
  sharedRecent: [
    ({ segment, trait }) =>
      `Shares the ${segment} backbone and lives in similar air. Good next move if you want ${trait} without replaying the same record.`,
    ({ segment, trait }) =>
      `Same ${segment} bones, cut a few years over. Go here when you want ${trait} to keep going.`,
    ({ segment, trait }) =>
      `Close enough in time and in ${segment} to feel like a sequel nobody announced, but it brings its own ${trait}.`,
  ],
  shared: [
    ({ segment, trait }) =>
      `Shares the ${segment} pull, but bends it a little differently. Good if you want more ${trait}.`,
    ({ segment, trait }) =>
      `Same ${segment} instinct from a different era — the ${trait} arrives with a different accent.`,
    ({ segment, trait }) =>
      `The ${segment} thread runs through both, though this one ties it off somewhere else. Come for the ${trait}.`,
  ],
  sameLane: [
    ({ trait }) =>
      `Lives in the same broad lane, but with a different cut of ${trait}. Good next move when you want kinship, not a duplicate.`,
    ({ trait }) =>
      `Different neighborhood, same weather. It trades in ${trait} without borrowing the same tricks.`,
    ({ trait }) =>
      `Not a genre match on paper, but it wants the same things, starting with ${trait}.`,
  ],
  sameDecade: [
    ({ decade }) =>
      `Comes from the same ${decade} neighborhood, with a fresh angle on the same broad mood.`,
    ({ decade, trait }) =>
      `A ${decade} contemporary that solved the problem differently. The ${trait} is the common ground.`,
    ({ decade, trait }) =>
      `Same ${decade} air, different set of instincts — worth it for the ${trait} alone.`,
  ],
  adjacent: [
    ({ trait }) =>
      `Not a clone, just a good adjacent turn. It keeps the ${trait} and changes the scenery.`,
    ({ trait }) =>
      `Further afield, deliberately. The ${trait} is the thread you follow across.`,
    ({ trait }) =>
      `A jump rather than a step, but the ${trait} makes the landing make sense.`,
  ],
};

function getRecommendationBranch(baseAlbum, candidate, relationship) {
  if (candidate.artist === baseAlbum.artist) {
    return "sameArtist";
  }

  if (relationship.sharedSegment) {
    return Math.abs(baseAlbum.year - candidate.year) <= 8
      ? "sharedRecent"
      : "shared";
  }

  if (relationship.sameProfileKey) {
    return "sameLane";
  }

  if (getDecadeLabel(baseAlbum.year) === getDecadeLabel(candidate.year)) {
    return "sameDecade";
  }

  return "adjacent";
}

function buildRecommendationReason(baseAlbum, candidate, trait, index) {
  const relationship = getGenreRelationship(baseAlbum, candidate);
  const branch = getRecommendationBranch(baseAlbum, candidate, relationship);
  const variants = RECOMMENDATION_PHRASINGS[branch];

  return variants[index % variants.length]({
    trait,
    segment: relationship.sharedSegment,
    decade: getDecadeLabel(baseAlbum.year),
  });
}

function findAlbumReference(reference) {
  if (!reference?.title) {
    return null;
  }

  return (
    ALBUMS.find(
      (album) =>
        album.title === reference.title &&
        (!reference.artist || album.artist === reference.artist),
    ) || null
  );
}

function buildOverrideRecommendations(recommendations) {
  return recommendations
    .map((entry) => {
      const album = findAlbumReference(entry);

      if (!album) {
        return null;
      }

      return {
        title: album.title,
        artist: album.artist,
        year: album.year,
        cover: album.cover,
        href: getListenUrl(album),
        cta: album.youtubeId ? "Play on YouTube" : "Search YouTube",
        reason: entry.reason,
      };
    })
    .filter(Boolean);
}

function getRecommendations(album, profile) {
  const baseFacts = getAlbumFacts(album);
  const ranked = ALBUMS.map((candidate) => ({
    album: candidate,
    score: scoreRecommendation(album, candidate, baseFacts),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(album.year - a.album.year) -
          Math.abs(album.year - b.album.year) ||
        a.album.title.localeCompare(b.album.title),
    );

  const picks = [];
  const usedArtists = new Set([album.artist.toLowerCase()]);

  for (const { album: candidate } of ranked) {
    const artistKey = candidate.artist.toLowerCase();
    if (usedArtists.has(artistKey)) {
      continue;
    }
    picks.push(candidate);
    usedArtists.add(artistKey);
    if (picks.length === 3) {
      break;
    }
  }

  if (picks.length < 3) {
    for (const { album: candidate } of ranked) {
      if (picks.some((pickAlbum) => areSameAlbum(pickAlbum, candidate))) {
        continue;
      }
      picks.push(candidate);
      if (picks.length === 3) {
        break;
      }
    }
  }

  // Distinct traits per corner for the same reason the phrasings are indexed:
  // three picks drawing independently from a three-entry pool repeat.
  const traits = pickDistinct(
    profile.recommendationTraits,
    getAlbumSeed(album, "rec-traits"),
    3,
    5,
  );

  return picks.map((recommendation, index) => ({
    title: recommendation.title,
    artist: recommendation.artist,
    year: recommendation.year,
    cover: recommendation.cover,
    href: getListenUrl(recommendation),
    cta: recommendation.youtubeId ? "Play on YouTube" : "Search YouTube",
    reason: buildRecommendationReason(
      album,
      recommendation,
      traits[index % traits.length],
      index,
    ),
  }));
}

function buildMediaCard(
  kind,
  album,
  profile,
  decadeFlavor,
  carriers,
  factLine,
) {
  const config = MEDIA_CARD_CONFIG[kind];
  const seed = getAlbumSeed(album, kind);
  let flourish = "";

  if (carriers.coda === kind) {
    // A fact about this record beats a coda that fits any record in its genre.
    flourish = ` ${factLine || pick(config.codas, seed, 4)}`;
  } else if (carriers.sceneNote === kind) {
    flourish = ` ${decadeFlavor.sceneNote}`;
  }

  return {
    key: kind,
    icon: config.icon,
    label: config.label,
    title: pick(profile[config.titleField], seed, 1),
    body: `${config.buildBody(album, profile, seed)}${flourish}`,
  };
}

function buildExtraAngles(album, profile, decadeFlavor) {
  // Salt with the UTC year so an album reads fresh when the rotation
  // cycles back around (~13 months), while staying identical for every
  // visitor on a given day. Curated overrides bypass this entirely.
  const cycle = new Date().getUTCFullYear();
  const seed = getAlbumSeed(album, `angles-${cycle}`);

  return pickDistinct(EXTRA_ANGLE_CONFIG, seed, 2, 1).map((config) => {
    const angleSeed = getAlbumSeed(album, `${config.key}-${cycle}`);
    const title = config.buildTitle
      ? config.buildTitle(profile, angleSeed)
      : pick(config.titles, angleSeed, 1);

    return {
      key: config.key,
      label: config.label,
      title,
      body: config.buildBody(profile, decadeFlavor, angleSeed, title),
    };
  });
}

function applyCardOverrides(cards, overrideCards) {
  if (!overrideCards) {
    return cards;
  }

  return cards.map((card) =>
    overrideCards[card.key] ? { ...card, ...overrideCards[card.key] } : card,
  );
}

export function buildSoundtrackCorner(album) {
  const profile = getProfileForGenre(album.genre);
  const decadeFlavor = getDecadeFlavor(album.year);
  const decadeLabel = getDecadeLabel(album.year);
  const seed = getAlbumSeed(album, "listen-for");
  const override = getSoundtrackOverride(album);
  const carriers = getFlourishCarriers(album);
  const factLine = getFactLine(album);
  const generatedCards = Object.keys(MEDIA_CARD_CONFIG).map((kind) =>
    buildMediaCard(kind, album, profile, decadeFlavor, carriers, factLine),
  );
  const generatedRecommendations = getRecommendations(album, profile);
  const overrideRecommendations = override?.recommendations
    ? buildOverrideRecommendations(override.recommendations)
    : null;

  return {
    title: "Soundtrack Corner",
    kicker: `${album.title} as game / film / TV cue music`,
    intro:
      override?.intro ||
      `${pickIntroFrame(album)(album, profile.texture)} ${decadeFlavor.vibe}`,
    listenNow: {
      label: album.youtubeId ? "Spin today's album" : "Search today's album",
      href: getListenUrl(album),
    },
    cards: applyCardOverrides(generatedCards, override?.cards),
    bridgeNote:
      override?.bridgeNote ||
      pick(BRIDGE_FRAMES, getAlbumSeed(album, "bridge"), 1)(
        album.genre,
        decadeLabel,
        profile.bridgeFocus,
        profile.texture,
      ),
    extraAnglesHeading: "Two more angles",
    extraAngles: override?.extraAngles
      ? override.extraAngles.map(withAngleLabel)
      : buildExtraAngles(album, profile, decadeFlavor),
    listenForHeading: "Listen for",
    listenFor:
      override?.listenFor || pickDistinct(profile.listenFor, seed, 3, 2),
    recommendationsHeading: "Listen next",
    recommendationsIntro: "If today's album clicked, go here next.",
    recommendations:
      overrideRecommendations && overrideRecommendations.length > 0
        ? overrideRecommendations
        : generatedRecommendations,
  };
}
