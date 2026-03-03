---
name: deploy
description: Build and deploy the Album Of The Day Club site
disable-model-invocation: true
---

# Deploy

Run a production build, check for errors, and prepare for deployment.

## Steps

1. Run `npm run build` and capture output
2. If the build fails, show the errors and stop
3. If the build succeeds, report the build output (page sizes, bundle info)
4. Ask the user which platform to deploy to (Vercel, Netlify, or manual)
5. For Vercel: run `npx vercel --prod` (requires Vercel CLI login)
6. For Netlify: run `npx netlify deploy --prod --dir=.next` (requires Netlify CLI login)
7. For manual: just confirm the build is ready in `.next/`

## Notes

- The SQLite database (`data/aotd.db`) is created at runtime — it does not need to be deployed
- The `data/` directory must be writable on the deployment target
- For serverless platforms, better-sqlite3 requires a Node.js runtime (not edge)
