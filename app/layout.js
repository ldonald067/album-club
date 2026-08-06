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

export const metadata = {
  title: "Album Of The Day Club",
  description: "One album. One day. A thousand opinions.",
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
