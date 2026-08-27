"use client";

import { Children, Fragment, isValidElement, type ReactNode } from "react";

import { gatherSpeed, liquidity } from "@/lib/advice";
import { ago } from "@/lib/format";
import { profession } from "@/lib/professions";
import { sellFloor } from "@/lib/scoring";
import { stars, tierTone } from "@/lib/tiers";
import type { GatherRow, Priced } from "@/lib/types";

import { Money, useMoney, type Denom } from "./Denomination";
import { Slot } from "./Slot";

/**
 * The board, as a table.
 *
 * Every field used to live inside a generated sentence, which meant no two
 * rows' numbers landed at the same x-position - and comparing like against
 * like down a column is the only thing a market list does that prose cannot.
 * The verbs move into the header, said once, and the figures line up.
 *
 * Magnitude goes in the suffix, not the digit count: +$1.69M beside +$2.3k
 * rather than +$1,687,539 beside +$2,286, which encoded 738x as two glyphs of
 * width. A log-scaled bar was tried behind the profit figure and then under it;
 * at 86px it either fired on the top row alone or read as a link underline, and
 * the suffix was already carrying the magnitude. The sort order carries rank.
 */

/** Liquidity as position and colour, read down the edge without reading a word. */
function Pace({ tone }: { tone: string }) {
 const bg =
  tone === "text-money"
   ? "bg-money"
   : tone === "text-caution"
     ? "bg-caution"
     : "bg-line-strong";
 return <span className={`h-full w-[3px] shrink-0 ${bg}`} aria-hidden />;
}

/** Movement, when the series is trustworthy enough to have one. */
function Trend({ pct, suspect }: { pct?: number; suspect?: boolean }) {
 if (suspect) return <span className="text-[11.5px] text-caution">?</span>;
 if (pct === undefined) return <span className="text-faint">·</span>;
 const tone = pct > 3 ? "text-money" : pct < -3 ? "text-loss" : "text-faint";
 return (
  <span className={`tnum text-[12px] ${tone}`}>
   {/* round first: (-0.4).toFixed(0) is "-0" */}
   {Math.round(pct) > 0 ? "+" : ""}
   {Math.round(pct) === 0 ? 0 : Math.round(pct)}%
  </span>
 );
}

export interface Col {
 label: string;
 /** Numeric columns right-align so their digits stack; words stay left. */
 right?: boolean;
 /**
  * Dropped below `sm`. The full table wants about 535px of fixed columns; a
  * 375px phone would scroll sideways, which is the one thing a table must
  * never do. The columns that survive are the ones the decision needs.
  */
 wide?: boolean;
}

export function LedgerHead({ cols, grid }: { cols: Col[]; grid: string }) {
 const { denom } = useMoney();
 const hide = hideAt(denom);
 return (
  <div
   className={`sticky top-0 z-10 grid items-end gap-x-2 border-b md:gap-x-3 border-line bg-ground/95 pr-2 pb-1.5 text-[10.5px] tracking-wide text-faint ${grid}`}
  >
   {cols.map((c, i) => (
    <span
     key={c.label + i}
     className={`${c.right ? "text-right" : ""} ${c.wide ? hide : ""}`}
    >
     {c.label}
    </span>
   ))}
  </div>
 );
}

function Cell({
 children,
 right,
 wide,
}: {
 children: ReactNode;
 right?: boolean;
 wide?: boolean;
}) {
 const { denom } = useMoney();
 return (
  <span
   className={`truncate ${right ? "text-right" : ""} ${wide ? hideAt(denom) : ""}`}
  >
   {children}
  </span>
 );
}

/**
 * Grid items, counted through fragments.
 *
 * `Children.count` sees a fragment as one child, so the mode branches in a row
 * came back as a single cell - the count has to walk into them the way the
 * grid does.
 */
function countCells(node: ReactNode): number {
 return Children.toArray(node).reduce<number>((n, c) => {
  if (isValidElement(c) && c.type === Fragment)
   return n + countCells((c.props as { children?: ReactNode }).children);
  return n + 1;
 }, 0);
}

/** Shared shell so the header and every row share one grid definition. */
function LedgerRow({
 label,
 grid,
 cols,
 active,
 onOpen,
 children,
}: {
 /** What a screen reader says instead of the loose cells. */
 label: string;
 grid: string;
 /** Only to check the row against the header - see below. */
 cols: Col[];
 active: boolean;
 onOpen: () => void;
 children: ReactNode;
}) {
 // The grid string is shared, so the tracks cannot drift - but which cells
 // vanish below `sm` is written twice, once as `wide` in the column array and
 // once as a prop on each Cell. `display:none` removes a grid item, not a
 // track, so one cell out of step slides every column after it one place left
 // and nothing errors. Count them instead.
 if (process.env.NODE_ENV !== "production") {
  const n = countCells(children);
  if (n !== cols.length)
   throw new Error(
    `Ledger row has ${n} cells, header has ${cols.length} columns. ` +
     `Add or remove the matching Col entry.`,
   );
 }

 return (
  <button
   onClick={onOpen}
   aria-label={label}
   aria-current={active}
   className={`relative grid w-full items-center gap-x-2 border-b md:gap-x-3 border-line/60 py-1.5 pr-2 text-left transition-colors ${grid} ${
    active ? "bg-tip-edge/22" : "hover:bg-white/[0.04]"
   }`}
  >
   {children}
  </button>
 );
}

/**
 * One grid definition per mode, shared by the header and every row so the
 * columns cannot drift apart.
 */
/**
 * Flip caps its own width. The other two modes have a WHERE column with a mob
 * name and coordinates in it, so they use whatever the pane gives them; flip
 * has nothing to put in the middle, and letting ITEM take the slack opened
 * 900px of blank between the name and the first figure at 1920px wide.
 */
/**
 * Every track a share, so the table fills the pane at any width.
 *
 * Fixed numeric tracks meant the slack had to go somewhere: into ITEM, which
 * opened 900px of blank between the name and the first figure, or into a cap,
 * which left the right half of the pane empty. Shares put it in all ten
 * columns at once. The minimums are what the ten need at `sm` (515px of a
 * 592px pane at 640, where fixed tracks overflowed by 67).
 */
/**
 * One grid definition per mode, shared by the header and every row.
 *
 * It has to be per denomination too. Every row is its own grid rather than one
 * container, so the track sizes come from the string alone - use `max-content`
 * and each row measures itself, which drifted the columns 84px to 120px down
 * the table and threw away the only thing a table is for. Emerald mode simply
 * needs wider numeric tracks: three marks and three counts is about 120px
 * where a plain number is 60.
 */
type Grids = Record<Denom, string>;

const FLIP: Grids = {
 number:
  "grid-cols-[3px_26px_minmax(70px,1fr)_74px_58px] " +
  "sm:grid-cols-[3px_26px_minmax(70px,1.7fr)_minmax(52px,1fr)_minmax(52px,1fr)_minmax(40px,0.75fr)_minmax(56px,1fr)_minmax(64px,1.05fr)_minmax(46px,0.8fr)_minmax(34px,0.65fr)] " +
  "md:grid-cols-[3px_28px_minmax(90px,1.7fr)_minmax(58px,1fr)_minmax(58px,1fr)_minmax(44px,0.75fr)_minmax(64px,1fr)_minmax(74px,1.05fr)_minmax(50px,0.8fr)_minmax(38px,0.65fr)]",
 /*
  * Ten columns of denominations want about 733px and `sm` begins at 640, so
  * the full set waits for `md`. The wide cells hide on the same breakpoint -
  * see `hideAt` - or the grid would have five tracks and ten children.
  */
 emerald:
  "grid-cols-[3px_26px_minmax(64px,1fr)_112px_50px] " +
  "md:grid-cols-[3px_28px_minmax(70px,1.3fr)_100px_100px_minmax(38px,0.6fr)_100px_106px_minmax(44px,0.7fr)_minmax(32px,0.6fr)]",
};

const FARM: Grids = {
 number:
  "grid-cols-[3px_26px_minmax(70px,1fr)_74px] sm:grid-cols-[3px_28px_minmax(90px,14rem)_minmax(0,1fr)_84px_62px_74px]",
 emerald:
  "grid-cols-[3px_26px_minmax(70px,1fr)_124px] sm:grid-cols-[3px_28px_minmax(90px,14rem)_minmax(0,1fr)_128px_62px_74px]",
};

const GATHER: Grids = {
 number:
  "grid-cols-[3px_26px_minmax(70px,1fr)_74px_62px] sm:grid-cols-[3px_28px_minmax(90px,16rem)_minmax(0,1fr)_84px_78px_58px]",
 emerald:
  "grid-cols-[3px_26px_minmax(70px,1fr)_124px_58px] sm:grid-cols-[3px_28px_minmax(90px,16rem)_minmax(0,1fr)_128px_78px_58px]",
};

/**
 * Where the columns marked `wide` appear.
 *
 * It has to match the breakpoint the grid string switches on, or `display:
 * none` removes a grid item while its track stays and every column after it
 * slides one place across. Emerald mode needs the extra width, so it waits.
 */
export function hideAt(denom: Denom): string {
 return denom === "emerald" ? "hidden md:block" : "hidden sm:block";
}

/** The grid for a mode, in the spelling the reader has chosen. */
export function gridFor(mode: "farm" | "flip" | "gather", denom: Denom): string {
 return (mode === "flip" ? FLIP : mode === "farm" ? FARM : GATHER)[denom];
}

/* ---------------------------------------------------------------- flip / farm */

export const FLIP_COLS: Col[] = [
 { label: "" },
 { label: "" },
 { label: "ITEM" },
 // The two prices this tab is entirely about. They lived only inside the
 // panel's prose, so "buy at what, list at what" cost a click on every row.
 { label: "BUY", right: true, wide: true },
 { label: "LIST", right: true, wide: true },
 { label: "SPREAD", right: true, wide: true },
 { label: "COST", right: true, wide: true },
 { label: "PROFIT", right: true },
 { label: "TREND", right: true, wide: true },
 { label: "SEEN", right: true },
];
export const FARM_COLS: Col[] = [
 { label: "" },
 { label: "" },
 { label: "ITEM" },
 { label: "WHERE", wide: true },
 { label: "EACH", right: true },
 { label: "TREND", right: true, wide: true },
 { label: "SELLS", right: true, wide: true },
];


export function ItemRow({
 row,
 mode,
 active,
 onOpen,
}: {
 row: Priced;
 mode: "farm" | "flip";
 active: boolean;
 onOpen: () => void;
}) {
 const { money, denom } = useMoney();
 const sells = liquidity(row.listings);
 const buy = row.open[0];
 const spread = row.resell && buy ? row.resell / buy.unit : null;
 const spot = row.spots[0];

 // Read aloud, the row was "Egg Egg 6.1x $114k +$580k +32% 2h, button" - the
 // name twice, and no column attached to any figure. The cells are laid out
 // for the eye; this is the same row laid out for the ear.
 const trend = row.trend?.suspect
  ? "Trend unclear"
  : row.trend
    ? `Price ${row.trend.recentPct > 0 ? "up" : "down"} ${Math.abs(Math.round(row.trend.recentPct))}%`
    : "No trend";
 const label =
  mode === "flip"
   ? `${row.name}. Buy at ${money(buy?.unit)}, list at ${money(row.resell)}. ` +
     `Costs ${money(buy?.total)}, profit ${money(row.gain)}. ${trend}. ` +
     `Last seen ${row.seenHours !== undefined ? ago(row.seenHours) : "unknown"} ago.`
   : `${row.name}. Dropped by ${row.mobs[0] ?? "unknown"}. ` +
     `${money(sellFloor(row.open))} each. ${trend}. ${sells.word}.`;

 return (
  <LedgerRow
   label={label}
   grid={gridFor(mode, denom)}
   cols={mode === "flip" ? FLIP_COLS : FARM_COLS}
   active={active}
   onOpen={onOpen}
  >
    <Pace tone={sells.tone} />
    <Slot icon={row.icon} alt="" size={26} />

    <span className="min-w-0">
     <span className={`block truncate text-[13.5px] ${tierTone(row.tier)}`}>
      {row.name}
     </span>
    </span>

    {mode === "flip" ? (
     <>
      <Cell right wide>
       <span className="tnum text-[12.5px] text-muted">
        {buy ? <Money value={buy.unit} /> : "·"}
       </span>
      </Cell>
      <Cell right wide>
       <span className="tnum text-[12.5px]">
        {row.resell ? <Money value={row.resell} /> : "·"}
       </span>
      </Cell>
      <Cell right wide>
       <span
        className={`tnum text-[12.5px] ${spread && spread > 8 ? "text-caution" : "text-muted"}`}
       >
        {spread ? `${spread.toFixed(1)}×` : "·"}
       </span>
      </Cell>
      <Cell right wide>
       <span className="tnum text-[12.5px] text-muted">
        {buy ? <Money value={buy.total} /> : "·"}
       </span>
      </Cell>
      <span className="text-right">
       <span className="tnum text-[13.5px] font-semibold text-money">
        <Money value={row.gain} plus />
       </span>
      </span>
      <Cell right wide>
       <Trend pct={row.trend?.recentPct} suspect={row.trend?.suspect} />
      </Cell>
      <Cell right>
       <span
        className={`tnum text-[11.5px] ${(row.seenHours ?? 0) > 6 ? "text-caution" : "text-faint"}`}
       >
        {row.seenHours !== undefined ? ago(row.seenHours) : "·"}
       </span>
      </Cell>
     </>
    ) : (
     <>
      <Cell wide>
       <span className="text-[12.5px] text-muted">
        {row.mobs[0] ?? "unknown"}
        {spot && (
         <span className="tnum ml-2 text-faint">
          {spot[0]}, {spot[1]}, {spot[2]}
         </span>
        )}
       </span>
      </Cell>
      <span className="text-right">
       <span className="tnum text-[13.5px] font-semibold text-money">
        <Money value={sellFloor(row.open)} />
       </span>
      </span>
      <Cell right wide>
       <Trend pct={row.trend?.recentPct} suspect={row.trend?.suspect} />
      </Cell>
      <Cell right wide>
       <span className={`text-[11.5px] ${sells.tone}`}>{sells.word}</span>
      </Cell>
     </>
    )}
   </LedgerRow>
 );
}

/* -------------------------------------------------------------------- gather */

export const GATHER_COLS: Col[] = [
 { label: "" },
 { label: "" },
 { label: "ITEM" },
 { label: "WHERE", wide: true },
 { label: "EACH", right: true },
 { label: "SOLD/DAY", right: true },
 { label: "LISTED", right: true, wide: true },
];

export function GatherLedgerRow({
 row,
 active,
 onOpen,
}: {
 row: GatherRow;
 active: boolean;
 onOpen: () => void;
}) {
 const { money, denom } = useMoney();
 const p = profession(row.profession);
 const speed = gatherSpeed(row.sold);
 const label =
  `${row.name}, tier ${row.tier}. ${p.label} level ${row.level} and above. ` +
  `${money(row.price)} each, ${row.sold.toLocaleString("en-US")} sold per day, ` +
  `${row.listings} listed.`;

 return (
  <LedgerRow
   label={label}
   grid={gridFor("gather", denom)}
   cols={GATHER_COLS}
   active={active}
   onOpen={onOpen}
  >
    <Pace tone={speed.tone} />
    <Slot icon={row.icon} alt="" size={26} />

    <span className="min-w-0 truncate text-[13.5px]">
     <span className={tierTone(row.tier)}>{row.name}</span>{" "}
     <span className="text-tier-1">{stars(row.tier)}</span>
    </span>

    <Cell wide>
     <span className="text-[12.5px]">
      <span className={p.tone}>{p.label}</span>{" "}
      <span className="tnum text-faint">{row.level}+</span>
     </span>
    </Cell>

    <span className="text-right">
     <span className="tnum text-[13.5px] font-semibold text-money">
      <Money value={row.price} />
     </span>
    </span>

    <Cell right>
     <span className={`tnum text-[12px] ${speed.tone}`}>
      {row.sold.toLocaleString("en-US")}
     </span>
    </Cell>
    <Cell right wide>
     <span className="tnum text-[11.5px] text-faint">{row.listings}</span>
    </Cell>
   </LedgerRow>
 );
}
