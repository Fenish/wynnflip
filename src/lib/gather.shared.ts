/**
 * Gathering constants the browser needs.
 *
 * Split out of gather.ts because that file is `server-only` - it holds the API
 * key path - and the filter bar runs in the browser.
 */

/**
 * A tier needs this many listings before its price is worth using.
 *
 * Measured, not guessed: across every material, a one-star tier with three or
 * more listings never asks more than 3 emeralds, while thin books run up to 73.
 * Below three, a single mispriced listing can be the whole market.
 *
 * It is still one, not three. The threshold was set against a full board and
 * quietly became a censor on a thin one: Carp Oil trades in game right now at
 * T1:5 T2:2 T3:1 and Malt Grains at T1:2 T2:4 T3:2, so two of three tiers
 * vanished from a screen whose whole promise is "here is what you can sell."
 * A player who can see a listing in the market expects to see it here. The
 * thinness is not hidden by dropping the row - it is reported: LISTED carries
 * the count, SOLD/DAY the traffic, and the panel shows the whole book.
 */
export const MIN_TIER_LISTINGS = 1

export const TIERS = [1, 2, 3] as const
