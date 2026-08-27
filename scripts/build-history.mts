/**
 * Snapshot every material's daily history so the page does not have to fetch
 * it while someone is waiting.
 *
 * This is the expensive half of the board by a wide margin. Measured: a
 * listings call answers in about 0.45s, a history call in 4.4s, and the board
 * needs roughly 220 of the latter - close to a thousand seconds of work that
 * parallelism only partly hides. Moving it here takes a cold render from about
 * two and a half minutes to about twenty seconds.
 *
 * What is lost is freshness of the traffic figures and the price chart, which
 * are daily aggregates anyway - yesterday's total does not change during the
 * day. Live prices still come from the listings endpoint on every regeneration.
 *
 *   npm run build:history
 */
import { writeFileSync } from 'node:fs'

import materials from '../src/data/materials.json' with { type: 'json' }

const API = 'https://www.wynnventory.com/api/trademarket/history'
const UA = { 'User-Agent': 'wynn-guide/1.0 (personal use)' }
const OUT = 'src/data/history.json'
const TIERS = [1, 2, 3]
const DEADLINE = 15_000

interface Raw {
  timestamp?: string
  p50_price?: number | null
  average_mid_80_percent_price?: number | null
  lowest_price?: number | null
  highest_price?: number | null
  total_count?: number | null
}

const out: Record<string, unknown> = {}
let done = 0
let empty = 0

const jobs = (materials as { name: string }[]).flatMap((m) =>
  TIERS.map((tier) => ({ name: m.name, tier })),
)

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

await pool(jobs, 16, async ({ name, tier }) => {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(name)}?tier=${tier}`, {
      headers: UA,
      signal: AbortSignal.timeout(DEADLINE),
    })
    if (res.ok) {
      const raw = (await res.json()) as Raw[]
      const days = raw
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
      if (days.length > 0) out[`${name}|${tier}`] = days
      else empty++
    }
  } catch {
    /* a missing series just means no chart and no traffic figure for that tier */
  }
  if (++done % 100 === 0) console.log(`  ${done}/${jobs.length}`)
})

writeFileSync(OUT, JSON.stringify(out))
console.log(`${Object.keys(out).length} series of ${jobs.length} (${empty} empty) -> ${OUT}`)
