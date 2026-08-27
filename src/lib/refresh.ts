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
