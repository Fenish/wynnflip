# The board emptied itself

**Date:** 2026-08-27

Reported as "Buy a stack is empty, Gather nodes and Kill mobs are broken."
Measured: flip 0 rows, farm 14, gather 42, 225 of 356 items unlisted.

## What it was not

Not the API. `/listings/*` answers 200 and returns
`{count, items, page, page_size, total}` - and `market.ts` already reads
`body.items`, so the envelope was never new. `/history/*` is still a bare array.

The upstream data really was thin at that hour: 9 of 15 sampled items came back
with zero listings. WynnVentory is players uploading what they see while
browsing, so at 4am nobody is browsing.

## Four causes, all ours

**1. The snapshot script overwrote itself empty.** `build-listings.mts` ended in
`writeFileSync(path, JSON.stringify(out))`. Run at a quiet hour it replaced a
full cache with a nearly empty one. It merges now: this run wrote 47 live and
kept 86 from before, for 133. Under the old code it would have written 47 and
destroyed the rest.

**2. The gather board had no fallback at all.** `gatherBoard` went straight to
`materialListings`; an empty response meant no row. That is the 296 -> 42. Added
`src/data/material-listings.json` (`npm run build:gather`), keyed `name|tier`
like the history file, and the fallback resolves per tier - one tier can be live
while the other two are quiet.

**3. `flipRank` dropped any row not sighted within six hours.** Every cached
sighting was ~24h old, so every row fell out and flip showed nothing. `pickBuy`,
used by the panel, already fell back to the cheapest entry - the ranking was
stricter than the thing it fed. It now uses `pickBuy` too and discounts age the
same way `drag` discounts a falling market: `fresh = FRESH_HOURS / age`, floored
at 0.25. Stale rows rank last instead of vanishing, and SEEN was already amber
past six hours.

**4. `MIN_TIER_LISTINGS = 3` had become a censor.** The user could see Carp Oil
and Malt Grains in the game market and not on the site. Measured: Carp Oil
T1:5 T2:2 T3:1, Malt Grains T1:2 T2:4 T3:2 - two of three tiers hidden on each.
The threshold was set against a full board to stop one mispriced listing setting
a price; on a thin board it hid real, tradeable products. Now 1. The thinness is
reported rather than hidden: LISTED carries the count, SOLD/DAY the traffic, and
the panel shows the whole book.

## After

| | before | after |
|---|---|---|
| flip | 0 | 10 |
| farm | 14 | 25 |
| gather | 42 | 322 |
| scanned | 131 | 251 |

Carp Oil and Malt Grains both show all three tiers.

## Note to self

Three separate times this session an icon or an image looked broken in a
screenshot or a DOM probe and was not - the probe ran before the lazy images
settled. Waiting on every on-screen `img`'s load event before counting gave
18 of 18 painted. Stop reading paint state from the first sample.

## Empty states

The old empty copy was one line of faint grey that blamed reasons no longer
true ("too thin to price, sliding, or last seen too long ago" - two of those
three stopped being disqualifiers when stale rows started being discounted
instead of dropped).

Three silences now, and they are different things:

- **A filter excluded everything.** The reader's own doing, undone in one
  click, so it says so and offers **Clear filters**.
- **The board itself is empty** (flip / farm / gather each get their own line).
  Nothing the reader can click fixes it, so instead of a button it explains
  that prices come from players running the mod and the board thins out
  overnight.

Verified all three by rendering them: the filtered one through the real
filters (Woodcutting + three stars + level 1 + hide slow movers = 0 of 322),
and the other two by temporarily raising `MIN_LISTINGS` so the boards emptied
for real, then restoring it and diffing the file back to its backup.

The 520px side panel now collapses when there is nothing selected - an empty
gutter beside an empty list read as something failing to load.
