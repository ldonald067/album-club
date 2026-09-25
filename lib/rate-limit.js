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

/** The client's rate-limit bucket: an IPv4 address, or an IPv6 /64 network
    (see ipv6Prefix64). x-real-ip is proxy-controlled on Railway, so clients
    can't set it. Only ever used as a limiter key — never logged or stored. */
function normalizeIp(rawValue) {
  if (typeof rawValue !== "string") return null;

  const trimmed = rawValue.trim().slice(0, MAX_IP_LENGTH);
  if (!trimmed) return null;

  const withoutIpv4Prefix = trimmed.replace(/^::ffff:/i, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(withoutIpv4Prefix)) {
    return withoutIpv4Prefix;
  }

  if (/^[a-f0-9:]+$/i.test(trimmed)) {
    return ipv6Prefix64(trimmed);
  }

  return null;
}

/* IPv6 is keyed by its /64 network, not the full address.

   A home connection or a cheap VPS is routinely assigned a whole /64 — 2^64
   addresses the holder can source from at will — so a limit keyed on the full
   address was no limit: the 2026-09-25 API review sent 30 calls from ::1 until
   it hit 429, then got a 200 from ::2 on the next line. With the room this
   site has, that is enough to author a day's entire result.

   The address is expanded first, because `::` compression and leading zeros
   mean one /64 has many spellings. Anything that does not expand to eight
   valid groups returns null, which drops it into the shared bucket rather than
   minting a bucket key of its own from a malformed value. */
function ipv6Prefix64(addr) {
  const halves = addr.toLowerCase().split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const compressed = halves.length === 2;
  const missing = 8 - head.length - tail.length;
  if (compressed ? missing < 1 : missing !== 0) return null;

  const groups = [
    ...head,
    ...Array(compressed ? missing : 0).fill("0"),
    ...tail,
  ];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;

  const network = groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":");
  return `${network}::/64`;
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
