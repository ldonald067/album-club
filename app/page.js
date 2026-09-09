import { SectionPage, sectionMetadata } from "./section-page";

export const dynamic = "force-dynamic";

/* A daily site whose shared link never said which day. The title and card now
   name today's record, so a paste into a chat window shows what the club is
   listening to instead of a bare URL — and a crawler that returns tomorrow
   sees a different page rather than the same static string.

   The copy for every tab lives in app/section-page.js; force-dynamic stays
   here because route segment config is only read from a page or layout file.
   It also prevents this being cached past midnight UTC. */
export function generateMetadata() {
  return sectionMetadata("home");
}

export default function Home() {
  return <SectionPage section="home" />;
}
