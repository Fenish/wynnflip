import type { Metadata, Viewport } from "next";
import { Architects_Daughter, IBM_Plex_Sans } from "next/font/google";

import "./globals.css";

// Plex was drawn for technical and data-dense contexts, and its Turkish
// diacritics hold up at the small sizes this table needs.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin-ext"],
  weight: ["400", "500", "600"],
});

/**
 * Wynncraft's own display face, taken from their site's computed styles. It is
 * a handwriting font, so it does exactly what the game does with it: labels
 * and headings, never a column of numbers.
 */
const architects = Architects_Daughter({
  variable: "--font-architects",
  subsets: ["latin"],
  weight: "400",
});

const TITLE = "WynnLytics";
const DESCRIPTION =
  "What to buy, kill and gather on the Wynncraft trade market - ranked by what it actually pays.";

/**
 * Where relative URLs in this metadata resolve to.
 *
 * og:image has to be absolute for anything to unfurl it, and only the running
 * deployment knows its own host. Vercel exposes the stable production domain
 * separately from the per-deployment one, so a preview build advertises itself
 * rather than pointing at production.
 */
const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [
      { url: "/logo.webp", width: 446, height: 168, alt: TITLE },
    ],
  },
  /*
   * `summary` puts the mark in the corner and gives the words the room;
   * `summary_large_image` would stretch a 446x168 logo across a 1200x630 slot
   * and letterbox it. The dimensions above let a client hold the space before
   * the bytes land.
   */
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo.webp"],
  },
};

/** The stripe down the left of a Discord embed reads this. */
export const viewport: Viewport = {
  themeColor: "#4fd08a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${architects.variable} h-full`}
    >
      {/* Extensions add attributes to body before React loads; without this
          every page logs a hydration mismatch that is not ours. */}
      {/* The two panes own their scrolling; the document itself must not also
          scroll or you get two bars and a header that drifts away. */}
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
