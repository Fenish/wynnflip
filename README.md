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
`pnpm-lock.yaml` is the only lockfile, deliberately, and `packageManager` pins
the version so CI resolves it without being told.

`scripts/` is outside the app's `tsconfig.json` on purpose: it is build-time
tooling, and a type error in a data downloader should not stop a deploy of
working app code. It gets checked on its own with `pnpm typecheck:scripts`.

The page is ISR: `revalidate` is one hour, set in `src/lib/refresh.ts` so the
page, the price-fetch TTL and the label in the header cannot disagree. Next
takes the lowest of a route's `revalidate` and any fetch inside it, so those
first two have to be equal - see the comment there. `next.config.ts` raises
`staticPageGenerationTimeout` to 240s because the first render pulls a few
hundred prices before it can draw a row.

## How it stays fresh

Two layers, and only one of them looks after itself.

**Live** — the page regenerates at most hourly, on the first visit after the
window expires; opening an item re-checks that one item against the API with no
cache. Nothing to run, nothing to schedule.

**The committed fallback** — `src/data/*.json` is baked into the deploy and
would otherwise age forever, which matters because it is exactly what the board
falls back to when the feed is quiet. `.github/workflows/` refetches it on a
schedule and pushes only when something moved, which redeploys:

| workflow | when | why that often |
|---|---|---|
| `refresh-data.yml` | every 6h | listings change all day; a run costs ~470 quick calls |
| `refresh-history.yml` | daily, 03:41 | history is daily data and each call is ~4.5s |

Both need `WYNNVENTORY_KEY` as a repository secret. Run either by hand from the
Actions tab.

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
