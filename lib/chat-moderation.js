export const CHAT_HANDLE_MAX_CHARS = 24;
const CHAT_PROMPT_MAX_CHARS = 700;

const CHAT_ALLOWED_HANDLE_PATTERN = /^[\w .'-]+$/i;
const LEETSPEAK_MAP = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};
const CHAT_RESERVED_HANDLE_TOKENS = new Set([
  "cratedigger",
  "admin",
  "administrator",
  "mod",
  "moderator",
  "staff",
  "official",
  "system",
]);
const UNIQUE_BLOCKED_HANDLE_TOKENS = [
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "tranny",
  "heilhitler",
  "whitepower",
  "1488",
];
const BLOCKED_HANDLE_PATTERNS = [
  buildSeparatedTokenPattern("nigger"),
  buildSeparatedTokenPattern("nigga"),
  buildSeparatedTokenPattern("faggot"),
  buildSeparatedTokenPattern("fag"),
  buildSeparatedTokenPattern("retard"),
  buildSeparatedTokenPattern("tranny"),
  buildSeparatedTokenPattern("kike"),
  buildSeparatedTokenPattern("spic"),
  buildSeparatedTokenPattern("chink"),
  buildSeparatedTokenPattern("gook"),
  buildSeparatedTokenPattern("slut"),
  buildSeparatedTokenPattern("whore"),
  buildSeparatedTokenPattern("cunt"),
  buildSeparatedTokenPattern("nazi"),
  buildSeparatedTokenPattern("kkk"),
  /(?:^|[^a-z0-9])1[^a-z0-9]*4[^a-z0-9]*8[^a-z0-9]*8(?:\d+)?(?:$|[^a-z0-9])/i,
  /(?:^|[^a-z0-9])white[^a-z0-9]*power(?:\d+)?(?:$|[^a-z0-9])/i,
  /(?:^|[^a-z0-9])heil[^a-z0-9]*hitler(?:\d+)?(?:$|[^a-z0-9])/i,
];
const HATE_ANALYSIS_ALLOWLIST_PATTERNS = [
  /\bwhy is (?:racism|sexism|misogyny|homophobia|transphobia|antisemitism|bigotry|ableism)\b/i,
  /\bhow (?:do|should) i\b[\s\S]{0,80}\b(?:respond to|handle|deal with|report|call out|push back on)\b[\s\S]{0,120}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful|harassing)\b/i,
  /\b(?:analyze|explain|rewrite|moderate|report|discuss|study|summarize|contextualize)\b[\s\S]{0,140}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful|hate speech|slur)\b/i,
  /\b(?:someone|my boss|my coworker|my family|a guy|a girl|a commenter|a player|a streamer)\b[\s\S]{0,120}\b(?:said|posted|wrote|sent|called me|messaged)\b[\s\S]{0,140}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful|slur)\b/i,
  /\b(?:what does|why does|why did|how should i read|what is the context of)\b[\s\S]{0,140}\b(?:slur|lyric|line|quote|sample)\b/i,
];
const HATE_REQUEST_PATTERNS = [
  /\b(?:write|make|generate|create|give|tell|draft|send|come up with)\b[\s\S]{0,140}\b(?:racist|sexist|misogynistic|homophobic|transphobic|antisemitic|bigoted|hateful)\b[\s\S]{0,140}\b(?:joke|insult|slur|post|tweet|message|rant|meme|comment)\b/i,
  /\b(?:write|make|generate|create|give|tell|draft|send|come up with)\b[\s\S]{0,140}\b(?:joke|insult|slur|post|tweet|message|rant|meme|comment)\b[\s\S]{0,140}\b(?:about|for|targeting)\b[\s\S]{0,100}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|latina people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b/i,
  /\b(?:why are|prove that|show that|explain why)\b[\s\S]{0,100}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|latina people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b[\s\S]{0,100}\b(?:inferior|stupid|lazy|criminal|dirty|gross|subhuman|worthless|less intelligent)\b/i,
  /\b(?:slur|insult|degrade|mock|harass|bully|humiliate|attack)\b[\s\S]{0,140}\b(?:women|men|girls|boys|black people|white people|asian people|latino people|latina people|jews|muslims|immigrants|gay people|lesbians|trans people|disabled people)\b/i,
  /\b(?:i hate|i'm racist|i am racist|women are inferior|men are inferior|trans people are inferior|gay people are inferior|immigrants are inferior)\b/i,
];
const CHAT_PROMPT_BOUNDARY_REPLY =
  "I'm not helping with racist, sexist, or other hateful stuff. If you want, I can help rewrite the point without punching down, or help you respond to prejudice without repeating it.";
const OFF_TOPIC_MEDIA_PATTERNS = [
  /\b(?:movie|film|tv|show|episode|season|character|plot|actor|actress|celebrity|gossip|game|games|gaming|console|playstation|xbox|nintendo|switch|boss fight|level|overworld|mission|anime|manga|comic|marvel)\b/i,
];
const MUSIC_MEDIA_ALLOWLIST_PATTERNS = [
  /\b(?:soundtrack|score|ost|theme song|opening theme|closing theme|end credits song|music video|concert film)\b/i,
];
const CHAT_SCOPE_BOUNDARY_REPLY =
  "I stay in the music lane here. Ask me about the album, artist, production, lyrics, scene, recommendations, or soundtrack music itself and I'm in.";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSeparatedTokenPattern(token) {
  const letters = token
    .split("")
    .map((char) => escapeRegex(char))
    .join("[^a-z0-9]*");

  return new RegExp(
    `(?:^|[^a-z0-9])${letters}(?:\\d+)?(?:$|[^a-z0-9])`,
    "i",
  );
}

function mapLeetspeak(text) {
  return text.replace(/[013457@$!]/g, (char) => LEETSPEAK_MAP[char] || char);
}

function stripDiacritics(text) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeModerationText(value, maxChars = null) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return typeof maxChars === "number" ? normalized.slice(0, maxChars) : normalized;
}

function getModerationForms(value, { maxChars = null } = {}) {
  const normalized = mapLeetspeak(
    stripDiacritics(normalizeModerationText(value, maxChars)),
  )
    .toLowerCase()
    .trim();

  return {
    normalized,
    compact: normalized.replace(/[^a-z0-9]+/g, ""),
  };
}

export function normalizeChatHandle(value) {
  return normalizeModerationText(value, CHAT_HANDLE_MAX_CHARS);
}

export function moderateChatHandle(
  value,
  { defaultHandle = "Guest Listener" } = {},
) {
  const normalized = normalizeChatHandle(value);
  const { compact, normalized: moderationText } = getModerationForms(value, {
    maxChars: CHAT_HANDLE_MAX_CHARS,
  });

  if (!normalized) {
    return {
      ok: false,
      value: defaultHandle,
      reason: "Pick a handle first.",
    };
  }

  if (normalized.length < 3) {
    return {
      ok: false,
      value: normalized,
      reason: "Use at least 3 characters.",
    };
  }

  if (!CHAT_ALLOWED_HANDLE_PATTERN.test(normalized)) {
    return {
      ok: false,
      value: normalized,
      reason:
        "Use letters, numbers, spaces, periods, apostrophes, underscores, or hyphens.",
    };
  }

  if (CHAT_RESERVED_HANDLE_TOKENS.has(compact)) {
    return {
      ok: false,
      value: normalized,
      reason: "That looks like staff impersonation.",
    };
  }

  if (
    UNIQUE_BLOCKED_HANDLE_TOKENS.some((token) => compact.includes(token)) ||
    BLOCKED_HANDLE_PATTERNS.some((pattern) => pattern.test(moderationText))
  ) {
    return {
      ok: false,
      value: normalized,
      reason: "Pick a handle without slurs or hate.",
    };
  }

  return { ok: true, value: normalized, reason: "" };
}

export function moderateChatPrompt(value) {
  const normalized = normalizeModerationText(value, CHAT_PROMPT_MAX_CHARS);

  if (!normalized) {
    return {
      ok: false,
      value: "",
      reason: "Say a little more first.",
      reply: "",
    };
  }

  const moderationText = getModerationForms(normalized, {
    maxChars: CHAT_PROMPT_MAX_CHARS,
  }).normalized;

  if (
    HATE_ANALYSIS_ALLOWLIST_PATTERNS.some((pattern) =>
      pattern.test(moderationText),
    )
  ) {
    return {
      ok: true,
      value: normalized,
      reason: "",
      reply: "",
    };
  }

  if (
    HATE_REQUEST_PATTERNS.some((pattern) => pattern.test(moderationText))
  ) {
    return {
      ok: false,
      value: normalized,
      reason: "That crosses the line into hateful content.",
      reply: CHAT_PROMPT_BOUNDARY_REPLY,
    };
  }

  return {
    ok: true,
    value: normalized,
    reason: "",
    reply: "",
  };
}

export function getChatScopeBoundary(value) {
  const normalized = normalizeModerationText(value, CHAT_PROMPT_MAX_CHARS);

  if (!normalized) {
    return {
      inScope: true,
      value: "",
      reason: "",
      reply: "",
    };
  }

  if (
    !OFF_TOPIC_MEDIA_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return {
      inScope: true,
      value: normalized,
      reason: "",
      reply: "",
    };
  }

  if (
    MUSIC_MEDIA_ALLOWLIST_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return {
      inScope: true,
      value: normalized,
      reason: "",
      reply: "",
    };
  }

  return {
    inScope: false,
    value: normalized,
    reason: "Keep it on music material here.",
    reply: CHAT_SCOPE_BOUNDARY_REPLY,
  };
}
