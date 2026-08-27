import 'server-only'

import iconIndex from '@/data/icons.json'
import historyRaw from '@/data/history.json'
import materialListingSnapRaw from '@/data/material-listings.json'
import materialsRaw from '@/data/materials.json'

import { MIN_TIER_LISTINGS, TIERS } from './gather.shared'
import { materialListings } from './market'
import { sellFloor, trend } from './scoring'
import type { GatherRow, Listing, MarketDay, Material } from './types'

const materials = materialsRaw as unknown as Material[]
const icons = iconIndex as Record<string, string>
/**
 * Daily history, snapshotted at build time by `npm run build:history`.
 *
 * Measured: a listings call answers in 0.45s, a history call in 4.4s, and the
 * board needs about 220 of the latter - 80% of a two-and-a-half-minute cold
 * page. These are daily aggregates, so yesterday's traded count does not change
 * during the day and a snapshot costs nothing that matters. Prices stay live.
 */
const history = historyRaw as unknown as Record<string, MarketDay[]>
/**
 * Last known listings per `name|tier`, from `npm run build:gather`.
 *
 * WynnVentory is players uploading what they see, so at a quiet hour most
 * materials come back with nothing and the board fell from 296 rows to 42.
 * A sighting from this morning, labelled with the hour it was seen, is worth
 * more than an empty screen.
 */
const listingSnap = materialListingSnapRaw as unknown as Record<string, Listing[]>

/**
 * Everything you can gather and sell, one row per product.
 *
 * A material and a star tier are separate products - Redwood Paper is 89 at
 * one star and 49,606 at three - so they get separate rows rather than being
 * folded into a single figure. There is deliberately no expected-value maths
 * here: you sell what you happen to have, and what matters is what it fetches
 * and whether anyone is buying.
 *
 * Both halves come from WynnVentory: the board for what people are asking, and
 * the per-tier history for how many actually changed hands. That history call
 * needs `?tier=` - asked without it the endpoint returns an empty list, which
 * reads like materials having no history at all when they have three series
 * each.
 */
export async function gatherBoard(now: number): Promise<GatherRow[]> {
  const nested = await pooled(materials, 12, async (m) => {
    const fetched = await materialListings(m.name)
    // fall back per tier, not per material: one tier can be live while the
    // other two are quiet, and dropping those two loses real products
    const byTier: Record<number, Listing[]> = {}
    for (const t of TIERS) {
      const live = fetched[t] ?? []
      byTier[t] = live.length > 0 ? live : (listingSnap[`${m.name}|${t}`] ?? [])
    }

    const shown = TIERS.filter((t) => byTier[t].length >= MIN_TIER_LISTINGS)
    if (shown.length === 0) return []

    const priced = shown.map((tier) => {
      const open = byTier[tier]
      const days = history[`${m.name}|${tier}`] ?? []
      return {
        tier,
        open,
        price: sellFloor(open),
        days,
        sold: days.find((d) => d.median)?.count ?? 0,
      }
    })

    return priced.map((p): GatherRow => {
      // lead with the listing the price came from, so a row and its panel
      // cannot disagree about where the number came from
      const setter = p.open.find((l) => l.unit === p.price)

      return {
        name: m.name,
        icon: icons[m.name] ?? '',
        profession: m.profession,
        level: m.level,
        tier: p.tier,
        price: p.price,
        listings: p.open.length,
        open: setter
          ? [setter, ...p.open.filter((l) => l !== setter).slice(0, 5)]
          : p.open.slice(0, 6),
        setterAt: setter?.at ?? null,
        sold: p.sold,
        days: p.days,
        trend: trend(p.days),
        siblings: priced
          .filter((s) => s.tier !== p.tier)
          .map((s) => ({ tier: s.tier, price: s.price, sold: s.sold })),
        builtAt: now,
      }
    })
  })

  return nested.flat().sort((a, b) => b.price - a.price)
}

async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++
        if (i >= items.length) return
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}
