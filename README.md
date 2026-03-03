# 💿 Album Of The Day Club

A retro forum-style website where a new album is featured every day and visitors can leave reviews and ratings. Built with Next.js and SQLite.

## Setup

**Prerequisites:** You need [Node.js](https://nodejs.org/) installed (v18 or newer).

### 1. Download this project folder to your PC

### 2. Open a terminal in the project folder and install dependencies:

```bash
npm install
```

### 3. Start the development server:

```bash
npm run dev
```

### 4. Open your browser to:

```
http://localhost:3000
```

That's it! The SQLite database is created automatically on first run.

## Project Structure

```
album-club/
├── app/
│   ├── api/reviews/route.js   ← Backend API for reviews
│   ├── ForumPage.js           ← Main forum UI (client component)
│   ├── globals.css            ← All the old-school forum styling
│   ├── layout.js              ← Root HTML layout
│   └── page.js                ← Home page (server component)
├── lib/
│   ├── albums.js              ← Album list + helper functions
│   └── db.js                  ← SQLite database operations
├── data/                      ← Auto-created, holds the SQLite database
├── package.json
└── README.md
```

## How It Works

- **Album rotation:** A different album is featured each day, cycling through 30 curated classics
- **Reviews:** Visitors enter a username, rate 1-10, and write a review — stored in SQLite
- **Forum ranks:** Users earn ranks based on total post count (Lurker → Legend)
- **No auth required:** Simple username-based posting, just like old-school forums

## Customization

- **Add albums:** Edit the `ALBUMS` array in `lib/albums.js`
- **Change styling:** Edit `app/globals.css` — all the forum styling is there
- **Add features:** The API is in `app/api/reviews/route.js`

## Deploying

For a quick deploy, push to GitHub and connect to [Vercel](https://vercel.com):

> ⚠️ Note: SQLite works great for local dev and small sites. For a production
> deployment with lots of traffic, you'd want to swap to a hosted database
> like [Turso](https://turso.tech) (SQLite-compatible) or PostgreSQL.

## License

Do whatever you want with it. Have fun! 🎶
