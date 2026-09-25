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

/* IPv6 is limited per /64, not per address. A home connection or a cheap VPS
   is routinely handed a whole /64 — 2^64 addresses — so keying by the full
   address let one holder rotate sources and walk past every limit. Shown in
   the 2026-09-25 API review: after 30 calls from ::1 hit 429, ::2 in the same
   /64 was served immediately. */
test("IPv6 addresses in one /64 share a single bucket", () => {
  const a = getRealIp(headers({ "x-real-ip": "2001:db8:abcd:12::1" }));
  const b = getRealIp(
    headers({ "x-real-ip": "2001:db8:abcd:12:ffff:ee:dd:2" }),
  );
  assert.equal(a, b, "same /64, same bucket");

  for (let i = 0; i < 5; i++) checkRateLimit(a, 5);
  assert.equal(checkRateLimit(b, 5), false, "a neighbour is already limited");
});

test("different /64 prefixes stay separate", () => {
  assert.notEqual(
    getRealIp(headers({ "x-real-ip": "2001:db8:abcd:12::1" })),
    getRealIp(headers({ "x-real-ip": "2001:db8:abcd:13::1" })),
  );
});

test("IPv6 grouping is not fooled by compression or case", () => {
  // The same /64 written three ways
  const forms = [
    "2001:0db8:ABCD:0012:0000:0000:0000:0001",
    "2001:db8:abcd:12::1",
    "2001:DB8:abcd:12:0:0:0:9",
  ].map((ip) => getRealIp(headers({ "x-real-ip": ip })));
  assert.equal(new Set(forms).size, 1);
});

test("IPv4 and IPv4-mapped IPv6 are unchanged by the /64 rule", () => {
  assert.equal(getRealIp(headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(
    getRealIp(headers({ "x-real-ip": "::ffff:5.6.7.8" })),
    "5.6.7.8",
  );
});

test("malformed IPv6 is not treated as an address", () => {
  // Two "::" is invalid; so is a 5-digit group. Neither may become a bucket
  // key of its own — they fall back to the shared bucket like any junk value.
  for (const junk of ["2001::db8::1", "2001:db8:12345::1"]) {
    assert.equal(getRealIp(headers({ "x-real-ip": junk })), "unknown");
  }
});
