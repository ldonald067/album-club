/**
 * PreToolUse guard: refuse git commands that stage or commit EVERY change in
 * the working tree — `git add -A` / `--all` / `.` / `-u` / `:/`, and
 * `git commit -a` / `--all`.
 *
 * WHY (2026-09-29): several Claude sessions work in this same folder at once,
 * sharing one working tree. Broad staging sweeps another session's unfinished
 * edits into your commit, and pushing master deploys production. It had
 * already happened in miniature — a commit from a "Delete merged branches"
 * session carried a reformat of a file it never set out to touch — and the
 * same session had, hours earlier, a fake youtubeId and a scratch test hook
 * sitting uncommitted in the tree. Stage files by name instead.
 *
 * Reads the hook payload on stdin; prints a deny decision or nothing.
 * Heredoc bodies and quoted strings are ignored, so a commit message that
 * mentions `git add -A` is not itself blocked.
 */

import { readFileSync } from "node:fs";

let command = "";
try {
  command = JSON.parse(readFileSync(0, "utf8"))?.tool_input?.command ?? "";
} catch {
  process.exit(0); // not a payload we understand — never block on our own failure
}
if (!/\bgit\b/.test(command)) process.exit(0);

// Drop heredoc bodies: everything from the line after `<<WORD` to WORD.
function stripHeredocs(text) {
  const lines = text.split("\n");
  const out = [];
  let terminator = null;
  for (const line of lines) {
    if (terminator) {
      if (line.trim() === terminator) terminator = null;
      continue;
    }
    out.push(line);
    const m = line.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (m) terminator = m[2];
  }
  return out.join("\n");
}

// Shell-ish tokenizer: quotes make one token; ; && || | and newlines split
// commands.
function segments(text) {
  const result = [];
  let tokens = [];
  let cur = "";
  let quote = null;
  let hasCur = false;
  const push = () => {
    if (hasCur) tokens.push(cur);
    cur = "";
    hasCur = false;
  };
  const end = () => {
    push();
    if (tokens.length) result.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      hasCur = true;
    } else if (c === "\\" && i + 1 < text.length) {
      cur += text[++i];
      hasCur = true;
    } else if (/\s/.test(c)) {
      if (c === "\n") end();
      else push();
    } else if (c === ";" || c === "|" || c === "&") {
      end();
      while (text[i + 1] === "|" || text[i + 1] === "&") i++;
    } else if (c === "(" || c === ")") {
      end();
    } else {
      cur += c;
      hasCur = true;
    }
  }
  end();
  return result;
}

// git's own options before the subcommand, and which of them take a value
const GIT_OPTS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);
// commit options whose next token is a value, not a flag
const COMMIT_OPTS_WITH_VALUE = new Set([
  "-m",
  "--message",
  "-F",
  "--file",
  "-C",
  "--reuse-message",
  "-c",
  "--reedit-message",
  "--author",
  "--date",
  "-t",
  "--template",
  "--fixup",
  "--squash",
  "--cleanup",
  "-S",
  "--gpg-sign",
  "--trailer",
]);

function broadStaging(tokens) {
  let i = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
  if (i < 0) return null;
  i++;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    if (GIT_OPTS_WITH_VALUE.has(tokens[i])) i++;
    i++;
  }
  const sub = tokens[i];
  const args = tokens.slice(i + 1);

  if (sub === "add") {
    for (const a of args) {
      if (a === "--") continue;
      if (
        [
          "-A",
          "--all",
          "--no-ignore-removal",
          "-u",
          "--update",
          ".",
          ":/",
          ":/:",
          "*",
        ].includes(a)
      )
        return `git add ${a}`;
      // combined short flags: -Av, -uv
      if (/^-[A-Za-z]+$/.test(a) && /[Au]/.test(a.slice(1)))
        return `git add ${a}`;
    }
  }
  if (sub === "commit") {
    for (let k = 0; k < args.length; k++) {
      const a = args[k];
      if (COMMIT_OPTS_WITH_VALUE.has(a)) {
        k++;
        continue;
      }
      if (a === "--all") return "git commit --all";
      // -a alone or combined (-am): a short-flag cluster containing "a",
      // stopping at a value-taking letter (m, F, C, c, t, S)
      if (/^-[A-Za-z]+$/.test(a)) {
        for (const ch of a.slice(1)) {
          if (ch === "a") return `git commit ${a}`;
          if ("mFCctS".includes(ch)) break;
        }
      }
    }
  }
  return null;
}

for (const tokens of segments(stripHeredocs(command))) {
  const hit = broadStaging(tokens);
  if (hit) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            `Blocked \`${hit}\`: it stages every change in the working tree, and other ` +
            "Claude sessions share this folder — their unfinished edits would ride along " +
            "into a commit that deploys production on push. Stage your own files by name " +
            "(`git add path/one path/two`), and check `git status` for changes you did not " +
            "make before committing. See CLAUDE.md → Workflow.",
        },
      }),
    );
    process.exit(0);
  }
}
