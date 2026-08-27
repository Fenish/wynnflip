import type { Metadata, Viewport } from "next";
import { Architects_Daughter, IBM_Plex_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { SITE_URL } from "@/lib/site";

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
/**
 * The long form is for a search result, where there is room for it and a bare
 * brand name wastes the line. The embeds keep the short one: Discord already
 * prints the site name as an eyebrow directly above the title, so repeating
 * the subject there just makes the card noisier.
 */
const SEO_TITLE = "WynnLytics - Wynncraft trade market prices, ranked by profit";
const DESCRIPTION =
  "What to buy, kill and gather on the Wynncraft trade market - ranked by what it actually pays.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO_TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    // the image itself comes from opengraph-image.tsx, which emits og:image,
    // its type and its real dimensions on its own
  },
  /*
   * The card is drawn at 1200x630 now, so it can be shown in full rather than
   * as a corner thumbnail. `summary` was right while the image was the bare
   * 446x168 mark - at that size a large card is mostly letterbox.
   */
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
        <Analytics />
      </body>
    </html>
  );
}
