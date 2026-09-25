import crypto from "node:crypto";

/* Constant-time token compare. Both sides are hashed first so they are always
   the same length: timingSafeEqual throws on unequal buffers, and the old
   early `return false` on a length mismatch answered faster for a wrong-length
   guess, which leaks the token's length through timing. Not practical behind
   the backup route's 6-a-minute limit, but the fix is one line.

   Lives in lib/ rather than beside the route so node:test can import it — a
   route file may only export handlers and segment config. */
export function tokenMatches(provided, expected) {
  if (typeof provided !== "string" || !provided) return false;
  if (typeof expected !== "string" || !expected) return false;
  const digest = (value) => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(provided), digest(expected));
}
