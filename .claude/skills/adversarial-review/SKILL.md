---
name: adversarial-review
description: Adversarial code review using the opposite model. Spawns 1–3 reviewers on the opposing model (Claude spawns Codex) to challenge work from distinct critical lenses. Triggers "adversarial review".
---

# Adversarial Review

Spawn reviewers on the **opposite model** to challenge work. Reviewers attack from distinct
lenses grounded in project standards. The deliverable is a synthesized verdict — do NOT make
changes.

**When to use:** after sessions that produce large diffs (200+ lines), implement plan phases,
or complete a planning session.

**Hard constraint:** Reviewers MUST run via the opposite model's CLI (`codex exec`). Do NOT
use subagents, the Agent tool, or any internal delegation mechanism as reviewers — those run
on _your own_ model, which defeats the purpose.

## Step 1 — Load Principles

Upstream reads `brain/principles.md` and follows every `[[wikilink]]`. **This project has no
`brain/` directory** — that path belongs to the skill author's personal setup. Read it if it
ever exists; otherwise ground reviewer judgments in this project's own standards:

- `CLAUDE.md` — stack, structure, workflow, and the task-to-doc table
- the `docs/` file matching the change under review (`games.md`, `api.md`, `components.md`,
  `album-data.md`, `performance.md`, `gotchas.md`)
- `docs/STATUS.md` — current state, open items, and standing decisions

## Step 2 — Determine Scope and Intent

Identify what to review from context (recent diffs, referenced plans, user message).

Determine the **intent** — what the author is trying to achieve. This is critical: reviewers
challenge whether the work _achieves the intent well_, not whether the intent is correct.
State the intent explicitly before proceeding.

Assess change size:

| Size   | Threshold               | Reviewers                            |
| ------ | ----------------------- | ------------------------------------ |
| Small  | < 50 lines, 1–2 files   | 1 (Skeptic)                          |
| Medium | 50–200 lines, 3–5 files | 2 (Skeptic + Architect)              |
| Large  | 200+ lines or 5+ files  | 3 (Skeptic + Architect + Minimalist) |

Read `references/reviewer-lenses.md` for lens definitions.

## Step 3 — Detect Model and Spawn Reviewers

Create a temp directory for reviewer output:

```sh
REVIEW_DIR=$(mktemp -d /tmp/adversarial-review.XXXXXX)
```

**Build each prompt as a FILE and feed it in on stdin. Do not assemble a multi-kilobyte prompt
inline in the shell command.**

On 2026-09-03 all three reviewers, spawned with the inline `"$(cat <<EOF … EOF)"` form and
`2>/dev/null`, ran for twenty minutes and exited having written nothing. Re-running the same
lenses with prompts built as files and piped on stdin worked first time. **The precise cause was
never isolated** — a follow-up test showed the shell was _not_ mangling backticks, and a short
inline prompt succeeds — so treat this as a robustness rule rather than a fix for a known bug:
prompt files are inspectable after a failure, and an inline heredoc is not.

Build them with something that does no shell expansion (Python, or plain `cat` concatenation
into a file):

```sh
{ cat lens.txt; echo; cat CLAUDE.md; } > "$REVIEW_DIR/prompt-skeptic.txt"
```

Determine which model you are, then spawn reviewers on the opposite:

**If you are Claude** → spawn Codex reviewers via `codex exec`, reading the prompt from stdin
with `-`:

```sh
codex exec --skip-git-repo-check -s read-only \
  -o "$REVIEW_DIR/skeptic.md" - < "$REVIEW_DIR/prompt-skeptic.txt" \
  > "$REVIEW_DIR/skeptic.log" 2>&1
```

**If you are Codex** → spawn Claude reviewers via `claude` CLI:

```sh
claude -p "$(cat "$REVIEW_DIR/prompt-skeptic.txt")" \
  > "$REVIEW_DIR/skeptic.md" 2> "$REVIEW_DIR/skeptic.log"
```

**Keep stderr.** Redirect it to a `.log` beside the output, never to `/dev/null` — a reviewer
that dies needs to say why. Use `-s read-only` (or `--profile edit` only if the reviewer must
run tests). Run with `run_in_background: true`.

Name each output file after the lens: `skeptic.md`, `architect.md`, `minimalist.md`.

### Reviewer prompt template

Each reviewer gets a single prompt containing:

1. The stated intent (from Step 2)
2. Their assigned lens (full text from references/reviewer-lenses.md)
3. The standards relevant to their lens (file contents, not summaries)
4. The code or diff to review
5. Instructions: "You are an adversarial reviewer. Your job is to find real problems, not
   validate the work. Be specific — cite files, lines, and concrete failure scenarios.
   Rate each finding: high (blocks ship), medium (should fix), low (worth noting).
   Write findings as a numbered markdown list to your output file."

Spawn all reviewers in parallel.

## Step 4 — Verify and Synthesize Verdict

Before reading reviewer output, log which CLI was used and confirm the output files are present
**and non-empty** — a reviewer that fails writes a zero-byte file, and `ls` alone will not tell
you:

```sh
echo "reviewer_cli=codex|claude"
for f in skeptic architect minimalist; do
  [ -s "$REVIEW_DIR/$f.md" ] && echo "$f: ok" || echo "$f: MISSING/EMPTY — see $f.log"
done
```

If any output is missing or empty, read its `.log`, fix the cause, and re-run that reviewer.
Do not silently skip one, and do not fall back to a subagent — that would run on your own model
and defeat the entire point.

Read each reviewer's output file from `$REVIEW_DIR/`. Deduplicate overlapping findings.
Produce a single verdict:

```
## Intent
<what the author is trying to achieve>

## Verdict: PASS | CONTESTED | REJECT
<one-line summary>

## Findings
<numbered list, ordered by severity (high → medium → low)>

For each finding:
- **[severity]** Description with file:line references
- Lens: which reviewer raised it
- Principle: which principle or project standard it maps to
- Recommendation: concrete action, not vague advice

## What Went Well
<1–3 things the reviewers found no issue with — acknowledge good work>
```

**Verdict logic:**

- **PASS** — no high-severity findings
- **CONTESTED** — high-severity findings but reviewers disagree on them
- **REJECT** — high-severity findings with reviewer consensus

## Step 5 — Render Judgment

After synthesizing the reviewers, apply your own judgment. Using the stated intent and project
standards as your frame, state which findings you would accept and which you would reject —
and why. Reviewers are adversarial by design; not every finding warrants action. Call out
false positives, overreach, and findings that mistake style for substance.

Append to the verdict:

```
## Lead Judgment
<for each finding: accept or reject with a one-line rationale>
```

---

Source: [pedronauck/skills](https://github.com/pedronauck/skills) (`skills/community/adversarial-review`).
Installed 2026-07-28. Adapted only where the upstream referenced the author's private
`brain/` principle files, which are not published with the skill.
