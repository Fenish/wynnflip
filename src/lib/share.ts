/**
 * Links to a single row.
 *
 * The identifier is the item's own name, slugified, rather than a generated
 * id. A stored id would need somewhere to store it; a hash would need a
 * reverse lookup and would tell nobody anything. `/i/gather/redwood-paper-3`
 * says what it opens before you click it, which is the whole point of a link
 * you are going to paste somewhere.
 *
 * A material is three products under one name, so its tier rides on the end.
 */

export type ShareMode = "flip" | "farm" | "gather";

export const MODES: ShareMode[] = ["flip", "farm", "gather"];

/**
 * Lowercase, spaces to hyphens, everything else dropped.
 *
 * Item names carry apostrophes ("Bob's Tear"), commas and the odd symbol
 * ("Old Treasure֎"); none of them survive, and none of them are what
 * distinguishes one item from another.
 */
export function slugify(name: string): string {
 return name
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
}

/** The path segment for one row. */
export function slugFor(name: string, tier?: number): string {
 const base = slugify(name);
 return tier === undefined ? base : `${base}-${tier}`;
}

/** The whole path, ready to paste. */
export function pathFor(mode: ShareMode, name: string, tier?: number): string {
 return `/i/${mode}/${slugFor(name, tier)}`;
}

/**
 * Find the row a slug names.
 *
 * Matching is done by slugifying the candidates rather than by un-slugifying
 * the input, because the transform only goes one way - "bobs-tear" cannot be
 * turned back into "Bob's Tear" without the list in front of you.
 */
export function findBySlug<T extends { name: string; tier?: number }>(
 rows: T[],
 slug: string,
 withTier: boolean,
): T | undefined {
 return rows.find(
  (r) => slugFor(r.name, withTier ? r.tier : undefined) === slug,
 );
}
