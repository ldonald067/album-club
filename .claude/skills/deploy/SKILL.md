---
name: deploy
description: Build and deploy the Album Of The Day Club site
disable-model-invocation: true
---

# Deploy

The live site (https://littlealbumclub.net) runs on Railway and **auto-deploys on every push to `master`**. "Deploying" means verifying the build, then pushing.

## Steps

1. Run the full gate — `npm test && npm run build`, plus `npm run eval-site` for
   anything touching album or lyric data. `CLAUDE.md` requires all three; the
   build alone has passed changes that threw at runtime
2. If any of them fails, show the errors and stop — do NOT push
3. If they pass, report the build output (route table, page sizes)
4. Confirm with the user, then push to `master` (or merge the PR) — Railway picks it up automatically
5. **Verify the deploy by SHA, not by eye.** `GET /api/health` returns the
   running commit; poll it until it matches what you just pushed. It has taken
   ~120s on recent deploys:

   ```sh
   curl -s https://littlealbumclub.net/api/health
   # {"commit":"857766c","volumeMounted":true,"uptimeSeconds":138}
   ```

6. Then smoke-test https://littlealbumclub.net — the page loads, today's album
   renders, rate/vibe respond. There are six routes now (`/`, `/soundtrack`,
   `/cozy`, `/archive`, `/stats`, `/faq`); check the one you changed

## Notes

- Two GitHub Actions workflows: `build.yml` runs `npm ci` + `npm test` + `npm run build` on PRs and pushes to `master`; `backup.yml` pulls a database snapshot from `/api/backup` daily at 06:00 UTC and uploads it as an artifact
- The SQLite database (`data/aotd.db`) is created at runtime and **only survives deploys because a Railway volume is mounted at the service's `data/` path**. That was fixed on 2026-07-11 and `/api/health` reports `volumeMounted` on every request — if it ever reads `false`, stop and fix that before pushing anything, because the next deploy wipes every community rating and vote
- The `data/` directory must be writable on the deployment target
- better-sqlite3 requires a Node.js runtime (not edge)
