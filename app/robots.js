const SITE_URL =
  process.env.SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://littlealbumclub.net");

/* There was no robots.txt at all, which crawlers treat as "index everything"
   — so this changes nothing about what is allowed. What it adds is the sitemap
   pointer, which is the only reliable way to tell a crawler the page exists
   without waiting to be linked from somewhere else.

   /api is disallowed because those routes are no-store JSON with no content to
   index; keeping them out spends the crawl budget on the page that matters. */
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
