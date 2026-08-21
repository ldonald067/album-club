import ForumPage from "./ForumPage";
import { getTodayAlbum, getDateString } from "@/lib/albums";

export const dynamic = "force-dynamic";

/* A daily site whose shared link never said which day. The title and card now
   name today's record, so a paste into a chat window shows what the club is
   listening to instead of a bare URL — and a crawler that returns tomorrow
   sees a different page rather than the same static string.

   force-dynamic above already prevents this being cached past midnight UTC. */
export function generateMetadata() {
  const album = getTodayAlbum();
  const title = `${album.title} by ${album.artist} — Album Of The Day Club`;
  const description = `Today's album is ${album.title} by ${album.artist} (${album.year}, ${album.genre}). Rate it, call the vibe, and argue about where it belongs.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function Home() {
  const album = getTodayAlbum();
  const dateString = getDateString();

  return <ForumPage album={album} dateString={dateString} />;
}
