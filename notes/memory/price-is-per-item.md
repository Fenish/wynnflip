---
name: price-is-per-item
description: WynnVentory's listing_price is already per single item, not a lot total
metadata:
  type: project
---

`listing_price` from the WynnVentory API is the price of **one** item. The
`amount` field is how many that seller has. The lot total is
`listing_price * amount`.

Dividing by `amount` produced spreads of 208x-5915x where the real ones are
12x-76x, and the wiki confirms it: the market lets a seller pick per-item
pricing with the emerald icon. See [[verify-rendering]] for the habit that
would have caught this sooner.
