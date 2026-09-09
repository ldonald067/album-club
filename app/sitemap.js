import { SECTIONS } from "./sections";

const SITE_URL =
  process.env.SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://littlealbumclub.net");

/* One entry per tab, built from the same list the nav renders, so a tab added
   there is in the sitemap the same day. This was a single entry for as long as
   every tab was client state on one route — a crawler could only ever see the
   home page, and the Archive and the FAQ, which are the two things here worth
   finding in a search result, did not exist as far as the web was concerned.

   Home stays daily and priority 1: the album changes at midnight UTC, and
   `changeFrequency: "daily"` is true here in a way it rarely is. The rest carry
   what they actually are — the Archive gains a row every day, and the FAQ has
   not changed in months. */
const CHANGE_FREQUENCY = {
  home: "daily",
  soundtrack: "daily",
  archive: "daily",
  stats: "weekly",
  cozy: "monthly",
  faq: "monthly",
};

export default function sitemap() {
  const lastModified = new Date();

  return SECTIONS.map((section) => ({
    url: section.path === "/" ? SITE_URL : `${SITE_URL}${section.path}`,
    lastModified,
    changeFrequency: CHANGE_FREQUENCY[section.key] || "weekly",
    priority: section.key === "home" ? 1 : 0.6,
  }));
}
