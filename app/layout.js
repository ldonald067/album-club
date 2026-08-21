import Script from "next/script";
import { Righteous, Silkscreen } from "next/font/google";
import "./iconfont-subset.css";
import "./globals.css";

const righteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-banner",
});

// Bitmap face for the vintage skin. Self-hosted at build time like Righteous,
// so switching skins costs no third-party request.
const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
});

/* Runs before first paint so a saved skin is already on <html> when the page
   renders. Applied in React instead, the default skin would paint first and
   visibly flip. Kept tiny and wrapped in try/catch — Safari private mode throws
   on localStorage access. */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem("aotd_theme");if(t==="vintage"){document.documentElement.setAttribute("data-theme","vintage")}}catch(e){}`;

/* Absolute URLs for every social card. Railway injects RAILWAY_PUBLIC_DOMAIN
   without a scheme; SITE_URL overrides it for a custom domain or a local
   preview. Without a metadataBase, Next resolves og:image relatively and the
   crawler gets a URL it cannot fetch. */
const SITE_URL =
  process.env.SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://littlealbumclub.net");

/* Defaults only. app/page.js overrides title, description and the card with
   today's record — the whole point of a daily site is that a shared link says
   which day. These stay as the fallback for any route that does not. */
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Album Of The Day Club",
  description: "One album. One day. A thousand opinions.",
  openGraph: {
    type: "website",
    siteName: "Album Of The Day Club",
    title: "Album Of The Day Club",
    description: "One album. One day. A thousand opinions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Album Of The Day Club",
    description: "One album. One day. A thousand opinions.",
  },
};

export default function RootLayout({ children }) {
  return (
    /* suppressHydrationWarning is scoped to this one element on purpose: the
       bootstrap script sets data-theme before React hydrates, so the server
       markup and the live DOM legitimately differ by that attribute. Without
       it React reports a mismatch on every load in the vintage skin. */
    <html
      lang="en"
      className={`${righteous.variable} ${silkscreen.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {children}
        <Script
          data-goatcounter="https://littlealbumclub.goatcounter.com/count"
          src="//gc.zgo.at/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
