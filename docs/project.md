# Project & Deployment

## Production

- **Live site**: https://littlealbumclub.net (Railway, auto-deploys on `git push`)
- **Analytics**: https://littlealbumclub.goatcounter.com (GoatCounter, script in `layout.js`)
- **Contact**: rainbowpudding@littlealbumclub.net (mailto link in footer)

## Repository

- **GitHub**: https://github.com/ldonald067/album-club (public)
- **Git config**: user `ldonald067`, email `ldonald067@users.noreply.github.com`

## Local Workspace

- **Canonical checkout**: use a normal top-level git clone as the everyday workspace. Keep it outside other project folders so Next.js sees only one lockfile.
- **Backup snapshot**: if you have an older non-git folder, treat it as a backup/reference copy, not the main workspace.
- **Rescue clone**: nested clones are okay for emergency recovery, but they are not a good long-term setup because tooling may detect multiple lockfiles and infer the wrong workspace root.

## Recommended Git Flow

1. Start from an up-to-date `master`.
2. Create a short-lived feature branch.
3. Make the change and run `npm run build`.
4. Push the branch and open a pull request.
5. Merge to `master` only after the build check passes and the live-site risk feels understood.
6. Smoke-test the deployed site after merge.

## Merge Checklist

- `npm install` has been run if dependencies changed.
- `npm run build` passes locally.
- PR description explains what changed, why, and how it was validated.
- The branch merges cleanly into `master`.
- After merge, confirm the deploy and spot-check the affected feature on the live site.

## CI Guardrails

- GitHub Actions runs `npm ci` + `npm run build` on pull requests and pushes to `master`.
- If you want stronger protection, enable a required status check on `master` in the GitHub branch protection settings.

## Skills

| Command             | Trigger | Purpose                                        |
| ------------------- | ------- | ---------------------------------------------- |
| `/add-album`        | auto    | Add album to rotation with validation          |
| `/preview-schedule` | auto    | Check upcoming album schedule                  |
| `/ux-review`        | auto    | Accessibility + mobile review after UI changes |
| `/api-harden`       | auto    | Security review after API changes              |
| `/perf-check`       | auto    | Performance review after new features          |
| `/deploy`           | manual  | Production build + deploy                      |
| `/reset-day`        | manual  | Clear today's data for testing                 |

## Scripts

```bash
npm run fetch-covers         # MusicBrainz/iTunes cover art
npm run fetch-lyrics         # Genius API lyric lines (needs GENIUS_ACCESS_TOKEN)
npm run fetch-youtube-ids    # YouTube Data API (needs YOUTUBE_API_KEY, 100/day free)
npm run eval-agent           # Crate Digger scope / moderation / quality checklist
npm run eval-site            # Whole-site quality pass: albums, games, soundtrack, UI/API guardrails
```

## Doc Improvement Reference

Docs follow a progressive disclosure pattern per https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/:

- **CLAUDE.md** (~45 lines) — universal context, always loaded
- **docs/\*.md** — domain-specific, loaded on-demand when relevant to the task
- Keep CLAUDE.md slim; add new knowledge to the appropriate docs/ file
