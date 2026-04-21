export const CHAT_HANDLE_MAX_CHARS = 24;

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

function getModerationForms(value) {
  const normalized = mapLeetspeak(stripDiacritics(normalizeChatHandle(value)))
    .toLowerCase()
    .trim();

  return {
    normalized,
    compact: normalized.replace(/[^a-z0-9]+/g, ""),
  };
}

export function normalizeChatHandle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_HANDLE_MAX_CHARS);
}

export function moderateChatHandle(
  value,
  { defaultHandle = "Guest Listener" } = {},
) {
  const normalized = normalizeChatHandle(value);
  const { compact, normalized: moderationText } = getModerationForms(value);

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
