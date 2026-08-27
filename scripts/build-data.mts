/**
 * Pull the Wynncraft item database and trim it to what the app needs.
 *
 * The full database is 6.1 MB of every weapon, armour and tome in the game.
 * Fetching that on each request would be wasteful and it is far too large to
 * sit in a serverless cache entry, so this runs once at build time and writes
 * a 0.6 MB ingredient-only file the app imports directly.
 *
 *   npm run build:data
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../src/data/ingredients.json')
const API = 'https://api.wynncraft.com/v3/item/database?fullResult'

type Coord = number[]

interface RawItem {
  displayName: string
  type: string
  tier?: string
  requirements?: { level?: number; skills?: string[] }
  identifications?: Record<string, unknown>
  consumableOnlyIDs?: Record<string, number>
  ingredientPositionModifiers?: Record<string, number>
  droppedBy?: { name: string; coords: Coord | Coord[] }[]
}

/** The API returns coords as one [x,y,z,r] or a list of them, and repeats spots. */
function normaliseCoords(raw: Coord | Coord[] | undefined): Coord[] {
  if (!raw || raw.length === 0) return []
  const list = (Array.isArray(raw[0]) ? raw : [raw]) as Coord[]
  const seen = new Set<string>()
  const out: Coord[] = []
  for (const c of list) {
    const key = c.slice(0, 3).join(',')
    if (!seen.has(key)) {
      seen.add(key)
      out.push(c)
    }
  }
  return out
}

async function main() {
  console.log('fetching item database...')
  const res = await fetch(API, {
    headers: { 'User-Agent': 'wynn-guide/1.0 (personal use)' },
  })
  if (!res.ok) throw new Error(`item database: HTTP ${res.status}`)
  const db = (await res.json()) as RawItem[]

  const ingredients = db
    .filter((i) => i.type === 'ingredient')
    .map((i) => ({
      name: i.displayName,
      tier: Number(String(i.tier ?? 'TIER_0').replace('TIER_', '')),
      level: i.requirements?.level ?? 0,
      skills: i.requirements?.skills ?? [],
      ids: i.identifications ?? {},
      consumable: Object.fromEntries(
        Object.entries(i.consumableOnlyIDs ?? {}).filter(([, v]) => v),
      ),
      grid: Object.fromEntries(
        Object.entries(i.ingredientPositionModifiers ?? {}).filter(([, v]) => v),
      ),
      drops: (i.droppedBy ?? []).map((d) => ({
        name: d.name,
        spots: normaliseCoords(d.coords),
      })),
    }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(ingredients), 'utf8')

  const mb = (JSON.stringify(ingredients).length / 1e6).toFixed(2)
  console.log(`${ingredients.length} ingredients -> ${OUT} (${mb} MB)`)
  console.log(`trimmed from ${db.length} items / ${(JSON.stringify(db).length / 1e6).toFixed(1)} MB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
