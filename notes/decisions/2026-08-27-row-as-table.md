# The row becomes a table

**Date:** 2026-08-27
**Decision:** ranked table with named columns, replacing generated sentences.

## What changed

Every figure used to live inside prose, so no two rows put a number at the same
x-position. Comparing like against like down a column is the one thing a market
list does that prose cannot. The verbs moved into the header, said once.

Three fields the data already had and the screen never showed: **SPREAD** (Egg
6.1x against a 1.4x median), **COST** (the headline move wants $114k up front),
and **TREND** (Soul Stone -44%, Weathered Idol -49% were sitting quietly in the
list). Magnitude moved into the suffix: `+$580k` beside `+$2.3k` rather than
`+$1,687,539` beside `+$2,286`, which spent two glyphs of width on a 738x gap.

## The critics

Five agents reviewed the pre-table design. Two findings were real and were
fixed: `mc-inset` used twice and defined zero times (the chart frame never
rendered), and an unused IBM Plex Mono downloading three weights.

`floor2` objected that `sellFloor` taking the minimum of the remaining listings
overstates the resale price. Checking Egg's book directly, $522 has 2,737 units
of real depth, so the objection does not hold for the headline case - but it
does hold in general: one single-unit listing can set the floor. **Unresolved,
and worth revisiting.**

The other three produced no finding that survived checking. A sixth agent was
asked to verify the redesign and went idle without reporting, as did all five
of the others when prompted a second time.

## Kept score

Objections raised: 11. Changed the design: 2. This ratio says the review was
mostly ceremony - the defects that mattered came from measuring the running
page, not from asking another model to have opinions about it.

## Rejected: a magnitude bar on the profit column

Built twice. As a fill behind the figure it only ever showed on the top row,
because the cell is 86px and the bar is a share of it. As a rule under the
figure it read as a link underline, and rows 2-9 were 30px, 21px, 17px - a
distinction nobody can see. Removed both times. The k/M suffix already carries
magnitude and the sort order already carries rank.

## Round two: the verify agent's report

It arrived after this file was first written, and it earned its keep. Four of
its findings were already fixed by the time it landed (contrast, the dangling
selection, the orphaned `Spark`, the comment promising a bar that did not
exist). Four more were real, measured, and are now fixed:

1. **`MarketBoard.tsx` re-sorted the board on raw `gain`**, throwing away
   `flipRank`'s `score = gain x drag` - the deliberate discount on falling
   markets. Measured on live data: 4 of 11 rows moved, and every move lifted a
   sliding market above a steady one (Weathered Idol -49% above Lunar Shard
   -21%, Lucky Spider Egg -12% above Wolf Fang +4%). `drag` and `score` were
   computed on every request and then discarded. Deleted the re-sort.

2. **907px of nothing in every flip row** at 1920px. ITEM was `minmax(90px,1fr)`
   with no filler, so the name column ate the pane; farm and gather cap ITEM and
   have a WHERE column with real content. Fixed by capping the table and adding
   the two numbers the tab is actually about - see below.

3. **Horizontal scroll from 1024 to ~1180px**, measured at 135px and 59px. The
   panel and the full table cannot both fit there. `--breakpoint-lg` moved to
   1200px so the panel appears only when there is room; below it the list runs
   full width and a row opens the drawer, which already worked.

4. **The data age contradicted the rows below it.** `asOf` was
   `priced[0]?.open[0]?.at` - the cheapest listing of whichever item sorted
   first, biased old and frozen at build time. The chrome said "5h" while SEEN
   said "2h" on the same screen. Now the chrome reports how long ago the board
   was fetched, read from a clock after mount so it grows as the ISR page ages.

Also from that report, all confirmed: `lang="tr"` on an English page, `-0%` for
any trend in (-0.5, 0), two `stars()` with different floors, stars yellow in the
row and cyan in the panel, and four dead exports.

**Revised score.** Objections across all six agents: 11 + 11. Changed the
design: 2 + 8. The second pass was worth running - but only because it read the
source and computed positions rather than looking at a screenshot and having
opinions. The three findings that mattered most were arithmetic.

## Accepted: BUY and LIST columns

The 907px void needed content, and the two prices the tab exists to report -
buy at what, list at what - were only ever in the panel's prose. So the flip
row now reads `Egg | $33 | $201 | 6.1x | $114k | +$580k | +32% | 3h`, and the
table caps at 830px instead of stretching.

This is the same width problem the rejected magnitude bar was trying to solve,
answered with data instead of decoration.

**Reversed once.** The first fix capped the table at 830px, which fixed the void
inside the rows and replaced it with an empty right half of the pane - the user
called it immediately. Fixed tracks force that choice: the slack has to land in
ITEM or in a margin. Every track is a share now, so it lands in all ten columns
and the table fills the pane at any width. The `minmax` floors are what the ten
columns need at 640px, where fixed tracks overflowed by 67.

## Not fixed

`sellFloor` still takes the minimum of the remaining listings, so a single-unit
listing can set the resale price. Egg's book has real depth at its floor, so the
headline case is sound, but the general objection stands. Next session.
