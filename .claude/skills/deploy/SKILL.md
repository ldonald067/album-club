---
name: deploy
description: Build and deploy the Album Of The Day Club site
disable-model-invocation: true
---

# Deploy

The live site (https://littlealbumclub.net) runs on Railway and **auto-deploys on every push to `master`**. "Deploying" means verifying the build, then pushing.

## Steps

1. Run `npm run build` and capture output
2. If the build fails, show the errors and stop — do NOT push
3. If the build succeeds, report the build output (page sizes, bundle info)
4. Confirm with the user, then push to `master` (or merge the PR) — Railway picks it up automatically
5. After the deploy, smoke-test https://littlealbumclub.net (page loads, today's album renders, rate/vibe respond)

## Notes

- GitHub Actions also runs `npm ci` + `npm run build` on PRs and pushes to `master`
- The SQLite database (`data/aotd.db`) is created at runtime. **It only survives deploys if a Railway volume is mounted at the service's `data/` path** — without one, every deploy wipes all community ratings/votes. Verify in the Railway dashboard before assuming persistence (as of 2026-07 the live `/api/stats` showed 0 all-time ratings, which suggests no volume is mounted)
- The `data/` directory must be writable on the deployment target
- better-sqlite3 requires a Node.js runtime (not edge)
