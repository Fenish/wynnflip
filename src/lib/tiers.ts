/**
 * The game's own rarity ladder, applied to item names.
 *
 * Wynncraft colours an ingredient's name by its tier, and every community tool
 * that themes at all reproduces exactly this - it is the one piece of game
 * colour that carries information rather than decoration. The tokens were
 * already defined and unused; this is what uses them.
 */
export const TIER_TONE: Record<number, string> = {
  0: 'text-tier-0',
  1: 'text-tier-1',
  2: 'text-tier-2',
  3: 'text-tier-3',
}

export function tierTone(tier: number): string {
  return TIER_TONE[tier] ?? 'text-tier-0'
}

/** The game writes star tiers as stars. */
export function stars(tier: number): string {
  return '✦'.repeat(Math.max(0, tier))
}
