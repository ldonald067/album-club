import albumData from "./albums.json";

export const ALBUMS = albumData;

// Seeded PRNG (mulberry32) — deterministic across server and client
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded PRNG — same seed always gives same order
const permutationCache = new Map();

function seededPermutation(length, seed) {
  const cacheKey = `${length}:${seed}`;
  if (permutationCache.has(cacheKey)) return permutationCache.get(cacheKey);
  const rand = mulberry32(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  permutationCache.set(cacheKey, indices);
  return indices;
}

export function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

export function getTodayAlbum() {
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(ALBUMS.length, year);
  const idx = order[dayOfYear % ALBUMS.length];
  return { ...ALBUMS[idx], key: getTodayKey() };
}

export function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export function getListenUrl(album) {
  const q = encodeURIComponent(`${album.artist} ${album.title} full album`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function getDateString() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Puzzle: uses recognizable albums only, different seed so it differs from today's featured
export function getPuzzleAlbum() {
  const puzzlePool = ALBUMS.filter((a) => a.recognizable);
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(puzzlePool.length, year * 31 + 7);
  let idx = order[dayOfYear % puzzlePool.length];
  // Ensure puzzle album differs from today's featured album
  const today = getTodayAlbum();
  if (puzzlePool[idx].title === today.title) {
    idx = order[(dayOfYear + 1) % puzzlePool.length];
  }
  return puzzlePool[idx];
}

export function getPuzzleKey() {
  return `puzzle-${getTodayKey()}`;
}

export function getPuzzleClues(album) {
  return [
    { label: "Genre", value: album.genre },
    { label: "Decade", value: `${Math.floor(album.year / 10) * 10}s` },
    { label: "Words in title", value: `${album.title.split(/\s+/).length}` },
    { label: "Artist starts with", value: `"${album.artist[0]}"` },
    { label: "Release year", value: `${album.year}` },
    { label: "Artist", value: album.artist },
  ];
}

// Get album for any date (used by Archive)
export function getAlbumForDate(date) {
  const year = date.getFullYear();
  const start = new Date(year, 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  const order = seededPermutation(ALBUMS.length, year);
  const idx = order[dayOfYear % ALBUMS.length];
  return { ...ALBUMS[idx], key: date.toISOString().split("T")[0] };
}

// Game rotation — 4-day cycle: guess, cover, lyric, heardle
const GAME_TYPES = ["guess", "cover", "lyric", "heardle"];

export function getGameType(date) {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  return GAME_TYPES[dayOfYear % GAME_TYPES.length];
}

// Cover Art Challenge — uses albums with cover art, different seed
export function getCoverPuzzleAlbum() {
  const pool = ALBUMS.filter((a) => a.recognizable && a.image);
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(pool.length, year * 47 + 13);
  let idx = order[dayOfYear % pool.length];
  const today = getTodayAlbum();
  if (pool[idx].title === today.title) {
    idx = order[(dayOfYear + 1) % pool.length];
  }
  return pool[idx];
}

// Artist Scramble — recognizable albums, different seed
export function getScrambleAlbum() {
  const pool = ALBUMS.filter((a) => a.recognizable);
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(pool.length, year * 19 + 3);
  let idx = order[dayOfYear % pool.length];
  const today = getTodayAlbum();
  if (pool[idx].title === today.title) {
    idx = order[(dayOfYear + 1) % pool.length];
  }
  return pool[idx];
}

// Heardle — albums with YouTube IDs, different seed
export function getHeardleAlbum() {
  const pool = ALBUMS.filter((a) => a.recognizable && a.youtubeId);
  if (pool.length === 0) return getCoverPuzzleAlbum(); // fallback
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(pool.length, year * 61 + 17);
  let idx = order[dayOfYear % pool.length];
  const today = getTodayAlbum();
  if (pool[idx].title === today.title) {
    idx = order[(dayOfYear + 1) % pool.length];
  }
  return pool[idx];
}

// Lyric puzzle — albums with lyrics data, different seed
export function getLyricPuzzleAlbum() {
  // Will be filtered by lyrics availability in the component
  const pool = ALBUMS.filter((a) => a.recognizable);
  const year = new Date().getFullYear();
  const dayOfYear = getDayOfYear();
  const order = seededPermutation(pool.length, year * 37 + 11);
  let idx = order[dayOfYear % pool.length];
  const today = getTodayAlbum();
  if (pool[idx].title === today.title) {
    idx = order[(dayOfYear + 1) % pool.length];
  }
  return pool[idx];
}

// Scramble utility — deterministic scramble of artist name
export function scrambleArtist(artist, seed) {
  const chars = artist.split("");
  const rand = mulberry32(seed);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  // Ensure it's actually different from original
  if (chars.join("") === artist && chars.length > 1) {
    [chars[0], chars[1]] = [chars[1], chars[0]];
  }
  return chars.join("");
}

// Rotating marquee messages — one per day, some dynamic with album info
const MARQUEE_MESSAGES = [
  // Dynamic — today's album
  (a) =>
    `🎵 Today's pick: ${a.genre} from ${a.year}. What's your take? Rate it, vibe it, guess it! 🎵`,
  (a) =>
    `✨ ${a.artist} dropped this in ${a.year}. Were you there? Rate below! ✨`,
  (a) =>
    `🌙 Spinning ${a.genre.toLowerCase()} tonight. ${a.title} by ${a.artist}. How does it hit? 🌙`,
  (a) =>
    `🔮 Today's genre: ${a.genre}. Can you feel the vibe? Cast your mood below! 🔮`,
  (a) => `🌪️ Genre roulette landed on ${a.genre} today. Embrace the chaos! 🌪️`,
  (a) =>
    `🎵 Day ${new Date().getDate()} of the month. Album: ${a.title}. Your mission: listen and rate. 🎵`,
  (a) =>
    `💿 ${a.title} — ${a.genre}, ${a.year}. One album. One day. A thousand opinions. 💿`,
  (a) =>
    `🪩 ${a.artist} is on deck. ${a.genre} vibes all day. What's your rating? 🪩`,
  (a) =>
    `📼 Throwback alert: ${a.year} gave us ${a.title}. Does it still hold up? You decide. 📼`,
  (a) =>
    `🔥 Today's challenge: listen to ${a.title} front to back and rate it honestly. No skipping! 🔥`,
  (a) =>
    `🌿 ${a.genre} day. Let ${a.artist} set the mood. Rate and vibe when you're ready. 🌿`,
  (a) =>
    `⚡ Can you guess today's puzzle album? Hint: it's NOT ${a.title}. Good luck! ⚡`,
  // Music trivia & facts
  () =>
    "📼 Did you know? The average album takes 6-12 months to record. Some legends did it in days. 📼",
  () =>
    "🪩 Fun fact: The first album ever sold on CD was Billy Joel's '52nd Street' in 1982. 🪩",
  () =>
    "📼 The vinyl revival is real — over 43 million records sold last year. Long live physical media. 📼",
  () =>
    "🔮 The longest album ever recorded is over 13 hours. We promise today's pick is shorter. 🔮",
  () =>
    "💿 The Beatles recorded their debut album in a single day — 585 minutes of studio time. 💿",
  () =>
    "🎵 The term 'album' comes from the Latin 'albus' (white) — for the blank covers of 78rpm sets. 🎵",
  () =>
    "📼 The first gold record was awarded in 1958. It was Perry Como's 'Catch a Falling Star.' 📼",
  () =>
    "🪩 Fela Kuti's longest song is 45 minutes. One track, one side of a vinyl. Respect. 🪩",
  () =>
    "💿 The 8-track tape was invented in 1964. By 1982 it was dead. Pour one out. 💿",
  () =>
    "🔥 The loudest album ever measured hit 137.7 dB. Your ears are thankful for headphone limits. 🔥",
  () =>
    "📼 Bob Dylan's 'Like a Rolling Stone' was rejected by his own label before becoming a classic. 📼",
  () =>
    "🌙 Brian Eno coined 'ambient music' in 1978. He made it while bedridden listening to rain. 🌙",
  () =>
    "⚡ Kraftwerk built their own instruments. The future of electronic music started in a Dusseldorf studio. ⚡",
  () =>
    "🪩 Studio 54 opened in 1977. Disco was dead by 1981. Four years that changed nightlife forever. 🪩",
  () =>
    "💿 Miles Davis recorded 'Kind of Blue' with almost no rehearsal. Most takes were first takes. 💿",
  () =>
    "📼 Motown's studio was so small the musicians called it 'the Snakepit.' Hits came out anyway. 📼",
  // Community & participation
  () => "🎵 No accounts, no drama — just music. Rate it. Vibe it. Guess it. 🎵",
  () =>
    "💿 Welcome to the club! New album every day at midnight UTC. Don't miss it. 💿",
  () =>
    "⚡ Tip: The puzzle uses a different album than today's feature. Two chances to discover! ⚡",
  () =>
    "🔥 Over 340 albums in rotation — rock, jazz, hip-hop, electronic, folk, and everything between. 🔥",
  () =>
    "🪩 Groove check: if today's album makes you move, smash that Groovy vibe button. 🪩",
  () =>
    "🌿 You can pick up to 3 vibes per album. Choose wisely — or chaotically. Your call. 🌿",
  () =>
    "✨ Your rating is anonymous. Be honest. Be brutal. Be kind. Whatever feels right. ✨",
  () =>
    "💢 Disagree with the average rating? Good. That means the club is working. 💢",
  () =>
    "🔮 The puzzle gives you 6 guesses. Most people crack it by clue 3. Can you beat the average? 🔮",
  () =>
    "📼 Tell a friend about AOTD Club. More listeners means better vibe data. Science. 📼",
  () =>
    "🌙 Late night listening hits different. If you're here past midnight — respect. 🌙",
  // Hot takes & vibes
  () =>
    "🥀 Hot take: your 6/10 is someone else's 10/10. That's the beauty of music. 🥀",
  () =>
    "💢 Controversial opinion incoming: the best albums are the ones that divide the room. 💢",
  () =>
    "🔮 Mind-bending albums exist. If today's one of them, you know what vibe to pick. 🔮",
  () =>
    "💔 Some albums break your heart in the best way. Rate honestly — we won't judge. 💔",
  () =>
    "✨ Every album deserves at least one full listen. Even the weird ones. Especially the weird ones. ✨",
  () =>
    "🌿 Slow down. Put on headphones. Listen to the whole thing front to back. You deserve it. 🌿",
  () =>
    "🥀 Not every album is a 10. Not every album is a 1. The magic lives in the middle. 🥀",
  () =>
    "🔥 If an album makes you feel something — anything — it did its job. Rate accordingly. 🔥",
  () => "💔 The saddest albums are often the most beautiful. Lean into it. 💔",
  () =>
    "🌪️ Some albums are controlled chaos. If today's one of those, the Chaotic vibe is right there. 🌪️",
  () =>
    "⚡ An album that makes you restart it immediately? That's a 10. You know the rules. ⚡",
  () => "🪩 Remember: there are no wrong vibes. Only honest ones. 🪩",
];

export function getMarqueeMessage(album) {
  const dayOfYear = getDayOfYear();
  const idx = dayOfYear % MARQUEE_MESSAGES.length;
  return MARQUEE_MESSAGES[idx](album);
}

export const VIBES = [
  {
    emoji: "🥀",
    label: "Melancholy",
    icon: "/pixel-icons/weather-cresent-moon-stars.svg",
  },
  {
    emoji: "⚡",
    label: "Energetic",
    icon: "/pixel-icons/interface-essential-flash.svg",
  },
  {
    emoji: "📼",
    label: "Nostalgic",
    icon: "/pixel-icons/music-walkman-cassette.svg",
  },
  {
    emoji: "🌪️",
    label: "Chaotic",
    icon: "/pixel-icons/entertainment-events-hobbies-bomb.svg",
  },
  {
    emoji: "🌿",
    label: "Chill",
    icon: "/pixel-icons/ecology-growth-plant.svg",
  },
  {
    emoji: "🔥",
    label: "Intense",
    icon: "/pixel-icons/social-rewards-trends-hot-flame.svg",
  },
  {
    emoji: "🪩",
    label: "Groovy",
    icon: "/pixel-icons/music-vinyl-record.svg",
  },
  {
    emoji: "🌙",
    label: "Dreamy",
    icon: "/pixel-icons/weather-moon.svg",
  },
  {
    emoji: "💢",
    label: "Angry",
    icon: "/pixel-icons/interface-essential-skull-1.svg",
  },
  {
    emoji: "💔",
    label: "Heartbreaking",
    icon: "/pixel-icons/romance-heart-lock.svg",
  },
  {
    emoji: "🔮",
    label: "Mind-bending",
    icon: "/pixel-icons/design-magic-wand.svg",
  },
  {
    emoji: "✨",
    label: "Uplifting",
    icon: "/pixel-icons/social-rewards-rating-star-1.svg",
  },
];

// Pixel icons for carousel variety (Streamline Pixel, CC BY 4.0)
export const CAROUSEL_ICONS = [
  { src: "/pixel-icons/music-headphones-human.svg", title: "Headphones" },
  { src: "/pixel-icons/music-vinyl-record.svg", title: "Vinyl Record" },
  { src: "/pixel-icons/music-radio-stereo.svg", title: "Radio" },
  { src: "/pixel-icons/music-notes-music-1.svg", title: "Music Notes" },
  { src: "/pixel-icons/music-speaker.svg", title: "Speaker" },
  { src: "/pixel-icons/music-microphone-1.svg", title: "Microphone" },
  {
    src: "/pixel-icons/music-album-cd-disk-playlist.svg",
    title: "CD Playlist",
  },
  { src: "/pixel-icons/music-disk-cd-1.svg", title: "CD" },
  { src: "/pixel-icons/music-walkman-cassette.svg", title: "Walkman" },
  { src: "/pixel-icons/music-notes-music-2.svg", title: "Notes" },
  {
    src: "/pixel-icons/entertainment-events-hobbies-record-player.svg",
    title: "Record Player",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-game-machines-arcade-1.svg",
    title: "Arcade",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-horror-ghost.svg",
    title: "Ghost",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-popcorn.svg",
    title: "Popcorn",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-ticket.svg",
    title: "Ticket",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-glasses-3d.svg",
    title: "3D Glasses",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-board-game-dice.svg",
    title: "Dice",
  },
  { src: "/pixel-icons/food-drink-coffee-cup.svg", title: "Coffee" },
  { src: "/pixel-icons/food-drink-fruit-cherry.svg", title: "Cherry" },
  { src: "/pixel-icons/food-drink-desert-icecream.svg", title: "Ice Cream" },
  { src: "/pixel-icons/food-drink-pizza.svg", title: "Pizza" },
  { src: "/pixel-icons/pet-animals-cat.svg", title: "Cat" },
  { src: "/pixel-icons/pet-animals-frog-face.svg", title: "Frog" },
  { src: "/pixel-icons/pet-animals-rabbit-1.svg", title: "Rabbit" },
  { src: "/pixel-icons/weather-rainbow.svg", title: "Rainbow" },
  { src: "/pixel-icons/weather-meteor.svg", title: "Meteor" },
  {
    src: "/pixel-icons/design-color-painting-palette.svg",
    title: "Palette",
  },
  { src: "/pixel-icons/design-color-spray.svg", title: "Spray Paint" },
  {
    src: "/pixel-icons/interface-essential-heart-favorite.svg",
    title: "Heart",
  },
  { src: "/pixel-icons/interface-essential-trophy.svg", title: "Trophy" },
  { src: "/pixel-icons/interface-essential-crown.svg", title: "Crown" },
  {
    src: "/pixel-icons/interface-essential-pacman-loading.svg",
    title: "Pac-Man",
  },
  {
    src: "/pixel-icons/interface-essential-light-bulb.svg",
    title: "Lightbulb",
  },
  {
    src: "/pixel-icons/social-rewards-trends-hot-flame.svg",
    title: "Flame",
  },
  { src: "/pixel-icons/social-rewards-vip-crown-king.svg", title: "King" },
  { src: "/pixel-icons/social-rewards-reward-gift.svg", title: "Gift" },
  { src: "/pixel-icons/school-science-test-flask.svg", title: "Flask" },
  {
    src: "/pixel-icons/computers-devices-electronics-vintage-mac.svg",
    title: "Vintage Mac",
  },
  {
    src: "/pixel-icons/computers-devices-electronics-television-vintage.svg",
    title: "Vintage TV",
  },
  {
    src: "/pixel-icons/computers-devices-electronics-tape-cassette.svg",
    title: "Cassette Tape",
  },
  {
    src: "/pixel-icons/entertainment-events-hobbies-game-machines-arcade-2.svg",
    title: "Arcade Machine",
  },
];
