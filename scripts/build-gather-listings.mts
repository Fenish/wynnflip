/**
 * Snapshot material listings, by star tier, so the gather board survives a
 * quiet hour.
 *
 * The flip board has had a committed listings file since the start; the gather
 * board went straight to the live endpoint, so when WynnVentory came back empty
 * the list fell from 296 rows to 42. Materials are three products under one
 * name, so this keys on `name|tier` the way the history file does.
 *
 * Like the ingredient snapshot, it MERGES: a material that returns nothing now
 * keeps what it had, and each listing carries the timestamp it was seen at.
 *
 *   npm run build:gather
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import materials from '../src/data/materials.json' with { type: 'json' }

interface Raw {
  item_type: string
  tier: number
  amount: number
  listing_price: number
  timestamp: string
}

const KEY = process.env.WYNNVENTORY_KEY
if (!KEY) {
  console.error('WYNNVENTORY_KEY missing - pass --env-file-if-exists=.env.local')
  process.exit(1)
}

const OUT = 'src/data/material-listings.json'
const UA = { 'X-API-Key': KEY, 'User-Agent': 'wynn-guide/1.0 (personal use)' }
const names = (materials as { name: string }[]).map((m) => m.name)

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

await pool(names, 12, async (name) => {
  try {
    const res = await fetch(
      `https://www.wynnventory.com/api/trademarket/listings/${encodeURIComponent(name)}`,
      { headers: UA, signal: AbortSignal.timeout(20_000) },
    )
    if (res.ok) {
      const body = (await res.json()) as { items?: Raw[] }
      const byTier: Record<number, unknown[]> = {}
      for (const i of body.items ?? []) {
        if (i.item_type !== 'MaterialItem' || i.listing_price <= 0 || i.amount <= 0) continue
        ;(byTier[i.tier] ??= []).push({
          unit: i.listing_price,
          total: i.listing_price * i.amount,
          amount: i.amount,
          at: i.timestamp,
        })
      }
      for (const [tier, rows] of Object.entries(byTier)) {
        ;(rows as { unit: number }[]).sort((a, b) => a.unit - b.unit)
        out[`${name}|${tier}`] = rows
      }
    }
  } catch {
    /* leave it out; the merge below keeps whatever was there before */
  }
  if (++done % 50 === 0) console.log(`  ${done}/${names.length}`)
})

const prior: Record<string, unknown[]> = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, 'utf8'))
  : {}
const merged = { ...prior, ...out }
const kept = Object.keys(prior).filter((k) => !(k in out)).length

writeFileSync(OUT, JSON.stringify(merged))
console.log(
  `${Object.keys(out).length} name|tier series live, ${kept} kept from the last run ` +
    `-> ${Object.keys(merged).length} in ${OUT}`,
)
