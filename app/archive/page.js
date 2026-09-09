import { SectionPage, sectionMetadata } from "../section-page";

// A tab of the one page — see app/sections.js and app/section-page.js.
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return sectionMetadata("archive");
}

export default function Page() {
  return <SectionPage section="archive" />;
}
