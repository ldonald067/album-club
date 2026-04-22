import { ALBUMS } from "./albums";

const SOUNDTRACK_PROFILES = [
  {
    match:
      /\b(?:hip-hop|hip hop|rap|trip-hop|trip hop|grime|drill)\b/i,
    gameSceneTitle: "Neon side-quest walk",
    gameScene:
      "It plays like the stretch between missions when the city is still humming, the objective marker is blinking, and you're deciding whether to go home or make one more terrible decision.",
    filmSceneTitle: "After-hours city montage",
    filmScene:
      "This is perfect for windshield reflections, convenience-store light, and the kind of scene where the lead is pretending they are fine and absolutely is not.",
    tvSceneTitle: "Prestige pilot needle drop",
    tvScene:
      "It fits the episode-one moment where the show quietly tells you the world is stylish, funny, and a little dangerous before the real mess starts.",
    listenFor: [
      "drums that land like footsteps",
      "space in the arrangement that lets attitude do the work",
      "small production details that feel great under streetlights",
    ],
  },
  {
    match:
      /\b(?:shoegaze|dream pop|dream-pop|ambient|post-rock|post rock|slowcore)\b/i,
    gameSceneTitle: "Safe-room stargazing",
    gameScene:
      "It feels like the quiet checkpoint after a hard boss fight, when the map finally opens up and the game lets you breathe for a minute without saying a word.",
    filmSceneTitle: "Wide-shot ache",
    filmScene:
      "This is the kind of soundtrack cue that makes a lonely road, a motel sign, or a window at 2 a.m. suddenly feel emotionally expensive.",
    tvSceneTitle: "Prestige-drama dissolve",
    tvScene:
      "It belongs under the scene transition where nobody explains what they feel, but the camera and the music very much know.",
    listenFor: [
      "texture before melody",
      "how the mix blurs edges without going soft",
      "the emotional shift when the guitars start to glow instead of hit",
    ],
  },
  {
    match:
      /\b(?:punk|post-punk|post punk|new wave|garage rock|garage|indie rock|alt rock|alternative)\b/i,
    gameSceneTitle: "Arcade-racer menu screen",
    gameScene:
      "You can almost see the character select screen, the overconfident loading text, and a city course that wants you to drive like you have no respect for public property.",
    filmSceneTitle: "Messy-night-out montage",
    filmScene:
      "This works for the scene where the plan goes sideways, the eyeliner gets worse, and somehow everybody still thinks it was a great idea.",
    tvSceneTitle: "Season opener reset",
    tvScene:
      "It has that 'new semester, same emotional problems' TV energy where the show comes back a little louder and a little meaner.",
    listenFor: [
      "rhythm section snap over polish",
      "hooks that feel thrown rather than placed",
      "where the messiness is doing the charm work",
    ],
  },
  {
    match:
      /\b(?:jazz|soul|funk|r&b|rnb|disco|motown)\b/i,
    gameSceneTitle: "Cool-headed detective hub",
    gameScene:
      "It sounds like the score for walking through a well-dressed hub area where every NPC knows more than they are saying and at least one bartender is plot relevant.",
    filmSceneTitle: "Velvet-camera glide",
    filmScene:
      "This is built for the scene where the camera finally relaxes and just lets charisma, clothes, and room tone do their thing.",
    tvSceneTitle: "Late-night bottle episode",
    tvScene:
      "It fits the episode where everybody ends up in the same room, old chemistry wakes up, and the dialogue suddenly gets very good.",
    listenFor: [
      "groove as the thing carrying the scene",
      "little harmonic turns that feel expensive",
      "how warmth in the pocket does more than loudness ever could",
    ],
  },
  {
    match:
      /\b(?:metal|industrial|hardcore|noise rock|noise|grunge)\b/i,
    gameSceneTitle: "Boss-intro steam room",
    gameScene:
      "This is what you cue when the doors lock, the warning text flashes, and the game wants you just tense enough to enjoy getting wrecked the first time.",
    filmSceneTitle: "Machine-room panic",
    filmScene:
      "It belongs under sparks, alarms, bad odds, and a protagonist who has finally stopped trying to be reasonable about any of it.",
    tvSceneTitle: "Season-finale escalation",
    tvScene:
      "Perfect for the episode where the show cashes in a season's worth of dread and decides subtlety has had a good run.",
    listenFor: [
      "impact over prettiness",
      "texture that feels physical, not decorative",
      "the moment repetition turns from hypnotic to menacing",
    ],
  },
  {
    match:
      /\b(?:folk|country|americana|singer-songwriter|singer songwriter|bluegrass)\b/i,
    gameSceneTitle: "Road-map interlude",
    gameScene:
      "It fits the long drive between towns when the side quests quiet down and the game gives the landscape a turn to talk back.",
    filmSceneTitle: "Dusty daylight montage",
    filmScene:
      "This is strong coffee, back roads, old hurt, and the kind of daylight scene that feels honest enough to sting a little.",
    tvSceneTitle: "Small-town character beat",
    tvScene:
      "It works under the scene where somebody says almost nothing, fixes something with their hands, and tells you their whole deal anyway.",
    listenFor: [
      "narrative detail hiding in the phrasing",
      "how room sound and string noise make the world feel inhabited",
      "melodies that land like memory instead of spectacle",
    ],
  },
  {
    match:
      /\b(?:electronic|electronica|house|techno|idm|synthpop|synth-pop|dance)\b/i,
    gameSceneTitle: "Night-drive checkpoint",
    gameScene:
      "This is for the stretch where the skyline turns electric, the UI goes minimal, and the game remembers speed can feel elegant as well as loud.",
    filmSceneTitle: "Club-to-dawn transition",
    filmScene:
      "It fits the montage where a glamorous night starts sliding into a slightly haunted morning and the movie gets more interesting because of it.",
    tvSceneTitle: "Future-city cold open",
    tvScene:
      "You can drop this into the first two minutes of a sci-fi episode and instantly make the world feel larger, cleaner, and a little morally suspicious.",
    listenFor: [
      "which sounds are there to move you and which are there to tint the air",
      "how repetition builds setting rather than just momentum",
      "the point where sleekness starts feeling emotional",
    ],
  },
];

const DEFAULT_PROFILE = {
  gameSceneTitle: "Exploration-mode cue",
  gameScene:
    "It feels like the stretch where the game stops explaining itself and just lets you roam, notice details, and decide what kind of mood you are in.",
  filmSceneTitle: "Character-study montage",
  filmScene:
    "This belongs under the scene where the movie trusts texture and mood enough to carry the feeling without over-writing it.",
  tvSceneTitle: "Pilot-worldbuilding cue",
  tvScene:
    "It works when a show wants to sketch the tone of a world quickly: who gets to be cool, who feels out of place, and what kind of emotions count here.",
  listenFor: [
    "the texture setting the mood before the melody does",
    "how the arrangement tells you where the energy is supposed to sit",
    "what makes this feel cinematic instead of just well-made",
  ],
};

const DECADE_FLAVORS = [
  {
    maxYear: 1979,
    label: "pre-digital grain",
    vibe: "That pre-digital grain gives it a lived-in, tactile feel.",
  },
  {
    maxYear: 1989,
    label: "eighties gloss",
    vibe: "The era gloss keeps it dramatic without sanding off the personality.",
  },
  {
    maxYear: 1999,
    label: "nineties texture",
    vibe: "The nineties texture helps it feel direct, roomy, and a little bruised in a good way.",
  },
  {
    maxYear: 2009,
    label: "millennial polish",
    vibe: "The millennial-era sheen makes it feel precise enough for montage work without turning sterile.",
  },
  {
    maxYear: Infinity,
    label: "modern detail",
    vibe: "The modern detail lets tiny production choices read like camera moves.",
  },
];

const MEDIUM_ICONS = {
  game: "🎮",
  film: "🎬",
  tv: "📺",
};

function getProfileForGenre(genre) {
  return (
    SOUNDTRACK_PROFILES.find((profile) => profile.match.test(genre)) ||
    DEFAULT_PROFILE
  );
}

function getDecadeFlavor(year) {
  return (
    DECADE_FLAVORS.find((entry) => year <= entry.maxYear) ||
    DECADE_FLAVORS[DECADE_FLAVORS.length - 1]
  );
}

function tokenizeGenre(genre) {
  return String(genre || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function scoreRecommendation(baseAlbum, candidate) {
  if (
    candidate.title === baseAlbum.title &&
    candidate.artist === baseAlbum.artist
  ) {
    return -Infinity;
  }

  const baseTokens = tokenizeGenre(baseAlbum.genre);
  const candidateTokens = tokenizeGenre(candidate.genre);
  const sharedGenres = baseTokens.filter((token) =>
    candidateTokens.includes(token),
  ).length;
  const yearDistance = Math.abs(baseAlbum.year - candidate.year);

  let score = sharedGenres * 5;

  if (candidate.artist === baseAlbum.artist) {
    score += 2;
  }

  if (yearDistance <= 3) {
    score += 3;
  } else if (yearDistance <= 10) {
    score += 2;
  } else if (yearDistance <= 20) {
    score += 1;
  }

  if (
    String(candidate.genre || "")
      .toLowerCase()
      .includes(String(baseAlbum.genre || "").toLowerCase())
  ) {
    score += 2;
  }

  return score;
}

function getRecommendations(album) {
  return ALBUMS.map((candidate) => ({
    album: candidate,
    score: scoreRecommendation(album, candidate),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(album.year - a.album.year) - Math.abs(album.year - b.album.year) ||
        a.album.title.localeCompare(b.album.title),
    )
    .slice(0, 3)
    .map(({ album: recommendation }) => ({
      title: recommendation.title,
      artist: recommendation.artist,
      year: recommendation.year,
      cover: recommendation.cover,
    }));
}

export function buildSoundtrackCorner(album) {
  const profile = getProfileForGenre(album.genre);
  const decadeFlavor = getDecadeFlavor(album.year);
  const decadeLabel = `${Math.floor(album.year / 10) * 10}s`;

  return {
    title: "Soundtrack Corner",
    kicker: `${album.title} as game / film / TV cue music`,
    intro: `${album.title} by ${album.artist} feels built for scene work. ${decadeFlavor.vibe}`,
    cards: [
      {
        key: "game",
        icon: MEDIUM_ICONS.game,
        label: "Game",
        title: profile.gameSceneTitle,
        body: profile.gameScene,
      },
      {
        key: "film",
        icon: MEDIUM_ICONS.film,
        label: "Film",
        title: profile.filmSceneTitle,
        body: profile.filmScene,
      },
      {
        key: "tv",
        icon: MEDIUM_ICONS.tv,
        label: "TV",
        title: profile.tvSceneTitle,
        body: profile.tvScene,
      },
    ],
    listenForHeading: "Listen for",
    listenFor: profile.listenFor,
    bridgeNote: `${album.genre} from the ${decadeLabel} usually reads best on screen when the texture stays front and center instead of getting treated like generic background mood.`,
    recommendationsHeading: "Queue next",
    recommendations: getRecommendations(album),
  };
}
