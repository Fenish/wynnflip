# Four things nobody could see

**Date:** 2026-08-27

A full contrast audit of the running page, then fixes. All values are against
the ground the element actually sits on.

| what | was | now |
|---|---|---|
| `--color-faint` (SEEN, listing counts, header labels) | 3.24 | 5.09 |
| inactive tab labels `text-ink/65` | 2.55 | 4.53 |
| data age `text-ink/55` | 3.07 | 4.53 |
| `text-ink` for the "steady" tier, on the dark board | **1.32** | 6.58 |

The last one was a token used against the wrong ground - see
`notes/memory/two-grounds.md`.

**Dark sprites on a dark slot.** Eleven rows in Kill mobs looked empty. Every
image was 200, complete, `opacity: 1`. Sampling the pixels: Corruption Shard
averages `#3f3b3a` against a `#2a261f` slot - 1.36:1. No flat fill helps, since
the sprites run to `#8eaea3` and Minecraft's own slot grey loses those instead.
Fixed with `drop-shadow(0 0 1px rgb(236 231 220 / .5))` on the sprite.

**The panel could go blank.** Picking a gather row and then narrowing the filter
left `chosen` pointing at an excluded row, so the aside rendered nothing. Now
the row object resolves first and the key derives from it, falling back to the
head.

**Dead code.** `Spark.tsx` (56 lines) was orphaned when the sparkline column
went away, kept alive only by an unused import in `Ledger.tsx`. Removed; a copy
is in the session scratchpad since this repo has no git.

## After

Three tabs plus a filtered state, 7,700+ elements: zero below WCAG AA.
Production build clean, 51s.

## Note to self

There is still no git repository here. A cleanup regex destroyed
`MarketBoard.tsx` earlier in this work and it had to be rewritten from nothing.

## Later: responsive, measured rather than eyeballed

Rendering the page in same-origin iframes at a set width turned out to be the
way to test this - the extension's `resize_window` did not move the viewport,
and a screenshot cannot tell you a container is 67px too wide.

| width | before | after |
|---|---|---|
| 320 | header overflowed 141px | 0 |
| 375 | header overflowed 86px | 0 |
| 640 | flip table overflowed 67px | 0 |
| 1024 | flip table overflowed 135px | 0 |
| 1100 | flip table overflowed 59px | 0 |

Three fixes: the header wraps its tabs onto their own line below `sm`; flip got
a tight `sm` tier so ten columns fit in 579px before widening at `md`; and the
side panel now waits for 1200px instead of 1024.

The guard added to `LedgerRow` caught its own author within a minute - it used
`Children.count`, which sees a fragment as one child, so it reported 4 cells
against 10 columns. It counts through fragments now.

## After

Three tabs x nine widths from 320 to 1920: no horizontal scroll anywhere.
6,452 elements checked for contrast: none below AA. Build clean.
