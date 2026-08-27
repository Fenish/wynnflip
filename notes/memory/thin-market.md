---
name: thin-market
description: WynnVentory returns nothing for most items at quiet hours; caches must merge, never replace
metadata:
  type: project
---

WynnVentory is players uploading what they see while browsing the trade market,
so at a quiet hour most items return `count: 0`. This is normal, not an outage.

Everything that caches it must **merge**, never replace - `build-listings.mts`
overwrote a full snapshot with an empty one and emptied the whole board. Each
listing carries the timestamp it was seen at, so a stale sighting can be shown
and labelled; that is always better than an absent row.

The same rule applies to filters. Any threshold tuned against a full board
(`MIN_TIER_LISTINGS`, `FRESH_HOURS`) becomes a censor on a thin one. Discount
rather than drop, and let the count columns report the thinness.

See [[verify-rendering]] for the matching habit on the display side.
