"use client";

import { useId, useState } from "react";

import { day } from "@/lib/format";
import { THIN_DAY } from "@/lib/scoring";
import type { MarketDay } from "@/lib/types";

import { Money, useMoney } from "./Denomination";

// Sized close to the width it actually renders at, so strokes, dots and text
// are not scaled up into thick chunky shapes.
const W = 700;
const H = 200;
const VOL_H = 28;
const PAD = { top: 16, right: 14, bottom: 22, left: 58 };
const GAP = 12; // between the price plot and the volume strip

/**
 * Price over time with listing volume beneath it.
 *
 * The frame borrows the game's chest window - lit top-left, shadowed
 * bottom-right, inset against the panel - and the readout on hover is drawn
 * like an item tooltip, so the chart sits in the same world as the slots above
 * it without giving up an axis or a legible number.
 *
 * Volume is not decoration: a day priced off two sightings is worth nothing,
 * and putting the bar directly under the point is the most direct way to say
 * so. Thin days are drawn hollow and amber for the same reason.
 */
export function PriceChart({ days }: { days: MarketDay[] }) {
 const { money } = useMoney();
 const id = useId();
 const [hover, setHover] = useState<number | null>(null);

 // history() is newest-first; a chart reads left to right through time
 const series = [...days].reverse().filter((d) => d.median !== null);
 if (series.length < 2) {
  return (
   <div className="flex h-[120px] items-center justify-center border border-line text-[13px] text-faint">
    Not enough days to chart
   </div>
  );
 }

 const min = Math.min(...series.map((d) => d.median!));
 const max = Math.max(...series.map((d) => d.median!));
 const span = max - min || 1;

 const plotW = W - PAD.left - PAD.right;
 const plotH = H - PAD.top - PAD.bottom - VOL_H - GAP;
 const x = (i: number) => PAD.left + (i / (series.length - 1)) * plotW;
 const y = (v: number) => PAD.top + plotH - ((v - min) / span) * plotH;

 const line = series
  .map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.median!)}`)
  .join(" ");
 // Fill under the line, never over it. The high-low band used to be drawn as
 // a shape and it swallowed the line whenever the spread was wide, which on
 // this market is most days.
 const under = `${line} L${x(series.length - 1)},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`;

 const maxVol = Math.max(...series.map((d) => d.count), 1);
 const volTop = H - PAD.bottom - VOL_H;
 const barW = Math.min(16, (plotW / series.length) * 0.55);

 const activeIdx = hover ?? series.length - 1;
 const active = series[activeIdx];
 const ticks = [max, min + span / 2, min];

 return (
  <figure className="m-0">
   {/* Above the frame on purpose: floated over the plot it covered the top
      gridline and the very day it was describing. */}
  <div className="mb-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12.5px]">
   <span className="mr-auto text-muted">{day(active.date)}</span>
   <span className="tnum font-semibold text-money">
    <Money value={active.median} />
   </span>
   <span className="tnum text-faint">
    <Money value={active.low} /> &ndash; <Money value={active.high} />
   </span>
   <span
    className={`tnum ${active.count < THIN_DAY ? "text-caution" : "text-faint"}`}
   >
    {active.count} listings{active.count < THIN_DAY && " · thin"}
   </span>
  </div>

  <div className="relative border border-line bg-black/25 px-1 pt-1 pb-0.5">
    <svg
     viewBox={`0 0 ${W} ${H}`}
     className="block w-full"
     role="img"
     aria-label={`Listing price over the last ${series.length} days, ${money(min)} to ${money(max)}.`}
     onMouseLeave={() => setHover(null)}
    >
     <defs>
      <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stopColor="var(--color-money)" stopOpacity="0.20" />
       <stop offset="100%" stopColor="var(--color-money)" stopOpacity="0" />
      </linearGradient>
     </defs>

     {/* a price to read the line against, not just a shape */}
     {ticks.map((v, i) => {
      const ty = PAD.top + (i / (ticks.length - 1)) * plotH;
      return (
       <g key={i}>
        <line
         x1={PAD.left}
         y1={ty}
         x2={W - PAD.right}
         y2={ty}
         stroke="var(--color-line)"
         strokeWidth="1"
         shapeRendering="crispEdges"
        />
        <text
         x={PAD.left - 8}
         y={ty + 3.5}
         textAnchor="end"
         className="tnum fill-[var(--color-faint)] text-[10.5px]"
        >
         {compact(v)}
        </text>
       </g>
      );
     })}

     <path d={under} fill={`url(#${id}-band)`} />
     <path
      d={line}
      fill="none"
      stroke="var(--color-money)"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
     />

     {/* ties the point under the cursor to its volume bar */}
     <line
      x1={x(activeIdx)}
      y1={PAD.top - 6}
      x2={x(activeIdx)}
      y2={volTop + VOL_H}
      stroke="var(--color-line-strong)"
      strokeWidth="1"
      strokeDasharray="2 3"
      shapeRendering="crispEdges"
     />

     {series.map((d, i) => {
      const thin = d.count < THIN_DAY;
      const r = i === activeIdx ? 4 : 2.5;
      // squares, not circles - the only nod to the game's geometry that
      // does not cost precision
      return (
       <rect
        key={d.date}
        x={x(i) - r}
        y={y(d.median!) - r}
        width={r * 2}
        height={r * 2}
        fill={thin ? "var(--color-surface)" : "var(--color-money)"}
        stroke={thin ? "var(--color-caution)" : "var(--color-money)"}
        strokeWidth="1.5"
        shapeRendering="crispEdges"
       />
      );
     })}

     {/* a floor for the bars to stand on; without it they read as loose dots */}
     <line
      x1={PAD.left}
      y1={volTop + VOL_H}
      x2={W - PAD.right}
      y2={volTop + VOL_H}
      stroke="var(--color-line)"
      strokeWidth="1"
      shapeRendering="crispEdges"
     />

     {/* volume: how many listings that day's price was read from */}
     {series.map((d, i) => {
      const h = (d.count / maxVol) * VOL_H;
      const thin = d.count < THIN_DAY;
      return (
       <rect
        key={`v${d.date}`}
        x={x(i) - barW / 2}
        y={volTop + (VOL_H - h)}
        width={barW}
        height={Math.max(2, h)}
        fill={thin ? "var(--color-caution)" : "var(--color-line-strong)"}
        opacity={i === activeIdx ? 1 : 0.65}
        shapeRendering="crispEdges"
       />
      );
     })}

     {/* generous hit areas rather than the 5px squares themselves */}
     {series.map((d, i) => (
      <rect
       key={`h${d.date}`}
       x={x(i) - plotW / series.length / 2}
       y={0}
       width={plotW / series.length}
       height={H}
       fill="transparent"
       onMouseEnter={() => setHover(i)}
      />
     ))}

     <text
      x={PAD.left}
      y={H - 6}
      className="fill-[var(--color-faint)] text-[11px]"
     >
      {day(series[0].date)}
     </text>
     <text
      x={W - PAD.right}
      y={H - 6}
      textAnchor="end"
      className="fill-[var(--color-faint)] text-[11px]"
     >
      {day(series[series.length - 1].date)}
     </text>
    </svg>

   </div>
  </figure>
 );
}

/** Axis labels have no room for six digits. */
function compact(n: number): string {
 // One decimal below ten thousand, or a flat market prints "3k" twice and the
 // axis stops meaning anything.
 if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
 if (n >= 10_000) return `${Math.round(n / 1000)}k`;
 if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
 return String(Math.round(n));
}
