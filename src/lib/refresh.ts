/**
 * How often the board regenerates, in one place.
 *
 * The page's `revalidate` and the label in the header both read this, so the
 * chrome cannot end up claiming a cadence the page does not keep - it said
 * "every 2h" for a while after the window moved to one hour.
 */
export const REVALIDATE_SECONDS = 3600

/** The same interval, written the way the header says it. */
export const REVALIDATE_LABEL =
  REVALIDATE_SECONDS % 3600 === 0
    ? `${REVALIDATE_SECONDS / 3600}h`
    : `${Math.round(REVALIDATE_SECONDS / 60)}m`

/**
 * How long a single price fetch stays cached, in seconds. The same window as
 * the page, and that is not a coincidence - it has to be.
 *
 * Next takes the LOWEST of a route's `revalidate` and any fetch inside it, so
 * the two numbers are not independent:
 *
 *   fetch > page  the page rebuilds while the fetches are still cached, and
 *                 every other rebuild emits byte-identical output. This is
 *                 what shipped: 2h fetches under a 1h page, so half the
 *                 regenerations carried nothing new.
 *   fetch < page  Next lowers the whole route to the fetch window and the page
 *                 rebuilds more often than anyone asked - setting this to half
 *                 the page window turned an hourly page into a 30-minute one
 *                 and doubled the calls to a small community API.
 *   equal         the fetches expire exactly when the page comes to rebuild.
 */
export const PRICE_TTL_SECONDS = REVALIDATE_SECONDS
