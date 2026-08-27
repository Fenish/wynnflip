# WynnLytics

A board that tells a Wynncraft player how to make money, in three tabs:
buy an underpriced listing and resell it, kill a mob for a drop worth selling,
or gather a material node.

Prices come from [WynnVentory](https://www.wynnventory.com), which is players
running a mod and uploading what they see on the trade market. It is a live but
uneven feed: the board fills up when people are online and thins out overnight.
Every figure is what was last *seen*, not a tick from an exchange, so each row
carries the age of its sighting.

## Running it

```bash
pnpm install
pnpm dev
```

`WYNNVENTORY_KEY` in `.env.local` unlocks the listings endpoint. Without it the
site still runs, falling back to the committed snapshots under `src/data/`.

## Deploying

Vercel, from this repo. One environment variable:

| name | where |
|---|---|
| `WYNNVENTORY_KEY` | Project → Settings → Environment Variables, all three environments |

Node 22 or newer (declared in `engines`). pnpm is the package manager —
`pnpm-lock.yaml` is the only lockfile, deliberately.

The page is ISR: `revalidate` is one hour, set in `src/lib/refresh.ts` so the
page and the label in the header cannot disagree. `next.config.ts` raises
`staticPageGenerationTimeout` to 240s because the first render pulls a few
hundred prices before it can draw a row.

## Refreshing the committed data

These write into `src/data/` and are the fallback when the live feed is quiet.
Both listing snapshots **merge** rather than replace, so running one at 4am
cannot empty the board.

```bash
pnpm build:listings   # ingredient listings
pnpm build:gather     # material listings, per star tier
pnpm build:charts     # price history (snapshot + history)
pnpm build:icons      # sprites into public/icons
```

## Notes

`notes/` holds the durable context: `memory/` for what must survive into the
next session, `decisions/` for why a choice was made, `journal/` for what
happened on a given day.
