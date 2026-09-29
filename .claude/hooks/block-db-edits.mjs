/**
 * PreToolUse guard for Edit|Write: refuse any edit inside the project's
 * data/ folder, where lib/db.js keeps the local SQLite database (aotd.db and
 * its -wal / -shm files). An edit there corrupts or silently rewrites vote
 * data; change it through the app or the API instead.
 *
 * WHY THIS REPLACED THE OLD ONE-LINER (2026-09-29): the guard in
 * .claude/settings.json had never blocked anything. It ended with `exit 1`,
 * and Claude Code blocks only on exit 2 or a JSON deny — exit 1 is a
 * non-blocking error. Proved live: a Write to data/ went straight through.
 * (It read the path from $CLAUDE_FILE_PATH, which IS set for Edit/Write hooks
 * — the prettier hook beside it works — so that part was fine.)
 *
 * The path comes from the hook payload on stdin, falling back to
 * $CLAUDE_FILE_PATH. Scoped to <project>/data/ exactly, not to any path that
 * happens to contain "/data/".
 *
 * Limit: this covers the edit tools only. A Bash command (sqlite3, rm, a
 * redirect) can still reach data/ — the permission prompt is the guard there.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8")) || {};
} catch {
  // No payload — fall through to the environment variable
}

const target =
  input.tool_input?.file_path ||
  input.tool_input?.notebook_path ||
  process.env.CLAUDE_FILE_PATH ||
  "";
if (!target) process.exit(0);

const project = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const dataDir = path.resolve(project, "data");
const resolved = path.resolve(project, target);
const inside = resolved === dataDir || resolved.startsWith(dataDir + path.sep);

if (inside) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `Blocked an edit to ${path.relative(project, resolved)}: data/ holds the ` +
          "local SQLite database (lib/db.js). Editing it directly corrupts or " +
          "rewrites vote data. Change data through the app or its API routes.",
      },
    }),
  );
}
