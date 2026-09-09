/* The tab strip, and now also the routing table.

   Every tab used to be `activeSection` state on one route, which meant the
   whole site lived at `/`: you could not link someone to the Archive, a reload
   always dropped you back on Home, the back button left the site entirely, and
   a crawler only ever saw the home page. Each tab is a real URL now, and this
   is the single list the nav, the route folders and the sitemap all read from —
   so a new tab is a new entry here plus a two-line page.js, and nothing can
   drift out of step.

   Keep `key` in sync with the folder name under app/: app/<key>/page.js is the
   route, and `path` is the href. Home is the exception, at "/". */
export const SECTIONS = [
  { key: "home", path: "/", icon: "hn hn-home", label: "Home" },
  {
    key: "soundtrack",
    path: "/soundtrack",
    icon: "hn hn-headphones",
    label: "Soundtrack Corner",
  },
  { key: "cozy", path: "/cozy", icon: "hn hn-play", label: "Cozy Vibes" },
  {
    key: "archive",
    path: "/archive",
    icon: "hn hn-calender",
    label: "Archive",
  },
  { key: "stats", path: "/stats", icon: "hn hn-trending", label: "Stats" },
  { key: "faq", path: "/faq", icon: "hn hn-question", label: "FAQ" },
];

const PATH_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s.path]));

/** Href for a section key. Both call sites pass a literal, so an unknown key is
    always a typo — and it used to resolve to "/", which meant a misspelled
    `sectionPath("soundtrak")` silently sent the Soundtrack Corner teaser to the
    home page instead of failing where the mistake was. Throwing surfaces it on
    the first render in dev, which is the only place it can ever happen. */
export function sectionPath(key) {
  const path = PATH_BY_KEY[key];
  if (!path) throw new Error(`Unknown section key: ${key}`);
  return path;
}
