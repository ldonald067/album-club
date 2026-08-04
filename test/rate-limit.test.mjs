import test from "node:test";
import assert from "node:assert/strict";

import {
  checkRateLimit,
  checkDailyLimit,
  getRealIp,
} from "../lib/rate-limit.js";

/** Minimal stand-in for the Headers object route handlers pass in. */
function headers(map) {
  return { get: (name) => map[name] ?? null };
}

test("a single IP is cut off at the limit", () => {
  const ip = "203.0.113.10";
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit(ip, 5), true, `request ${i + 1} should pass`);
  }
  assert.equal(checkRateLimit(ip, 5), false, "6th request should be blocked");
});

test("a full table still rate-limits new IPs", () => {
  // Fill well past MAX_TRACKED_IPS (10000) with distinct addresses.
  for (let i = 0; i < 11000; i++) {
    checkRateLimit(`10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`);
  }

  // The old code returned true unconditionally once the table was full, so a
  // new arrival got unlimited uncounted requests. It must still be counted.
  const fresh = "198.51.100.77";
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit(fresh, 5), true);
  }
  assert.equal(
    checkRateLimit(fresh, 5),
    false,
    "new IP must still be limited when the table is full",
  );
});

test("daily limit allows a shared address more than a few submissions", () => {
  const ip = "192.0.2.50";
  // A household or office behind one NAT address: several distinct people.
  for (let i = 0; i < 12; i++) {
    assert.equal(checkDailyLimit(ip, "test-endpoint"), true, `vote ${i + 1}`);
  }
  assert.equal(
    checkDailyLimit(ip, "test-endpoint"),
    false,
    "13th submission exceeds the daily cap",
  );
});

test("daily limits are scoped per endpoint", () => {
  const ip = "192.0.2.51";
  for (let i = 0; i < 12; i++) checkDailyLimit(ip, "endpoint-a");
  assert.equal(checkDailyLimit(ip, "endpoint-a"), false);
  assert.equal(
    checkDailyLimit(ip, "endpoint-b"),
    true,
    "a different endpoint has its own allowance",
  );
});

test("getRealIp trusts the rightmost forwarded entry", () => {
  // Leftmost entries are client-supplied and spoofable; Railway's edge appends
  // the real one on the right.
  assert.equal(
    getRealIp(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })),
    "3.3.3.3",
  );
});

test("getRealIp prefers x-real-ip and falls back to a shared bucket", () => {
  assert.equal(
    getRealIp(
      headers({ "x-real-ip": "4.4.4.4", "x-forwarded-for": "9.9.9.9" }),
    ),
    "4.4.4.4",
  );
  assert.equal(getRealIp(headers({})), "unknown");
  assert.equal(
    getRealIp(headers({ "x-forwarded-for": "not-an-ip" })),
    "unknown",
    "garbage must not become its own bucket",
  );
});
