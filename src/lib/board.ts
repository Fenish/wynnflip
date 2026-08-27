import "server-only";

import iconIndex from "@/data/icons.json";
import ingredientsRaw from "@/data/ingredients.json";
import listingSnapRaw from "@/data/listings.json";
import snapshotRaw from "@/data/snapshot.json";

import { tidyDrops } from "./drops";
import { gatherBoard } from "./gather";
import { crossPrice, listings, liveListings } from "./market";
import { farmRank, flipRank, trend } from "./scoring";
import type { Board, Ingredient, Listing, MarketDay, Priced } from "./types";

const ingredients = ingredientsRaw as unknown as Ingredient[];
const icons = iconIndex as Record<string, string>;
const snapshot = snapshotRaw as unknown as Record<string, MarketDay[]>;
const listingSnap = listingSnapRaw as unknown as Record<string, Listing[]>;

/** What a combat-50ish player can reasonably farm. */
export const LEVEL_CAP = 60;

/**
 * Run `jobs` with a ceiling on how many are in flight - enough to finish the
 * whole board quickly, gentle enough for a small community API.
 */
async function pooled<T, R>(
 items: T[],
 limit: number,
 fn: (item: T) => Promise<R>,
): Promise<R[]> {
 const out = new Array<R>(items.length);
 let next = 0;
 await Promise.all(
  Array.from({ length: Math.min(limit, items.length) }, async () => {
   for (;;) {
    const i = next++;
    if (i >= items.length) return;
    out[i] = await fn(items[i]);
   }
  }),
 );
 return out;
}

export function candidates(): Ingredient[] {
 return ingredients.filter((i) => i.drops.length > 0 && i.level <= LEVEL_CAP);
}

function mid(xs: number[]): number {
 return [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
}

/**
 * Price an ingredient from its live listings.
 *
 * A listing quotes a price per item, so these are per-item figures straight
 * through. The day series is kept for direction and for traffic, never for the
 * price itself - it is a day old by the time it is published.
 */
function toPriced(
 ing: Ingredient,
 open: Listing[],
 days: MarketDay[],
): Priced | null {
 if (open.length === 0) return null;

 const units = open.map((l) => l.unit);
 return {
  name: ing.name,
  tier: ing.tier,
  level: ing.level,
  skills: ing.skills,
  icon: icons[ing.name] ?? "",
  median: mid(units),
  low: units[0],
  high: units[units.length - 1],
  open,
  listings: days.find((d) => d.median)?.count ?? 0,
  mobs: tidyDrops(ing.drops).map((d) => d.name),
  spots: tidyDrops(ing.drops).flatMap((d) => d.spots),
  trend: trend(days),
  days,
  drops: tidyDrops(ing.drops),
 };
}

/**
 * Build both lists.
 *
 * The listings endpoint is quick - the whole candidate set comes back in about
 * fifteen seconds at this concurrency - so unlike the old per-item history
 * pulls this runs live in development too, and the committed snapshot is only
 * a fallback for when the network or the key is missing.
 */
export async function board(): Promise<Board> {
 const now = Date.now();
 const targets = candidates();

 // The two boards hit the same API, so run them together rather than
 // doubling the wall-clock of a regeneration.
 const [rows, gather] = await Promise.all([
  pooled(targets, 10, async (i) => {
   const live = await listings(i.name);
   const open = live.length > 0 ? live : (listingSnap[i.name] ?? []);
   return toPriced(i, open, snapshot[i.name] ?? []);
  }),
  gatherBoard(now),
 ]);

 const priced = rows.filter((r): r is Priced => r !== null);

 return {
  farm: farmRank(priced).slice(0, 25),
  flip: flipRank(priced, now).slice(0, 25),
  // all of them: the gather tab filters by profession and level in the browser
  gather,
  scanned: priced.length,
  unlisted: targets.length - priced.length,

    builtAt: now,
 };
}

/**
 * The part of an item the board rows do not already carry, plus a fresh look
 * at its listings.
 *
 * The board is two hours old by design, but the moment you are about to buy
 * something is exactly when two hours is too old - the cheap stack may already
 * be gone. One item costs one uncached request, so opening an item re-checks
 * that item and nothing else.
 */
export async function sidecar(name: string) {
  const ing = ingredients.find((i) => i.name === name);
  const [open, cross] = await Promise.all([
    liveListings(name),
    ing ? crossPrice(name, ing.tier) : Promise.resolve(null),
  ]);

  return {
    name,
    ids: ing?.ids ?? {},
    consumable: ing?.consumable ?? {},
    cross,
    /** Empty means the re-check failed; the caller keeps what it had. */
    open,
  };
}
