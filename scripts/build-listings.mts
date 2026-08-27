/**
 * Snapshot the live listings so development and builds have prices without a
 * key and without the network. Run it when the committed prices go stale:
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/build-listings.mts
 *
 * It MERGES rather than replaces. WynnVentory is players uploading what they
 * see, so at a quiet hour most items come back with nothing - running this
 * then used to overwrite a full snapshot with an empty one and empty the
 * board. An item that returns nothing now keeps what it had; every listing
 * carries its own timestamp, so a stale sighting is labelled rather than
 * pretended to be current.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import ingredients from '../src/data/ingredients.json' with { type: 'json' }

interface Raw {
  /** Names collide across item types; only ingredients belong here. */
  item_type: string
  amount: number
  listing_price: number
  timestamp: string
}

const KEY = process.env.WYNNVENTORY_KEY
if (!KEY) {
  console.error('WYNNVENTORY_KEY missing - pass --env-file=.env.local')
  process.exit(1)
}

const targets = (ingredients as { name: string; level: number; drops: unknown[] }[])
  .filter((i) => i.drops.length > 0 && i.level <= 60)
  .map((i) => i.name)

const out: Record<string, unknown[]> = {}
let done = 0

async function pool<T>(items: T[], limit: number, fn: (i: T) => Promise<void>) {
  let n = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (;;) {
        const i = n++
        if (i >= items.length) return
        await fn(items[i])
      }
    }),
  )
}

await pool(targets, 10, async (name) => {
  try {
    const res = await fetch(
      `https://www.wynnventory.com/api/trademarket/listings/${encodeURIComponent(name)}`,
      { headers: { 'X-API-Key': KEY, 'User-Agent': 'wynn-guide/1.0 (personal use)' } },
    )
    if (res.ok) {
      const body = (await res.json()) as { items?: Raw[] }
      const rows = (body.items ?? [])
        .filter((i) => i.item_type === 'IngredientItem' && i.listing_price > 0 && i.amount > 0)
        .map((i) => ({
          unit: i.listing_price,
          total: i.listing_price * i.amount,
          amount: i.amount,
          at: i.timestamp,
        }))
        .sort((a, b) => a.unit - b.unit)
      if (rows.length > 0) out[name] = rows
    }
  } catch {
    /* leave it out; the board treats a missing entry as unlisted */
  }
  if (++done % 50 === 0) console.log(`  ${done}/${targets.length}`)
})

const path = 'src/data/listings.json'
const prior: Record<string, unknown[]> = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : {}

const merged = { ...prior, ...out }
const kept = Object.keys(prior).filter((k) => !(k in out)).length

writeFileSync(path, JSON.stringify(merged))
console.log(
  `${Object.keys(out).length} of ${targets.length} listed now, ` +
    `${kept} kept from the last run -> ${Object.keys(merged).length} in ${path}`,
)
