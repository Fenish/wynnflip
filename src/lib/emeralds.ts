/**
 * The game's own denominations.
 *
 * Every price on this board is already a count of emeralds - the market quotes
 * in them - so this is a way of writing the same number, not a conversion
 * between currencies. Rates from the wiki's Emerald page: an Emerald Block is
 * 64 emeralds, a Liquid Emerald is 64 blocks, and a stack of those is what
 * players call an STX.
 *
 *   1 eb  = 64 e
 *   1 le  = 64 eb  =     4,096 e
 *   1 stx = 64 le  =   262,144 e
 *
 * Note there is no 9-emerald crafting step: Wynncraft's blocks are not vanilla
 * Minecraft's.
 */

export type Unit = "stx" | "le" | "eb" | "e";

export const PER: Record<Unit, number> = {
 stx: 262_144,
 le: 4_096,
 eb: 64,
 e: 1,
};

/** Largest first, so the greedy split below spends the big units first. */
const LADDER: Unit[] = ["stx", "le", "eb", "e"];

export interface Part {
 unit: Unit;
 count: number;
}

/**
 * Break an amount into whole units, the way a player would count it out.
 *
 * `4.1 eb` is not a thing anyone says or types - the market deals in whole
 * emeralds, and 264 of them is 4 blocks and 8 emeralds. So this returns every
 * denomination that has a non-zero count rather than one with a decimal on it.
 *
 *   264      -> 4eb 8e
 *   1310724  -> 5stx 1e
 *   5000     -> 1le 14eb 8e
 *
 * Prices below a single emerald are real on gathered materials, and rounding
 * those to nothing would be a lie, so they keep two decimals and stand alone.
 */
export function decompose(n: number | null | undefined): Part[] | null {
 if (n === null || n === undefined || Number.isNaN(n)) return null;

 const neg = n < 0;
 let left = Math.round(Math.abs(n));

 // under one emerald there is nothing to break down
 if (left === 0) return [{ unit: "e", count: neg ? -Math.abs(n) : Math.abs(n) }];

 const parts: Part[] = [];
 for (const unit of LADDER) {
  const count = Math.floor(left / PER[unit]);
  if (count > 0) {
   parts.push({ unit, count: neg && parts.length === 0 ? -count : count });
   left -= count * PER[unit];
  }
 }
 return parts;
}

/** `5stx 3eb 4e`, for prose and anywhere an icon would be noise. */
export function emeraldText(n: number | null | undefined): string {
 const parts = decompose(n);
 if (!parts) return "-";
 if (parts.length === 1 && parts[0].unit === "e" && !Number.isInteger(parts[0].count)) {
  return `${parts[0].count.toFixed(2)}e`;
 }
 return parts.map((p) => `${p.count.toLocaleString("en-US")}${p.unit}`).join(" ");
}
