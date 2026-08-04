const hits = new Map();
const dailyVotes = new Map();
// Each tracked IP holds a short array of timestamps, so 10k entries is a few
// MB at worst — cheap enough that the cap is a backstop, not a working limit.
const MAX_TRACKED_IPS = 10000;
const MAX_IP_LENGTH = 120;
// Fraction of the table to drop when it fills, so eviction is occasional
// rather than once per request at the ceiling.
const EVICTION_RATIO = 0.1;
// Minimum gap between spike-triggered sweeps of the hits table.
const BACKSTOP_SWEEP_MS = 5000;
let lastBackstopSweep = 0;

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

/**
 * Drop the least-recently-active IPs to make room. Used instead of giving up on
 * tracking: the old behaviour returned true — unlimited, uncounted requests —
 * for every new IP once the table filled, which turned a full table into an
 * open door precisely when the site was busiest. Evicting the coldest entries
 * keeps memory bounded while every request still lands in some bucket. An IP
 * evicted mid-window gets a fresh allowance, which is the same outcome the old
 * code gave everyone, but now it costs an attacker the whole table to buy.
 */
function evictColdestHits(count) {
  const byLastSeen = [...hits.entries()]
    .map(([key, timestamps]) => [key, timestamps[timestamps.length - 1] ?? 0])
    .sort((a, b) => a[1] - b[1]);

  for (let i = 0; i < count && i < byLastSeen.length; i++) {
    hits.delete(byLastSeen[i][0]);
  }
}

export function checkRateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();

  // Memory cap: purge what's stale, then evict the coldest entries if the
  // table is still full. Never stops tracking.
  if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) {
    purgeStaleHits(windowMs);
    if (hits.size >= MAX_TRACKED_IPS) {
      evictColdestHits(Math.ceil(MAX_TRACKED_IPS * EVICTION_RATIO));
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

  /* Backstop between the 60s interval sweeps, for traffic spikes. Throttled by
     time rather than run per request: purgeStaleHits walks the whole table, so
     the old `size > 1000` condition meant a full scan on every single request
     once the table passed a thousand entries — the hot path getting slower
     exactly as traffic grew. */
  if (
    hits.size > MAX_TRACKED_IPS / 2 &&
    now - lastBackstopSweep > BACKSTOP_SWEEP_MS
  ) {
    lastBackstopSweep = now;
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

/**
 * Per-IP, per-endpoint, per-day submission cap.
 *
 * The limit is per *address*, not per person, and a lot of real visitors share
 * one: office and campus NAT, mobile carrier CGNAT, a household behind one
 * router. At 3 the fourth person on a shared address was told they had already
 * voted today. The per-person control is the localStorage guard in the client;
 * this is only a spam backstop, so it can afford to be loose.
 */
export function checkDailyLimit(ip, endpoint, limit = 12) {
  const today = new Date().toISOString().split("T")[0];
  const key = `${ip}:${endpoint}:${today}`;
  const count = dailyVotes.get(key) || 0;
  if (count >= limit) return false;

  // Memory cap: purge stale entries; if still full, allow without tracking.
  // Unlike checkRateLimit this one keeps failing open on purpose — the keys are
  // day-scoped, so a full table means a genuinely enormous day rather than a
  // stale backlog, and refusing votes is worse than missing a few counts.
  if (!dailyVotes.has(key) && dailyVotes.size >= MAX_TRACKED_IPS * 10) {
    purgeStaleDailyVotes();
    if (dailyVotes.size >= MAX_TRACKED_IPS * 10) {
      return true;
    }
  }

  dailyVotes.set(key, count + 1);

  return true;
}
