import type { MarketDay, Trend } from './types'

/**
 * Ranking rules. These are plain thresholds - the judgement went into choosing
 * them, not into applying them, so nothing here needs a model at runtime.
 *
 * Two things about this market shape everything below.
 *
 * A listing quotes a price per item and a quantity, so the board is a plain
 * order book in per-item prices. You sell by undercutting, which means the
 * price you can actually get is the cheapest one on it, not the median - the
 * median is what patient sellers hope for.
 *
 * And you cannot sell more than the market buys. A stack of three thousand is
 * not profit times three thousand; it is weeks of listing, if it ever clears.
 */
export const THIN_DAY = 20 // ignore a day with fewer listings than this
export const MIN_LISTINGS = 80 // below this, one player's snapshot
export const FALLING = -12 // percent that counts as a real decline
export const STEP_BREAK = 3 // single-day ratio that means the data broke

/** Fewer open listings than this is not an order book, it is a coincidence. */
export const MIN_OPEN = 5
/** Past this multiple the "bargain" is bulk goods, not a mispriced stack. */
export const MAX_GAP = 25
/** You are one seller among several; a day's trade is not all yours. */
export const SHARE = 1 / 3
/** Past this, a sighting is history rather than something you can go and buy. */
export const FRESH_HOURS = 6

export function hoursOld(at: string, now: number): number {
  return (now - new Date(at).getTime()) / 3_600_000
}

/**
 * The listing worth sending someone after.
 *
 * The cheapest recently-sighted one, not the cheapest outright. The cheapest
 * outright is usually old, and old plus cheap means sold - that is the whole
 * reason it is still sitting at the top of a stale book. Falls back to the
 * cheapest of all only when nothing recent exists, so callers can still show
 * something as long as they say how old it is.
 */
export function pickBuy<T extends Openable>(open: T[], now: number): T | undefined {
  return open.find((l) => hoursOld(l.at, now) <= FRESH_HOURS) ?? open[0]
}

export interface Openable {
  unit: number
  amount: number
  at: string
}

export function trend(days: MarketDay[]): Trend | null {
  const usable = days.filter((d) => d.median && d.count >= THIN_DAY)
  if (usable.length < 3) return null

  // history() hands back newest-first; series reads oldest to newest
  const series = usable.map((d) => d.median!).reverse()
  const oldest = series[0]
  const newest = series[series.length - 1]

  let step = 1
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1]
    const b = series[i]
    if (a && b) step = Math.max(step, Math.max(a, b) / Math.min(a, b))
  }

  const mid = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  const head = mid(series.slice(0, 3))
  const tail = mid(series.slice(-3))

  return {
    pct: ((newest - oldest) / oldest) * 100,
    recentPct: head ? ((tail - head) / head) * 100 : 0,
    step,
    suspect: step > STEP_BREAK,
    days: series.length,
    series,
  }
}

/**
 * The price you would have to list at to sell today.
 *
 * The cheapest thing on the board, plainly. An earlier version divided each
 * listing by its stack size and then had to work around the huge fake bargains
 * that produced; with the arithmetic right there is nothing to work around.
 */
export function sellFloor(open: Openable[]): number {
  if (open.length === 0) return 0;
  return Math.min(...open.map((l) => l.unit));
}

interface Scorable {
  median: number
  low: number
  /** Yesterday's traffic - how many of these the market actually absorbs. */
  listings: number
  open: { unit: number; amount: number; total: number; at: string }[]
  trend: Trend | null
}

/**
 * Worth killing for, ranked by what a drop fetches at the cheap end of the
 * retail listings rather than in the middle of the whole book.
 */
export function farmRank<T extends Scorable>(rows: T[], minListings = MIN_LISTINGS): T[] {
  return rows
    .filter((r) => r.listings >= minListings && r.open.length >= MIN_OPEN)
    .filter((r) => !r.trend || r.trend.recentPct >= FALLING)
    .sort(
      (a, b) =>
        Number(a.trend?.suspect ?? false) - Number(b.trend?.suspect ?? false) ||
        sellFloor(b.open) - sellFloor(a.open),
    )
}

/**
 * Snipe candidates: buy the cheapest listing, then become the cheapest seller.
 *
 * Profit is measured against the next cheapest ask once the bargain is gone -
 * not the median, which no stack ever clears at. The quantity is capped at a
 * share of a day's trade, because a stack of three thousand does not meet
 * three thousand buyers.
 */
export function flipRank<T extends Scorable>(
  rows: T[],
  now: number,
  minListings = MIN_LISTINGS,
): (T & {
  gain: number;
  resell: number;
  sellable: number;
  seenHours: number;
  score: number;
})[] {
  return rows
    .filter((r) => r.open.length >= MIN_OPEN && r.listings >= minListings)
    .filter((r) => !r.trend?.suspect)
    .map((r) => {
      // Prefer something sighted recently - the cheapest entry in the book is
      // usually an old one, and old plus cheap means sold. But a quiet night
      // on a crowdsourced feed used to empty the board entirely, and a
      // sighting from this morning with its age written next to it beats
      // nothing at all. It ranks below anything current instead; see `fresh`.
      const buy = pickBuy(r.open, now);
      if (!buy) return null;

      const rest = r.open.filter((l) => l !== buy);
      const resell = sellFloor(rest);
      const sellable = Math.max(
        1,
        Math.min(buy.amount, Math.floor(r.listings * SHARE)),
      );
      const drag = r.trend
        ? Math.max(0.35, 1 + Math.min(0, r.trend.recentPct / 100))
        : 1;
      // Same shape as `drag`: a stale sighting is not disqualified, it is
      // discounted, and the SEEN column turns amber past the window anyway.
      const age = hoursOld(buy.at, now);
      const fresh =
        age <= FRESH_HOURS ? 1 : Math.max(0.25, FRESH_HOURS / age);

      return {
        ...r,
        // put the listing we are actually recommending at the front
        open: [buy, ...rest],
        gain: (resell - buy.unit) * sellable,
        resell,
        sellable,
        seenHours: hoursOld(buy.at, now),
        score: (resell - buy.unit) * sellable * drag * fresh,
      };
    })
    .filter(
      (r): r is NonNullable<typeof r> =>
        r !== null && r.gain > 0 && r.resell / r.open[0].unit <= MAX_GAP,
    )
    .sort((a, b) => b.score - a.score);
}
