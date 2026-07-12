const hits = new Map();
const dailyVotes = new Map();
const MAX_TRACKED_IPS = 2000;
const MAX_IP_LENGTH = 120;

function purgeStaleHits(windowMs = 60000) {
  const now = Date.now();
  for (const [k, v] of hits) {
    const fresh = v.filter((t) => now - t < windowMs);
    if (fresh.length === 0) hits.delete(k);
    else hits.set(k, fresh);
  }
}

function purgeStaleDailyVotes() {
  const today = new Date().toISOString().split("T")[0];
  for (const [k] of dailyVotes) {
    if (!k.endsWith(today)) dailyVotes.delete(k);
  }
}

/* ─── Deterministic cleanup every 60s (avoids unbounded map growth) ─── */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    purgeStaleHits();
    purgeStaleDailyVotes();
  }, 60000);
  // Don't keep the process alive just for cleanup
  timer.unref?.();
}

/** Extract real client IP — x-real-ip is proxy-controlled on Railway (clients can't set it) */
function normalizeIp(rawValue) {
  if (typeof rawValue !== "string") return null;

  const trimmed = rawValue.trim().slice(0, MAX_IP_LENGTH);
  if (!trimmed) return null;

  const withoutIpv4Prefix = trimmed.replace(/^::ffff:/i, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(withoutIpv4Prefix)) {
    return withoutIpv4Prefix;
  }

  if (/^[a-f0-9:]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function getRealIp(hdrs) {
  const realIp = normalizeIp(hdrs.get("x-real-ip"));
  if (realIp) return realIp;

  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded
      .split(",")
      .map((value) => normalizeIp(value))
      .filter(Boolean);
    if (ips.length > 0) {
      // Rightmost entry is the one appended by Railway's edge proxy —
      // leftmost entries are client-supplied and spoofable
      return ips[ips.length - 1];
    }
  }

  // Shared bucket for headerless requests — prevents rate limit bypass
  return "unknown";
}

export function checkRateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();

  // Memory cap: purge stale entries; if the map is still full, allow the
  // request without tracking it. Failing closed here would let an attacker
  // flood the map with fake IPs and lock out every new real visitor.
  if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) {
    purgeStaleHits(windowMs);
    if (hits.size >= MAX_TRACKED_IPS) {
      return true;
    }
  }

  if (!hits.has(ip)) {
    hits.set(ip, []);
  }

  const timestamps = hits.get(ip).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  hits.set(ip, timestamps);

  // Backstop between interval sweeps if traffic spikes
  if (hits.size > 1000) {
    purgeStaleHits(windowMs);
  }

  return true;
}

/** Validate a YYYY-MM-DD key is a real date and not in the future */
export function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

/** Per-IP, per-endpoint, per-day submission cap */
export function checkDailyLimit(ip, endpoint, limit = 3) {
  const today = new Date().toISOString().split("T")[0];
  const key = `${ip}:${endpoint}:${today}`;
  const count = dailyVotes.get(key) || 0;
  if (count >= limit) return false;

  // Memory cap: purge stale entries; if still full, allow without tracking
  // (failing closed would block all new visitors from voting for the day)
  if (!dailyVotes.has(key) && dailyVotes.size >= MAX_TRACKED_IPS * 10) {
    purgeStaleDailyVotes();
    if (dailyVotes.size >= MAX_TRACKED_IPS * 10) {
      return true;
    }
  }

  dailyVotes.set(key, count + 1);

  return true;
}
