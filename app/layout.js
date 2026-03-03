import { Righteous } from "next/font/google";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import "./globals.css";

const righteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-banner",
});

export const metadata = {
  title: "Album Of The Day Club",
  description: "One album. One day. A thousand opinions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={righteous.variable}>
      <body>{children}</body>
    </html>
  );
}
