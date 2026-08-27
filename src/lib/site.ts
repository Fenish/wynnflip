/**
 * Where this deployment thinks it lives.
 *
 * Two things need it and must not disagree: `metadataBase`, which turns the
 * relative og:image into the absolute URL every unfurler requires, and the
 * address printed on the card itself.
 *
 * `NEXT_PUBLIC_SITE_URL` comes first because Vercel's own variable holds the
 * .vercel.app domain even after a custom one is attached - a link shared from
 * the custom domain was unfurling as the .vercel.app one. Set it in
 * Project - Settings - Environment Variables and this follows.
 */
const raw =
 process.env.NEXT_PUBLIC_SITE_URL ??
 (process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

/** Absolute, with scheme, no trailing slash. */
export const SITE_URL = raw.replace(/\/+$/, "");

/** Just the host, for printing. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/**
 * What the site calls itself, in one place.
 *
 * Item pages keep these rather than putting the item's name in the title: a
 * long name pushes the brand out of a tab or a search result, and the card
 * already says which item it is.
 */
export const SITE_NAME = "WynnFlip";
export const SITE_TITLE =
  "WynnFlip - Wynncraft trade market prices, ranked by profit";
export const SITE_DESCRIPTION =
  "What to buy, kill and gather on the Wynncraft trade market - ranked by what it actually pays.";
