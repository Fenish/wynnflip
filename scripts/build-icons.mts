/**
 * Download every item sprite into public/icons and record where each one came
 * from, so the app serves them itself and only reaches out for a miss.
 *
 * The official API never hands out an image. It describes one two ways, and
 * neither is a URL:
 *
 *   attribute - `{ name: "profession.grainBarley" }`, a model inside
 *               Wynncraft's resource pack. WynnVentory serves exactly these
 *               keys as webp at /cdn/icons/<name>.webp, which is the only
 *               public source for them - the wiki has no page and no file for
 *               a single gathering material, and wynnmarket loads its icons
 *               through client-side JS with no guessable path.
 *
 *   skin      - a Minecraft texture hash, served by Mojang as a whole 64x64
 *               player skin. The item is only its face, so it is cut out here:
 *               8x8 at (8,8) with the hat layer at (40,8) laid over it, scaled
 *               up nearest-neighbour so it stays pixel art.
 *
 * The index stores the source key rather than a filename; the filename is
 * derived from it on both sides, so nothing has to track which files exist.
 *
 *   npm run build:icons
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON_DIR = resolve(HERE, '../public/icons')
const INDEX = resolve(HERE, '../src/data/icons.json')
const INGREDIENTS = resolve(HERE, '../src/data/ingredients.json')
const MATERIALS = resolve(HERE, '../src/data/materials.json')

const API = 'https://api.wynncraft.com/v3/item/database?fullResult'
/**
 * Two hosts, tried in this order.
 *
 * Wynncraft's own item guide is the better source where it has the file - it
 * covers every gathering material under the API's exact key, including the two
 * WynnVentory is missing or files under an older name. It has no ingredients
 * at all though, so WynnVentory still carries those.
 */
const OFFICIAL = 'https://cdn.wynncraft.com/nextgen/itemguide/3.3'
const CDN = 'https://www.wynnventory.com/cdn/icons'
const SKINS = 'https://textures.minecraft.net/texture'
const UA = { 'User-Agent': 'wynn-guide/1.0 (personal use)' }
const DEADLINE = 15_000

/** Ingredients above this never reach a board. */
const LEVEL_CAP = 60
/** The face is 8x8; this is what it gets scaled to on disk. */
const FACE = 64

interface RawItem {
  displayName?: string
  icon?: { format?: string; value?: string | { name?: string } }
}

/** Both sides derive this from the key, so no filename needs storing. */
export function iconFile(key: string): string {
  return key.startsWith('s:') ? `s-${key.slice(2)}.png` : `${key.slice(2)}.webp`
}

/** A skin sheet is a whole character; the item is only ever its face. */
async function faceFromSkin(png: Buffer): Promise<Buffer> {
  const hat = await sharp(png).extract({ left: 40, top: 8, width: 8, height: 8 }).png().toBuffer()
  return sharp(png)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .composite([{ input: hat, top: 0, left: 0 }])
    .resize(FACE, FACE, { kernel: 'nearest' })
    .png()
    .toBuffer()
}

const db = (await (
  await fetch(API, { headers: UA, signal: AbortSignal.timeout(60_000) })
).json()) as Record<string, RawItem>

const byName = new Map<string, RawItem>()
for (const v of Object.values(db)) if (v.displayName) byName.set(v.displayName, v)

const ingredients = JSON.parse(await readFile(INGREDIENTS, 'utf8')) as {
  name: string
  level: number
  drops: unknown[]
}[]
const materials = JSON.parse(await readFile(MATERIALS, 'utf8')) as { name: string }[]

const wanted = [
  ...ingredients.filter((i) => i.drops.length > 0 && i.level <= LEVEL_CAP).map((i) => i.name),
  ...materials.map((m) => m.name),
]

await mkdir(ICON_DIR, { recursive: true })
const index: Record<string, string> = {}

let saved = 0
let cached = 0
let missing = 0

for (const name of wanted) {
  const icon = byName.get(name)?.icon
  if (!icon?.value) {
    missing++
    continue
  }

  const skin = icon.format === 'skin'
  const raw = skin ? (icon.value as string) : ((icon.value as { name?: string }).name ?? '')
  if (!raw) {
    missing++
    continue
  }

  const key = `${skin ? 's' : 'a'}:${raw}`
  const path = resolve(ICON_DIR, iconFile(key))

  if (existsSync(path)) {
    index[name] = key
    cached++
    continue
  }

  const attr = key.slice(2)
  const tries = skin
    ? [`${SKINS}/${attr}`]
    : [`${OFFICIAL}/${attr}.webp`, `${CDN}/${attr}.webp`]

  let got: Buffer | null = null
  for (const src of tries) {
    try {
      const res = await fetch(src, {
        headers: UA,
        redirect: 'manual',
        signal: AbortSignal.timeout(DEADLINE),
      })
      // WynnVentory answers a miss with a redirect to its 404 page rather than
      // a 404, so anything short of a clean 200 counts as absent.
      if (res.status !== 200) continue
      got = Buffer.from(await res.arrayBuffer())
      break
    } catch {
      /* try the next host */
    }
  }

  if (!got) {
    missing++
    console.warn(`  no sprite anywhere for ${name} (${attr})`)
    continue
  }

  await writeFile(path, skin ? await faceFromSkin(got) : got)
  index[name] = key
  saved++
}

await writeFile(INDEX, JSON.stringify(index))
console.log(
  `${Object.keys(index).length} of ${wanted.length} icons: ${saved} downloaded,` +
    ` ${cached} already local, ${missing} with no sprite on either host`,
)
