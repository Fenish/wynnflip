/**
 * Pull a price snapshot for every farmable ingredient and commit it.
 *
 * Why a snapshot exists at all: WynnVentory has no bulk endpoint and answers
 * in ~4.5s per item, so building the board from live calls takes minutes on a
 * cold cache. That is fine for a manual refresh, unacceptable for a page load.
 * The app therefore renders this file instantly and only goes to the network
 * when the user asks it to.
 *
 *   npm run build:snapshot            # live, slow, ~6 min
 *   npm run build:snapshot -- --seed <dir>   # from an existing price cache
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../src/data/snapshot.json')
const INGREDIENTS = resolve(HERE, '../src/data/ingredients.json')
const VENTORY = 'https://www.wynnventory.com/api/trademarket/history'
const LEVEL_CAP = 60
const WORKERS = 6

interface Ingredient {
  name: string
  level: number
  drops: unknown[]
}

interface Day {
  timestamp?: string
  p50_price?: number | null
  average_mid_80_percent_price?: number | null
  lowest_price?: number | null
  highest_price?: number | null
  total_count?: number | null
}

function toDays(raw: Day[]) {
  return raw
    .filter((d) => d.timestamp)
    .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
    .map((d) => ({
      date: d.timestamp!,
      low: d.lowest_price ?? null,
      median: d.p50_price ?? null,
      trimmed: d.average_mid_80_percent_price ?? null,
      high: d.highest_price ?? null,
      count: d.total_count ?? 0,
    }))
}

async function fetchLive(name: string) {
  try {
    const res = await fetch(`${VENTORY}/${encodeURIComponent(name)}`, {
      headers: { 'User-Agent': 'wynn-guide/1.0 (personal use)' },
    })
    if (!res.ok) return []
    return toDays((await res.json()) as Day[])
  } catch {
    return []
  }
}

/** Read an existing on-disk price cache instead of hitting the network. */
async function seedReader(dir: string) {
  const files = await readdir(dir)
  const byKey = new Map<string, string>()
  for (const f of files) {
    if (f.startsWith('mkt_') && f.endsWith('.json')) byKey.set(f, join(dir, f))
  }
  return async (name: string) => {
    const key = 'mkt_' + name.toLowerCase().replaceAll(' ', '_') + '.json'
    const path = byKey.get(key)
    if (!path) return []
    try {
      return toDays(JSON.parse(await readFile(path, 'utf8')) as Day[])
    } catch {
      return []
    }
  }
}

async function pooled<T, R>(items: T[], limit: number, fn: (i: T) => Promise<R>) {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++
        if (i >= items.length) return
        out[i] = await fn(items[i])
        if (i % 50 === 0) console.log(`  ${i}/${items.length}`)
      }
    }),
  )
  return out
}

async function main() {
  const seedFlag = process.argv.indexOf('--seed')
  const read =
    seedFlag > -1 ? await seedReader(process.argv[seedFlag + 1]) : fetchLive

  const all = JSON.parse(await readFile(INGREDIENTS, 'utf8')) as Ingredient[]
  const targets = all.filter((i) => i.drops.length > 0 && i.level <= LEVEL_CAP)
  console.log(`${targets.length} ingredient (${seedFlag > -1 ? 'seed' : 'live'})`)

  const results = await pooled(targets, WORKERS, async (i) => [i.name, await read(i.name)] as const)
  const snapshot = Object.fromEntries(results.filter(([, days]) => days.length > 0))

  await writeFile(OUT, JSON.stringify(snapshot), 'utf8')
  const kb = (JSON.stringify(snapshot).length / 1024).toFixed(0)
  console.log(`${Object.keys(snapshot).length} priced -> ${OUT} (${kb} KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
