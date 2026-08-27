---
name: two-grounds
description: The site has a parchment context and a dark-board context; colours do not cross between them
metadata:
  type: project
---

Two grounds, two palettes:

- **Parchment** `#baaa80` — the header strip only. Text on it is `ink` `#412624`.
- **Board** `#171613` — everything else. Text is `text`/`muted`/`faint`.

`text-ink` on the board is 1.32:1 - invisible. It shipped that way in
`advice.ts` for the "steady" liquidity tier, so every steady row's figure was
unreadable. A token is not neutral; it belongs to a ground.

Sprites are a third case: they are arbitrary artwork, so no flat slot colour
serves them all (they run `#3f3b3a` to `#8eaea3`). They carry a 1px light
drop-shadow instead, which traces a dark sprite and vanishes into a light one.
