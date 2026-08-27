
import { pickBuy, sellFloor } from './scoring'
import type { Priced } from './types'

/**
 * How to write a price.
 *
 * Passed in rather than imported so this prose follows the reader's choice of
 * plain numbers or emerald denominations. It is the same figure either way.
 */
export type Fmt = (n: number | null | undefined) => string

/**
 * Turning the numbers into an instruction.
 *
 * A row that says "377 sold/day, 7,138" makes you do the reasoning. The point
 * of the tool is to have done it already: go here, buy this, list it at that.
 * Everything in this file is that translation, and nothing else in the app
 * should invent its own wording for it.
 *
 * A listing quotes a price per item, so the price you can get is simply the
 * cheapest one on the board - you undercut it. The median is what patient
 * sellers hope for, not what today pays.
 */

/** How easily you can actually turn the thing back into emeralds. */
export function liquidity(perDay: number): { word: string; tone: string; line: string } {
  const n = perDay.toLocaleString('en-US')
  if (perDay >= 500)
    return { word: 'sells fast', tone: 'text-money', line: `Sells fast - ${n} sold yesterday.` }
  if (perDay >= 200)
    return { word: 'steady', tone: 'text-muted', line: `Sells steadily - ${n} sold yesterday.` }
  return {
    word: 'slow',
    tone: 'text-caution',
    line: `Slow mover - only ${n} sold yesterday, so expect to wait.`,
  }
}

export interface Advice {
  /** The instruction, in one line, for the list. */
  headline: string
  /** The reasoning, for the detail panel. */
  detail: string[]
  figureLabel: string
}

/**
 * Buying: someone has posted a stack for roughly what one costs. You buy it
 * and become the cheapest seller.
 */
export function flipAdvice(row: Priced, now: number, money: Fmt): Advice {
  // Chosen here rather than taken from the row: the panel re-fetches listings
  // live and re-sorts them by price, which would otherwise hand back the stale
  // cheap stack the ranking had already rejected.
  const buy = pickBuy(row.open, now) ?? row.open[0]
  const resell = sellFloor(row.open.filter((l) => l !== buy))
  const sellable = Math.max(1, Math.min(buy.amount, Math.floor(row.listings / 3)))
  const per = resell - buy.unit
  const leftover = buy.amount - sellable

  return {
    headline: `Buy ${buy.amount} at ${money(buy.unit)}, relist at ${money(resell)}`,
    detail: [
      `The next cheapest seller wants ${money(resell)}, so undercut them and you clear ${money(per)} on each one.`,
      `Yesterday ${row.listings.toLocaleString('en-US')} of these changed hands across the whole market. You will not get all of that - ${sellable.toLocaleString('en-US')} is a fair day's share, about ${money(per * sellable)}.` +
        (leftover > 0
          ? ` The other ${leftover.toLocaleString('en-US')} keep for the days after.`
          : ''),
      `Search the market for ${row.name} and sort by price. You want the ${money(buy.total)} listing${buy.amount > 1 ? ` — all ${buy.amount} of them` : ''}, which may not be the first one on screen.`,
    ],
    figureLabel: "a day's share",
  }
}

/** Farming: where to stand, and what one drop really fetches today. */
export function farmAdvice(row: Priced, money: Fmt): Advice {
  const where = row.mobs[0]
  const spot = row.spots[0]
  const at = spot ? `${spot[0]}, ${spot[1]}, ${spot[2]}` : null
  const floor = sellFloor(row.open)
  const patient = row.median > floor * 1.4

  return {
    headline: where ? `Kill ${where}${at ? ` at ${at}` : ''}` : 'No known source',
    detail: [
      where
        ? `${where} drops these${at ? `, around ${at}` : ''}.`
        : `Nothing in the official data says what drops these.`,
      `List at about ${money(floor)} - the cheapest anyone is asking, and you have to go under it to sell today.`,
      patient
        ? `Half the market is asking ${money(row.median)} or more, so holding out is worth real emeralds if you are not in a hurry.`
        : `The rest of the board sits close behind at ${money(row.median)}, so waiting gains little.`,
    ],
    figureLabel: 'per drop, sold today',
  }
}

export function advise(
  row: Priced,
  mode: 'farm' | 'flip',
  now: number,
  money: Fmt,
): Advice {
  return mode === 'flip' ? flipAdvice(row, now, money) : farmAdvice(row, money)
}

/**
 * Below this many trades a day, expect to sit on it.
 *
 * Shared with the gather filter so the checkbox hides exactly the rows the
 * list marks "slow" - a filter that draws a different line from the label
 * beside it is worse than none.
 */
export const SLOW_BELOW = 50;

/**
 * How fast a gathering material moves.
 *
 * Deliberately a different scale from `liquidity` above. Ingredients that a
 * mob drops trade in the hundreds a day; a three-star material trades in the
 * tens, because only one gather in a hundred produces one. Judging both by the
 * same numbers would mark every rare tier as dead when it is merely rare.
 */
export function gatherSpeed(perDay: number): { word: string; tone: string; line: string } {
  const n = perDay.toLocaleString('en-US')
  if (perDay >= 300)
    return { word: 'moves fast', tone: 'text-money', line: `${n} of these sold yesterday.` }
  if (perDay >= SLOW_BELOW)
    return { word: 'steady', tone: 'text-muted', line: `${n} sold yesterday - it moves, but not quickly.` }
  if (perDay > 0)
    return {
      word: 'slow',
      tone: 'text-caution',
      line: `Only ${n} sold yesterday. You may be holding these a while.`,
    }
  return {
    word: 'no trades',
    tone: 'text-loss',
    line: 'Nothing traded yesterday, so there is no sign anyone is buying.',
  }
}
