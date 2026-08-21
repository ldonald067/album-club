const SITE_URL =
  process.env.SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://littlealbumclub.net");

/* One entry, because the site is one page — every tab is client state, not a
   route. It still earns its place: `changeFrequency: "daily"` is true here in
   a way it rarely is, and it is what tells a crawler to come back tomorrow for
   a different album rather than treating the page as static. */
export default function sitemap() {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
