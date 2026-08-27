/**
 * Pull the gathering materials out of the item database.
 *
 * 112 of them: 28 each for mining, fishing, farming and woodcutting. Unlike
 * ingredients they carry no drop coordinates - a material comes from any node
 * of its profession at or above its level - but they do carry `chances`, the
 * per-gather odds of each star tier, which is what makes them rankable.
 *
 *   npm run build:materials
 */
import { writeFileSync } from 'node:fs'

const API = 'https://api.wynncraft.com/v3/item/database?fullResult'
const OUT = 'src/data/materials.json'

interface RawItem {
  displayName?: string
  internalName?: string
  type?: string
  subType?: string
  requirements?: { level?: number }
}

const res = await fetch(API, { headers: { 'User-Agent': 'wynn-guide/1.0 (personal use)' } })
if (!res.ok) {
  console.error(`item database returned ${res.status}`)
  process.exit(1)
}

const db = (await res.json()) as Record<string, RawItem>

const out = Object.values(db)
  .filter((v) => v.type === 'material' && v.displayName && v.subType)
  .map((v) => ({
    name: v.displayName!,
    profession: v.subType!,
    level: v.requirements?.level ?? 1,
  }))
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

writeFileSync(OUT, JSON.stringify(out))
console.log(`${out.length} materials -> ${OUT}`)
