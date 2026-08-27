import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "WynnLytics",
  description: "What to buy, kill and gather on the Wynncraft trade market.",
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
