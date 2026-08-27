import { MarketBoard } from '@/components/MarketBoard'
import { board } from '@/lib/board'
import { REVALIDATE_SECONDS } from '@/lib/refresh'

/**
 * Handled by the framework rather than a cron job.
 *
 * Vercel's Hobby plan caps cron at once per day - an hourly expression is
 * rejected at deploy, not merely ignored. Incremental regeneration has no such
 * limit: the first request after the window serves the cached page instantly
 * and rebuilds it in the background, so nobody ever waits on the price pull.
 */
export const revalidate = 3600

// Next reads this export by static analysis and rejects anything that is not a
// literal - `= REVALIDATE_SECONDS` fails the build with "Invalid segment
// configuration export". So the value is written twice and checked once, here,
// while the page module is evaluated during build.
if (revalidate !== REVALIDATE_SECONDS) {
  throw new Error(
    `revalidate (${revalidate}) and REVALIDATE_SECONDS (${REVALIDATE_SECONDS}) ` +
      'have drifted - the header would advertise a cadence the page does not keep.',
  )
}

export default async function Home() {
  return <MarketBoard data={await board()} />
}
