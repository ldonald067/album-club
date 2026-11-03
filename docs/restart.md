# Bringing the site back

The site went offline in the first days of November 2026, when the owner
ended their subscriptions. This file is what a return needs, in order. The
code, the catalog and every doc are in git and need nothing; what follows is
everything that lived **outside** git.

## Where things stood on 2026-11-03

- **littlealbumclub.net answers 404, "Application not found".** Railway
  removed the album-club deployment. The last backup that worked was taken on
  2026-10-31, and the backups on 11-01, 11-02 and 11-03 got a 404.
- **The Railway project still existed then.** Its name is
  `discerning-acceptance`. It held three services:
  - `album-club`, on littlealbumclub.net
  - `cozyfun`, on pixelfun.littlealbumclub.net
  - `dead-air`, on deadair.littlealbumclub.net
  - The volume `album-club-volume` was mounted at `/app/data` and held 88MB.
  - Do not count on any of this surviving a lapsed account.
- **Production is `origin/master` at the commit that added this file.**
  Nothing is unfinished on a branch. `deadair-content-note` was merged as
  PR #6 and can be deleted.

## The data, and where the copies are

The community data (ratings, vibes, votes) lived only in the SQLite database
on the volume. **The final copy is
`data/backups/2026-10-31/aotd-2026-10-31.db`, on the owner's Mac only**,
because `data/` is gitignored. Every row is an album or puzzle key, a score
or pick, and a timestamp. There are no IPs and no names, so a copy kept
anywhere else exposes no one. It passed `integrity_check`, and it holds:

| table              | rows |
| ------------------ | ---- |
| `ratings`          | 1    |
| `vibes`            | 1    |
| `guess_stats`      | 1    |
| `playlist_votes`   | 2    |
| `soundtrack_votes` | 3    |
| `matchup_votes`    | 0    |

The same snapshot is a GitHub Actions artifact, `aotd-db-41196789887`, which
expires on **2027-01-29**. If the Mac copy is lost after that date, so is the
data.

Starting with an empty database loses only the rows above. The app creates
`aotd.db` by itself on first start.

## Secrets that are not in the repo

- **The local `.env`** holds `GENIUS_ACCESS_TOKEN`, `LASTFM_API_KEY` and
  `YOUTUBE_API_KEY`. Only the data scripts use them; the site runs without
  any of them. `.env.example` says where each key comes from. Moving to a new
  machine means copying `.env` by hand, or making new keys.
- **The Railway service's variables** were `BACKUP_TOKEN` and
  `VOTE_RETENTION_DAYS`. `VOTE_RETENTION_DAYS` defaults to 365 when unset
  (`lib/db.js`). `RAILWAY_VOLUME_MOUNT_PATH` and `RAILWAY_PUBLIC_DOMAIN` are
  injected by Railway itself.
  - On any other host, set `DATA_DIR` to a persistent folder.
  - Set `SITE_URL` to the site's address, or the Open Graph card points at
    the wrong one.
- **The GitHub repo secrets** `BACKUP_URL` and `BACKUP_TOKEN` are still set.
  Nobody can read the token back out of GitHub or a deleted service, so on a
  return make a new long random token. Set it in both places
  (`docs/project.md` → Database Backups).

## Bringing it back, step by step

1. **Install and check locally.** You need Node 20.12 or later; CI uses
   Node 22.

   ```bash
   npm ci
   npm test
   npm run build
   npm run eval-site
   ```

   The dependency ranges are caret ranges (`next ^16.3.0`, `react ^19.0.0`).
   `npm ci` installs exactly the versions in `package-lock.json`, so it
   builds what shipped. Only run `npm install` when choosing to upgrade.

2. **Host it.** On Railway, use a service from the GitHub repo. The build
   command is `npm run build` and the start command is `npm start`
   (`next start`). Attach a volume.
   - Pushing to `master` auto-deploys again only once the service is
     connected to the repo.
   - Until then, `CLAUDE.md`'s "pushing to master deploys production" does
     not hold.
   - Check a deploy with `GET /api/health`: it should show the commit SHA and
     `volumeMounted: true`.

3. **Restore the database (optional).** Put the backup on the volume as
   `aotd.db` before the first visitor, or skip this step and start empty. On
   Railway, one route is `railway ssh` into the running service and writing
   the file into the mount path. **This step has not been tried here.**
   Afterwards, read a rating back on the site to confirm it worked.

4. **The domain.** littlealbumclub.net, and the footer's contact address on
   it, depend on its registration. The registrar is not recorded in this repo.
   If it lapses, change the live domain in `app/layout.js`, set `SITE_URL`,
   and update the address in `docs/project.md`.

5. **The tabs that frame other deploys.** The Dead Air tab frames
   `https://deadair.littlealbumclub.net/`, from the separate `dead-air` repo
   (`app/ForumPage.js`, `DEAD_AIR_URL`). The Cozy shelf's _Night Desk
   Terrarium_ frames `https://pixelfun.littlealbumclub.net/`, the `cozyfun`
   service. Each tab shows a broken frame
   until its own deploy is back. The itch.io embeds do not depend on us.

6. **Backups.** Restore the two `schedule` lines in
   `.github/workflows/backup.yml`. Set the new token, then run the workflow
   once by hand. A green run is not proof: check that it uploaded an
   artifact.

7. **Analytics.** GoatCounter (littlealbumclub.goatcounter.com) is its own
   account, and the script tag is in `app/layout.js`.

## What will have drifted, and how to find it

The site is driven by the date, so the rotation, the weekly poster costumes
and Halloween week all carry on by themselves. What does not keep is
everything that points outside:

- **Videos die.** Run `npm run audit-youtube-ids`. It is read-only, takes
  about 4 minutes, and exits 1 on a dead, clipped or wrong-album id.
- **Covers break.** Run `npm run audit-covers` (about 1 minute).
- **The full-album refetch is unfinished.** On 2026-10-30, `--plan` showed
  57 albums left to search and 130 picks kept. The picks are older now, so
  read them again before applying. The routine and the apply steps are in
  `docs/STATUS.md`, under "One thing is in flight" and open item 3.
- **The pinned schedule** covers days through 2026-10-31. Days after that are
  worked out from the catalog, the same as before. Run `npm run pin-schedule`
  with the first catalog edit, as always.

## Working on it with Claude again

`CLAUDE.md`, `.claude/settings.json`, the hooks and the skills in
`.claude/skills/` are all in git. The per-machine memory under `~/.claude/`
is not, but everything it held that matters is in `docs/STATUS.md`. A new
session should read this file, then `docs/STATUS.md`.
