import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketBoard } from "@/components/MarketBoard";
import { board } from "@/lib/board";
import { emeraldText } from "@/lib/emeralds";
import { money } from "@/lib/format";
import { REVALIDATE_SECONDS } from "@/lib/refresh";
import { findBySlug, MODES, type ShareMode } from "@/lib/share";
import { SITE_NAME, SITE_TITLE } from "@/lib/site";

/**
 * One row, linkable.
 *
 * The board is a ranked list, which is exactly the wrong shape for "look at
 * this one". This opens on the row a link names, and carries that row's own
 * unfurl card, so pasting it somewhere shows the item and its price rather
 * than the site's front page.
 *
 * Not prerendered: there are several hundred of these and they change every
 * hour. The first request for one builds it and the rest are served from the
 * cache, on the same window as the board itself.
 */
export const revalidate = 3600;

if (revalidate !== REVALIDATE_SECONDS) {
 throw new Error(
  `revalidate (${revalidate}) and REVALIDATE_SECONDS (${REVALIDATE_SECONDS}) have drifted.`,
 );
}

type Params = Promise<{ mode: string; slug: string }>;

/** The row a URL names, or nothing if it has dropped off the board. */
async function resolve(params: Params) {
 const { mode, slug } = await params;
 if (!MODES.includes(mode as ShareMode)) return null;
 const m = mode as ShareMode;
 const data = await board();

 if (m === "gather") {
  const row = findBySlug(data.gather, decodeURIComponent(slug), true);
  return row
   ? { m, data, gather: row, item: null }
   : { m, data, gather: null, item: null };
 }
 const row = findBySlug(
  m === "flip" ? data.flip : data.farm,
  decodeURIComponent(slug),
  false,
 );
 return { m, data, gather: null, item: row ?? null };
}

export async function generateMetadata({
 params,
}: {
 params: Params;
}): Promise<Metadata> {
 const found = await resolve(params);
 if (!found) return {};

 const { m, gather, item } = found;
 if (!gather && !item) return {};

 const name = gather ? `${gather.name} ${"✦".repeat(gather.tier)}` : item!.name;
 const price = gather ? gather.price : item!.open[0]?.unit;
 const both = `${money(price)} · ${emeraldText(price)}`;

 const description = gather
  ? `${name} sells for ${both} on the Wynncraft trade market. ${gather.sold.toLocaleString("en-US")} sold yesterday.`
  : m === "flip"
    ? `Buy ${name} at ${both} and relist above it. ${item!.listings.toLocaleString("en-US")} changed hands yesterday.`
    : `${name} sells for ${both}. Dropped by ${item!.mobs[0] ?? "unknown"}.`;

 return {
  // The site's own title, not the item's. A long name pushes the brand out of
  // a tab and out of a search result, and the card already says which item it
  // is - the description carries the specifics instead.
  title: SITE_TITLE,
  description,
  openGraph: {
   type: "website",
   siteName: SITE_NAME,
   title: SITE_NAME,
   description,
   url: `/i/${m}/${(await params).slug}`,
  },
  twitter: {
   card: "summary_large_image",
   title: SITE_NAME,
   description,
  },
 };
}

export default async function Item({ params }: { params: Params }) {
 const found = await resolve(params);
 // An unknown mode, or an item that is no longer on the board. Dropping into
 // the list with no explanation would leave someone who followed a link to one
 // item wondering what they are looking at; not-found says what happened.
 if (!found || (!found.gather && !found.item)) notFound();

 const { m, data, gather, item } = found;
 return (
  <MarketBoard
   data={data}
   initial={{
    mode: m,
    key: gather ? `${gather.name}|${gather.tier}` : (item?.name ?? null),
   }}
  />
 );
}
