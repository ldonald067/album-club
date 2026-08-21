# Project & Deployment

## Production

- **Live site**: https://littlealbumclub.net (Railway, auto-deploys on `git push`)
- **Analytics**: https://littlealbumclub.goatcounter.com (GoatCounter, script in `layout.js`)
- **Contact**: rainbowpudding@littlealbumclub.net (mailto link in footer)

## Discoverability and Share Surface

Added 2026-08-21, after measuring: the site had **one rating, one puzzle play
and zero vibes** on record, and Railway's request volume matched. Every
community feature holds back below two participants — correctly — so at that
traffic they render nothing. The bottleneck was never another feature.

What existed before: a static `<title>`, a static description, and nothing
else. No Open Graph tags, no Twitter card, no image, no favicon, no sitemap. A
link pasted into a chat window rendered as a bare URL, and a daily site's
metadata never mentioned the day.

- `app/page.js` → `generateMetadata()` builds title, description and card from
  `getTodayAlbum()`. Already `force-dynamic`, so it cannot be cached past UTC
  midnight.
- `app/opengraph-image.js` → a 1200×630 card drawn from the album's own accent
  colour and cover emoji. **Deliberately not the album artwork**: that is a
  remote Last.fm or iTunes URL, and a card that depends on a third-party fetch
  fails inside someone else's chat client, where nobody will ever see it fail.
  Verified by rendering it, including the catalog's longest title — three lines,
  no clipping.
- `app/layout.js` → `metadataBase`, without which `og:image` resolves
  relatively and no crawler can fetch it. Reads `SITE_URL`, then Railway's
  `RAILWAY_PUBLIC_DOMAIN`, then the live domain.
- `app/robots.js`, `app/sitemap.js`, `app/icon.svg` → there was no robots.txt
  at all, which already meant "index everything", so the rules change nothing;
  the sitemap pointer is the part that earns its keep. `/api/` is disallowed
  because those routes are no-store JSON with nothing to index.

`eval-site` fails if the metadata drifts back to static or the card loses its
image. **Not done:** submitting the sitemap to Search Console, or anywhere to
share the link — those need a human with the accounts.

## Database Backups

The community aggregate (all ratings/vibes/votes) lives only on the Railway
volume at `data/aotd.db`, which is gitignored. Back it up off-volume.

**Mechanism (shipped):** `GET /api/backup` streams a consistent SQLite
snapshot (better-sqlite3 online backup). It is **inert (404) until you set
`BACKUP_TOKEN`** in the Railway service. Auth via `Authorization: Bearer
<token>` or `?token=<token>`; wrong/absent token returns 404. Rate-limited.

**To turn it on:**

1. Railway service → Variables → add `BACKUP_TOKEN` = a long random string.
2. GitHub repo → Settings → Secrets → Actions → add `BACKUP_TOKEN` (same value)
   and `BACKUP_URL` = `https://littlealbumclub.net/api/backup`.
3. That's it. `.github/workflows/backup.yml` runs daily at 06:00 UTC (and on
   manual dispatch), pulls the snapshot, and keeps it as a GitHub artifact for
   90 days. It skips cleanly until both secrets exist.

Manual pull anytime:

```bash
curl -H "Authorization: Bearer $BACKUP_TOKEN" \
  https://littlealbumclub.net/api/backup -o aotd-$(date +%F).db
```

**Upgrade path (continuous, point-in-time):** for zero-loss replication rather
than daily snapshots, add [Litestream](https://litestream.io) streaming the WAL
to S3-compatible storage (Cloudflare R2 / Backblaze B2 / S3). That needs a
storage bucket + credentials and a container change (run `litestream replicate
-exec "npm start"`), so it's a deliberate deploy-pipeline step, not wired yet.

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
npm run fetch-albums         # Grow the album list from Last.fm (needs LASTFM_API_KEY)
npm run fetch-covers         # MusicBrainz/iTunes cover art
npm run fetch-lyrics         # Genius API lyric lines (needs GENIUS_ACCESS_TOKEN)
npm run fetch-youtube-ids    # YouTube Data API (needs YOUTUBE_API_KEY, 100/day free)
npm run soundtrack-corner-report  # Corner coverage + air-date queue + generator-floor gaps
npm run eval-site            # Whole-site quality pass: albums, games, soundtrack, UI/API guardrails
```

The three key-bearing fetchers read `.env` from the repo root via
`--env-file-if-exists`, so keys go in once instead of on every invocation.
Copy `.env.example` to `.env` and fill it in; `.env` is gitignored and must
stay that way. A missing or empty `.env` is not an error — the flag no-ops and
each script degrades the way it always has.

## Doc Improvement Reference

Docs follow a progressive disclosure pattern per https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/:

- **CLAUDE.md** — universal context, always loaded, so it pays a cost on every
  task and should stay the shortest file here
- **docs/\*.md** — domain-specific, loaded on-demand when relevant to the task
- Keep CLAUDE.md slim; add new knowledge to the appropriate docs/ file
