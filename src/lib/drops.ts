/**
 * Cleaning up `droppedBy`.
 *
 * The official API's drop list is not curated. It carries literal `ERROR` and
 * `null` rows, internal entities (`Ingredient Dummy`, `Trigger`), Minecraft
 * colour codes glued to names (`§eLunar Effigy`), and the same mob repeated
 * with an identical coordinate list - "Rymek Citizen" appears three times on
 * Gold Tooth. None of that is a place you can go and kill something, so it is
 * filtered here rather than shown and explained away.
 */

/**
 * Entries that name nothing you can go and kill.
 *
 * The first group is internal: placeholders and parse failures. The second is
 * town NPCs - Rymek Citizens wander Rymek and are not hostile, so listing them
 * as a source of Stolen Pearls sends you somewhere with nothing to fight.
 * Named one by one on purpose: "Cursed Villager" and "Frozen Nesaak Citizen"
 * are real mobs, so no pattern on "citizen" or "villager" would be safe.
 */
const JUNK = new Set([
  "error",
  "null",
  "unknown",
  "",
  "ingredient dummy",
  "testmob",
  "trigger",
  "haros",
  "rymek citizen",
  "aelumia citizen",
  "zhight villager",
]);

export interface Drop {
 name: string;
 spots: number[][];
}

function clean(name: string): string {
 return name
  .replace(/§./g, "") // colour codes, sometimes mid-name
  .replace(/`/g, "'") // the API uses a backtick for apostrophes
  .replace(/\s+/g, " ")
  .trim();
}

/**
 * Real, distinct, locatable sources - the ones with coordinates first.
 *
 * A source with no coordinates cannot be farmed, so it is dropped entirely
 * unless it is all the item has; better to show one unlocatable name than to
 * pretend the item has no source.
 */
export function tidyDrops(drops: Drop[]): Drop[] {
 const byName = new Map<string, Drop>();

 for (const d of drops) {
  const name = clean(d.name ?? "");
  if (JUNK.has(name.toLowerCase())) continue;

  // the same mob is listed repeatedly; keep whichever copy knows the most
  const seen = byName.get(name);
  if (!seen || d.spots.length > seen.spots.length) {
   byName.set(name, { name, spots: d.spots });
  }
 }

 const all = [...byName.values()].sort(
  (a, b) => b.spots.length - a.spots.length,
 );
 const locatable = all.filter((d) => d.spots.length > 0);
 return locatable.length > 0 ? locatable : all;
}
