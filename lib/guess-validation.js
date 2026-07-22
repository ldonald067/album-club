// Pure validation for the guess-stats POST body, extracted so it can be
// unit-tested without spinning up the route (next/headers, db, etc.).

export const VALID_GUESS_TYPES = [
  "puzzle",
  "cover",
  "heardle",
  "lyric",
  "scramble",
];

export const MAX_ATTEMPTS = {
  puzzle: 6,
  cover: 5,
  heardle: 6,
  lyric: 4,
  scramble: 5,
};

/**
 * Validate + normalize a guess submission.
 * @returns {{ ok: true, type: string, attempts: number, solved: boolean }
 *          | { ok: false, error: string }}
 */
export function validateGuessSubmission({ attempts, solved, type: rawType }) {
  const type =
    typeof rawType === "string" && rawType.trim()
      ? rawType.trim().toLowerCase()
      : "puzzle";

  if (!VALID_GUESS_TYPES.includes(type)) {
    return { ok: false, error: "Invalid type" };
  }

  const maxAttempts = MAX_ATTEMPTS[type];
  if (
    typeof attempts !== "number" ||
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > maxAttempts
  ) {
    return { ok: false, error: "Invalid attempts" };
  }

  if (typeof solved !== "boolean") {
    return { ok: false, error: "Invalid solved value" };
  }

  // If the puzzle was not solved, the player must have used every attempt.
  if (!solved && attempts !== maxAttempts) {
    return { ok: false, error: "Invalid attempts/solved combination" };
  }

  return { ok: true, type, attempts, solved };
}
