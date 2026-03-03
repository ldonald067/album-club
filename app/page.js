import ForumPage from "./ForumPage";
import { getTodayAlbum, getDateString } from "@/lib/albums";

export const dynamic = "force-dynamic";

export default function Home() {
  const album = getTodayAlbum();
  const dateString = getDateString();

  return <ForumPage album={album} dateString={dateString} />;
}
