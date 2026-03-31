# Project & Deployment

## Production

- **Live site**: https://littlealbumclub.net (Railway, auto-deploys on `git push`)
- **Analytics**: https://littlealbumclub.goatcounter.com (GoatCounter, script in `layout.js`)
- **Contact**: rainbowpudding@littlealbumclub.net (mailto link in footer)

## Repository

- **GitHub**: https://github.com/ldonald067/album-club (public)
- **Git config**: user `ldonald067`, email `ldonald067@users.noreply.github.com`

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
```

## Doc Improvement Reference

Docs follow a progressive disclosure pattern per https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/:

- **CLAUDE.md** (~45 lines) — universal context, always loaded
- **docs/\*.md** — domain-specific, loaded on-demand when relevant to the task
- Keep CLAUDE.md slim; add new knowledge to the appropriate docs/ file
