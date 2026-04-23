import { ALBUMS, getListenUrl } from "./albums";
import {
  DECADE_FLAVORS,
  DEFAULT_PROFILE,
  FILM_CODAS,
  GAME_CODAS,
  MEDIUM_ICONS,
  SOUNDTRACK_OVERRIDES,
  SOUNDTRACK_PROFILES,
  TV_CODAS,
} from "./soundtrack-corner-data";

const PROFILE_CACHE = new Map();
const GENRE_SEGMENT_CACHE = new Map();

const MEDIA_CARD_CONFIG = {
  game: {
    label: "Game",
    icon: MEDIUM_ICONS.game,
    titleField: "gameTitles",
    buildBody(album, profile, decadeFlavor, seed) {
      return `If ${album.title} scored ${pick(profile.gameLocations, seed, 2)}, it would be the part where ${pick(profile.gameActions, seed, 3)}. ${pick(GAME_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`;
    },
  },
  film: {
    label: "Film",
    icon: MEDIUM_ICONS.film,
    titleField: "filmTitles",
    buildBody(album, profile, decadeFlavor, seed) {
      return `${album.title} works for ${pick(profile.filmShots, seed, 2)}, especially when ${pick(profile.filmTurns, seed, 3)}. ${pick(FILM_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`;
    },
  },
  tv: {
    label: "TV",
    icon: MEDIUM_ICONS.tv,
    titleField: "tvTitles",
    buildBody(album, profile, decadeFlavor, seed) {
      return `Use it for ${pick(profile.tvSetups, seed, 2)}, when ${pick(profile.tvTurns, seed, 3)}. ${pick(TV_CODAS, seed, 4)} ${decadeFlavor.sceneNote}`;
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
    buildBody(profile, decadeFlavor, seed) {
      return `${pickCapitalized(profile.bossFightModes, seed, 2)}. ${decadeFlavor.sceneNote}`;
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
      "Perfect for the \"nobody is fine yet\" crawl",
    ],
    buildBody(profile, _decadeFlavor, seed) {
      return `${pickCapitalized(profile.endCreditsMoods, seed, 2)}.`;
    },
  },
];

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

function scoreRecommendation(baseAlbum, candidate) {
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

  return score;
}

function buildRecommendationReason(baseAlbum, candidate, profile) {
  const relationship = getGenreRelationship(baseAlbum, candidate);
  const yearDistance = Math.abs(baseAlbum.year - candidate.year);
  const decadeMatch =
    getDecadeLabel(baseAlbum.year) === getDecadeLabel(candidate.year);
  const seed = getAlbumSeed(candidate, `reason:${baseAlbum.title}`);
  const trait = pick(profile.recommendationTraits, seed, 1);

  if (candidate.artist === baseAlbum.artist) {
    return `Same artist, different angle. It keeps the ${trait} while changing the framing.`;
  }

  if (relationship.sharedSegment && yearDistance <= 8) {
    return `Shares the ${relationship.sharedSegment} backbone and lives in similar air. Good next move if you want ${trait} without replaying the same record.`;
  }

  if (relationship.sharedSegment) {
    return `Shares the ${relationship.sharedSegment} pull, but bends it a little differently. Good if you want more ${trait}.`;
  }

  if (relationship.sameProfileKey) {
    return `Lives in the same broad lane, but with a different cut of ${trait}. Good next move when you want kinship, not a duplicate.`;
  }

  if (decadeMatch) {
    return `Comes from the same ${getDecadeLabel(baseAlbum.year)} neighborhood, with a fresh angle on the same broad mood.`;
  }

  return `Not a clone, just a good adjacent turn. It keeps the ${trait} and changes the scenery.`;
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
  const ranked = ALBUMS.map((candidate) => ({
    album: candidate,
    score: scoreRecommendation(album, candidate),
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

  return picks.map((recommendation) => ({
    title: recommendation.title,
    artist: recommendation.artist,
    year: recommendation.year,
    cover: recommendation.cover,
    href: getListenUrl(recommendation),
    cta: recommendation.youtubeId ? "Play on YouTube" : "Search YouTube",
    reason: buildRecommendationReason(album, recommendation, profile),
  }));
}

function buildMediaCard(kind, album, profile, decadeFlavor) {
  const config = MEDIA_CARD_CONFIG[kind];
  const seed = getAlbumSeed(album, kind);

  return {
    key: kind,
    icon: config.icon,
    label: config.label,
    title: pick(profile[config.titleField], seed, 1),
    body: config.buildBody(album, profile, decadeFlavor, seed),
  };
}

function buildExtraAngles(album, profile, decadeFlavor) {
  const seed = getAlbumSeed(album, "angles");

  return pickDistinct(EXTRA_ANGLE_CONFIG, seed, 2, 1).map((config) => {
    const angleSeed = getAlbumSeed(album, config.key);
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
  const generatedCards = Object.keys(MEDIA_CARD_CONFIG).map((kind) =>
    buildMediaCard(kind, album, profile, decadeFlavor),
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
      `${album.title} by ${album.artist} feels built for scene work. It has ${profile.texture}. ${decadeFlavor.vibe}`,
    listenNow: {
      label: album.youtubeId ? "Spin today's album" : "Search today's album",
      href: getListenUrl(album),
    },
    cards: applyCardOverrides(generatedCards, override?.cards),
    bridgeNote:
      override?.bridgeNote ||
      `${album.genre} from the ${decadeLabel} lands best on screen when the ${profile.bridgeFocus} and ${profile.texture} stay louder than generic background mood.`,
    extraAnglesHeading: "Two more angles",
    extraAngles: override?.extraAngles || buildExtraAngles(album, profile, decadeFlavor),
    listenForHeading: "Listen for",
    listenFor: override?.listenFor || pickDistinct(profile.listenFor, seed, 3, 2),
    recommendationsHeading: "Listen next",
    recommendationsIntro: "If today's album clicked, go here next.",
    recommendations:
      overrideRecommendations && overrideRecommendations.length > 0
        ? overrideRecommendations
        : generatedRecommendations,
  };
}
