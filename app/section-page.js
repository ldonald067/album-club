import ForumPage from "./ForumPage";
import { getTodayAlbum, getDateString } from "@/lib/albums";

/* One body and one metadata builder shared by all six tab routes, so a tab is
   two exported lines in app/<key>/page.js and nothing else.

   Every route renders the same ForumPage — the banner, the tab strip and the
   info bar are the same on every tab, and only the panel below them changes.
   What differs per route is the metadata: a link to /archive should say
   Archive, not repeat today's album, or every tab shares one title in a search
   result and in a chat window.

   Home and Soundtrack Corner are the two tabs that are genuinely about today's
   record, so those two carry it in the title. The rest are about the club. */

const COPY = {
  home: (album) => ({
    title: `${album.title} by ${album.artist} — Album Of The Day Club`,
    description: `Today's album is ${album.title} by ${album.artist} (${album.year}, ${album.genre}). Rate it, call the vibe, and argue about where it belongs.`,
  }),
  soundtrack: (album) => ({
    title: `Soundtrack Corner: ${album.title} — Album Of The Day Club`,
    description: `Where does ${album.title} by ${album.artist} belong tonight — a game, a film, or a TV show? Cast today's cue and see what the room picked.`,
  }),
  cozy: () => ({
    title: "Cozy Vibes — Album Of The Day Club",
    description:
      "Somewhere to sit between albums. Small, slow browser games with no score to chase and no timer breathing down your neck.",
  }),
  archive: () => ({
    title: "Archive — Album Of The Day Club",
    description:
      "The last 30 days of the club: every album that has aired, with the cue each day was voted into.",
  }),
  stats: () => ({
    title: "Club Stats — Album Of The Day Club",
    description:
      "How the room has voted so far — ratings, vibes, puzzle plays and the long game.",
  }),
  faq: () => ({
    title: "FAQ — Album Of The Day Club",
    description:
      "What this place is, where the albums come from, and why there is nothing to sign up for.",
  }),
};

/* force-dynamic lives on each page.js, not here: an export from this module is
   not a route segment config, and Next would silently ignore it. */
export function sectionMetadata(key) {
  const album = getTodayAlbum();
  const { title, description } = (COPY[key] || COPY.home)(album);

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function SectionPage({ section }) {
  return (
    <ForumPage
      album={getTodayAlbum()}
      dateString={getDateString()}
      section={section}
    />
  );
}
