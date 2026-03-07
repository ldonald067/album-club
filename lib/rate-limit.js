const hits = new Map();
const dailyVotes = new Map();
const MAX_TRACKED_IPS = 2000;

/** Extract real client IP — prefer x-real-ip (set by Vercel/Netlify, not spoofable) */
export function getRealIp(hdrs) {
  const realIp = hdrs.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    return ips[0];
  }

  return "unknown";
}

export function checkRateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();

  // Hard cap: reject new IPs when map is full (DoS mitigation)
  if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) {
    return false;
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

  // Cleanup at 1k entries or ~1% of requests
  if (Math.random() < 0.01 || hits.size > 1000) {
    for (const [k, v] of hits) {
      const fresh = v.filter((t) => now - t < windowMs);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
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

  // Hard cap: reject when map is too large
  if (!dailyVotes.has(key) && dailyVotes.size >= MAX_TRACKED_IPS * 10) {
    return false;
  }

  dailyVotes.set(key, count + 1);

  // Lazy cleanup: purge yesterday's entries ~1% of requests
  if (Math.random() < 0.01) {
    for (const [k] of dailyVotes) {
      if (!k.endsWith(today)) dailyVotes.delete(k);
    }
  }

  return true;
}
