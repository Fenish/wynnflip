import "server-only";

import { PRICE_TTL_SECONDS } from "./refresh";
import type { MarketDay } from "./types";

/**
 * Trade-market data.
 *
 * The official Wynncraft API has no market endpoint, so prices come from
 * WynnVentory, which is crowdsourced: players running their mod upload what
 * they see while browsing. Trust a price in proportion to its listing count -
 * a few hundred is solid, single digits is one person's snapshot.
 *
 * wynnmarket.com gives a second, independent 30-day average. When the two
 * agree the price is settled; when they diverge it is not.
 *
 * Neither sends CORS headers, which is why all of this runs server-side.
 */

const VENTORY = "https://www.wynnventory.com/api/trademarket";
const WMARKET = "https://wynnmarket.com/api";
const UA = { "User-Agent": "wynn-guide/1.0 (personal use)" };

const PRICE_TTL = PRICE_TTL_SECONDS;
/**
 * Node's fetch has no default timeout, so a single connection that stalls
 * takes the whole page with it - the board makes hundreds of these calls and
 * renders nothing until the last one returns. Ten seconds is generous next to
 * a healthy response (0.5s for listings, 4.5s for history) and short enough
 * that one bad connection costs a row rather than the page.
 */
const DEADLINE = 10_000;
const CROSS_TTL = 12 * 60 * 60;

/** wynnmarket suffixes ingredient names with a roman tier: "Nivlan Honey III". */
const ROMAN: Record<number, string> = { 0: "", 1: "I", 2: "II", 3: "III" };

interface VentoryDay {
 timestamp?: string;
 p50_price?: number | null;
 average_price?: number | null;
 average_mid_80_percent_price?: number | null;
 lowest_price?: number | null;
 highest_price?: number | null;
 total_count?: number | null;
}

async function get<T>(url: string, revalidate: number): Promise<T | null> {
 try {
  const res = await fetch(url, {
   headers: UA,
   next: { revalidate },
   signal: AbortSignal.timeout(DEADLINE),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
 } catch {
  return null;
 }
}

/**
 * Daily price history, newest first.
 *
 * Timestamps are RFC-822 ("Mon, 17 Aug 2026 ..."). They MUST be parsed as
 * dates - sorting them as strings orders by weekday name and silently hands
 * back the wrong "latest" day.
 */
export async function history(name: string): Promise<MarketDay[]> {
 const url = `${VENTORY}/history/${encodeURIComponent(name)}`;
 const raw = await get<VentoryDay[]>(url, PRICE_TTL);
 if (!raw) return [];

 return raw
  .filter((d) => d.timestamp)
  .sort(
   (a, b) =>
    new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime(),
  )
  .map((d) => ({
   date: d.timestamp!,
   low: d.lowest_price ?? null,
   median: d.p50_price ?? null,
   trimmed: d.average_mid_80_percent_price ?? null,
   high: d.highest_price ?? null,
   count: d.total_count ?? 0,
  }));
}

interface VentoryListing {
 name: string;
 /** Names are not unique across item types - "Rose" is a gear piece, a mount
  * and an ingredient, and the endpoint returns all three. */
 item_type: string;
 amount: number;
 listing_price: number;
 timestamp: string;
}

export interface Listing {
 /** What one of them costs. The seller sets this directly. */
 unit: number;
 /** What the whole listing costs, if you take all of it. */
 total: number;
 amount: number;
 at: string;
}

/**
 * The live listings behind a price, cheapest first.
 *
 * `listing_price` is the price of ONE of them - the seller picks a cost per
 * item when posting, as the wiki's Trade Market page spells out - so it is
 * used as-is. Dividing it by `amount` was wrong and produced nonsense: it made
 * every big stack look like a giveaway, and turned the spread within a single
 * item from a believable 12-76x into 5,900x.
 */
export async function listings(name: string): Promise<Listing[]> {
 return fetchListings(name, { next: { revalidate: PRICE_TTL } });
}

async function fetchListings(
 name: string,
 caching: RequestInit & { next?: { revalidate: number } },
): Promise<Listing[]> {
 const key = process.env.WYNNVENTORY_KEY;
 if (!key) return [];

 try {
  const res = await fetch(`${VENTORY}/listings/${encodeURIComponent(name)}`, {
   headers: { ...UA, "X-API-Key": key },
   signal: AbortSignal.timeout(DEADLINE),
   ...caching,
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { items?: VentoryListing[] };
  return (body.items ?? [])
   .filter(
    (i) =>
     i.item_type === "IngredientItem" && i.listing_price > 0 && i.amount > 0,
   )
   .map((i) => ({
    unit: i.listing_price,
    total: i.listing_price * i.amount,
    amount: i.amount,
    at: i.timestamp,
   }))
   .sort((a, b) => a.unit - b.unit);
 } catch {
  return [];
 }
}

interface VentoryMaterial {
 item_type: string;
 /** Star tier, 1 to 3. Prices between them differ by orders of magnitude. */
 tier: number;
 amount: number;
 listing_price: number;
 timestamp: string;
}

/**
 * Gathering materials, split by star tier.
 *
 * A material is really three products sharing a name: Barley Grains sells for
 * about 141 at one star and over 5,800 at three, and the one-star moves 2,351
 * a day against the three-star's 21. Lumping them together would produce an
 * average that describes neither.
 */
export async function materialListings(
 name: string,
): Promise<Record<number, Listing[]>> {
 const key = process.env.WYNNVENTORY_KEY;
 if (!key) return {};

 try {
  const res = await fetch(`${VENTORY}/listings/${encodeURIComponent(name)}`, {
   headers: { ...UA, "X-API-Key": key },
   signal: AbortSignal.timeout(DEADLINE),
   next: { revalidate: PRICE_TTL },
  });
  if (!res.ok) return {};
  const body = (await res.json()) as { items?: VentoryMaterial[] };

  const byTier: Record<number, Listing[]> = {};
  for (const i of body.items ?? []) {
   if (i.item_type !== "MaterialItem" || i.listing_price <= 0 || i.amount <= 0) {
    continue;
   }
   (byTier[i.tier] ??= []).push({
    unit: i.listing_price,
    total: i.listing_price * i.amount,
    amount: i.amount,
    at: i.timestamp,
   });
  }
  for (const t of Object.keys(byTier)) {
   byTier[Number(t)].sort((a, b) => a.unit - b.unit);
  }
  return byTier;
 } catch {
  return {};
 }
}

/**
 * A material's daily history for one star tier.
 *
 * The tier parameter is not optional here. Asked without it the endpoint hands
 * back an empty list, which is easy to read as "materials have no history" -
 * they do, one series per tier, including the daily traded count that says
 * whether the thing actually moves.
 */
export async function materialHistory(
 name: string,
 tier: number,
): Promise<MarketDay[]> {
 const url = `${VENTORY}/history/${encodeURIComponent(name)}?tier=${tier}`;
 const raw = await get<VentoryDay[]>(url, PRICE_TTL);
 if (!raw) return [];

 return raw
  .filter((d) => d.timestamp)
  .sort(
   (a, b) =>
    new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime(),
  )
  .map((d) => ({
   date: d.timestamp!,
   low: d.lowest_price ?? null,
   median: d.p50_price ?? null,
   trimmed: d.average_mid_80_percent_price ?? null,
   high: d.highest_price ?? null,
   count: d.total_count ?? 0,
  }));
}

/**
 * The same call, but never from the cache.
 *
 * Used when a specific item is opened: the cached copy is up to two hours old
 * and the cheap listing you are looking at may already be gone.
 */
export async function liveListings(name: string): Promise<Listing[]> {
 return fetchListings(name, { cache: "no-store" });
}

/** The newest day, or null when nothing is recorded. */
export async function latest(name: string): Promise<MarketDay | null> {
 const days = await history(name);
 return days.find((d) => d.median) ?? null;
}

interface WMarketItem {
 name: string;
 avg_30d: number | null;
}

/** Second opinion: wynnmarket's 30-day average, over a longer window. */
export async function crossPrice(
 name: string,
 tier: number,
): Promise<{ avg30d: number | null; matched: string } | null> {
 const hits = await get<WMarketItem[]>(
  `${WMARKET}/items?search=${encodeURIComponent(name)}`,
  CROSS_TTL,
 );
 if (!hits) return null;
 const want = `${name} ${ROMAN[tier] ?? ""}`.trim();
 const hit = hits.find((h) => h.name === want);
 return hit ? { avg30d: hit.avg_30d, matched: want } : null;
}
