"use client";

import { useEffect, useState } from "react";

import { advise } from "@/lib/advice";
import { idRange, idSign, money, when } from "@/lib/format";
import { CONSUMABLE, idMeta } from "@/lib/ids";
import { FRESH_HOURS, hoursOld, pickBuy } from "@/lib/scoring";
import type { Listing, Priced } from "@/lib/types";

import { PriceChart } from "./PriceChart";
import { Slot } from "./Slot";

interface Sidecar {
 ids: Record<string, unknown>;
 consumable: Record<string, number>;
 cross: { avg30d: number | null } | null;
 open: Listing[];
}

const SHOWN = 5; // only the cheapest few matter when you are buying

const wiki = (name: string) =>
 `https://wynncraft.wiki.gg/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;

/**
 * One item, led by what to do about it.
 *
 * The row already carries prices, history and drops, so this renders at once.
 * The listings are then re-checked live, because the board is two hours old
 * and a cheap stack does not stay up for two hours.
 */
export function DetailPanel({
 row,
 mode,
 builtAt,
 onClose,
}: {
 row: Priced;
 mode: "farm" | "flip";
 /** From the server, so the panel agrees with the row that opened it. The
  * live re-check supplies its own, fresher moment once it lands. */
 builtAt: number;
 onClose?: () => void;
}) {
 const [extra, setExtra] = useState<{
  for: string;
  data: Sidecar;
  at: number;
 } | null>(null);
 const loaded = extra?.for === row.name ? extra.data : null;

 useEffect(() => {
  let live = true;
  fetch(`/api/item?name=${encodeURIComponent(row.name)}`)
   .then((r) => r.json())
   .then((d) => live && setExtra({ for: row.name, data: d, at: Date.now() }))
   .catch(() => {});
  return () => {
   live = false;
  };
 }, [row]);

 // the live re-check wins once it lands, but never blanks the panel
 const open = loaded?.open?.length ? loaded.open : row.open;
 const fresh = Boolean(loaded?.open?.length);
 const shown = open.slice(0, SHOWN);
 const rest = open.length - shown.length;
 const now = extra?.for === row.name ? extra.at : builtAt;
 const plan = advise({ ...row, open }, mode, now);
 // Highlight what the advice actually points at. Highlighting the cheapest
 // would put the badge on an 18-hour-old sighting - the one most likely gone.
 const buy = mode === "flip" ? pickBuy(open, now) : undefined;

 return (
  <div className="flex h-full flex-col">
   <div className="flex items-start gap-3.5 border-b border-line/70 bg-black/25 px-5 py-3">
    <Slot icon={row.icon} alt={row.name} size={44} />
    <div className="min-w-0 flex-1">
     <h2 className="text-[16px] leading-tight font-semibold">
      <a
       href={wiki(row.name)}
       target="_blank"
       rel="noreferrer"
       className="hover:text-tier-1 hover:underline"
      >
       {row.name}
      </a>
     </h2>
     <p className="mt-0.5 text-[12px] text-faint">
      Tier {row.tier} · Level {row.level} · {row.skills.join(", ")}
     </p>
    </div>
    {onClose && (
     <button
      onClick={onClose}
      aria-label="Close"
      className="shrink-0 cursor-pointer border border-line px-2.5 py-1 text-[12.5px] text-muted hover:border-loss hover:text-loss lg:hidden"
     >
      Close
     </button>
    )}
   </div>

   <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
    <div className="grid gap-7">
     {/* the answer, before any of the evidence for it */}
     <section className="border-l-2 border-l-tier-1 bg-white/[0.035] px-4 py-3.5">
      <p className="font-hand text-[19px] leading-snug text-parch">
       {plan.headline}
      </p>
      <div className="mt-2 grid gap-1.5">
       {plan.detail.map((line) => (
        <p key={line} className="text-[13px] leading-relaxed text-muted">
         {line}
        </p>
       ))}
      </div>
     </section>

     <section>
      <H>
       Cheapest listings
       <Note>{fresh ? "live" : "from the last refresh"}</Note>
      </H>
      <div className="grid gap-px overflow-hidden border border-line">
       {shown.map((l, i) => (
        <div
         key={`${l.at}-${i}`}
         className={`flex items-baseline gap-3 px-3 py-2 text-[13px] ${
          l === buy ? "bg-money/10" : "bg-surface"
         }`}
        >
         <span
          className={`tnum w-20 shrink-0 font-semibold ${l === buy ? "text-money" : "text-text"}`}
         >
          {money(l.unit)}
         </span>
         <span className="text-faint">each</span>
         <span className="tnum ml-auto shrink-0 text-muted">
          {l.amount > 1 ? `${l.amount} for ${money(l.total)}` : "single"}
         </span>
         <span
          className={`w-20 shrink-0 text-right text-[11.5px] ${
           stale(l.at, now) ? "text-caution" : "text-faint"
          }`}
          title={
           stale(l.at, now)
            ? "Seen a while ago - bargains go quickly, so this may already be gone"
            : "Seen recently"
          }
         >
          {when(l.at, now)}
         </span>
        </div>
       ))}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-faint">
       {rest > 0
        ? `${rest} more, up to ${money(open[open.length - 1].unit)} each.`
        : "That is everything on the board."}{" "}
       Amber times are sightings older than {FRESH_HOURS} hours; those listings have
       often been bought already. Prices are per ingredient; the quantity beside them is how many that
       seller has.
      </p>
     </section>

     <section>
      <H>
       Price
       <Note>last {row.days.length} days</Note>
      </H>
      <PriceChart days={row.days} />
     </section>

     <section>
      <H>Effects</H>
      {loaded ? (
       <Effects ids={loaded.ids} consumable={loaded.consumable} />
      ) : (
       <div className="grid gap-2.5">
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-5/6 rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
       </div>
      )}
     </section>

     {row.drops.length > 0 && (
      <section>
       <H>Every source</H>
       <div className="grid gap-3">
        {row.drops.map((d) => (
         <div key={d.name}>
          <a
           href={wiki(d.name)}
           target="_blank"
           rel="noreferrer"
           className="text-[13.5px] text-text underline decoration-line underline-offset-2 hover:text-tier-1 hover:decoration-tier-1"
          >
           {d.name}
          </a>
          <div className="tnum mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted">
           {d.spots.slice(0, 8).map((s, i) => (
            <span key={i}>
             {s[0]}, {s[1]}, {s[2]}
            </span>
           ))}
          </div>
         </div>
        ))}
       </div>
      </section>
     )}

     <p className="border-t border-line pt-4 text-[12.5px] leading-relaxed text-faint">
      Prices come from WynnVentory, which is players uploading what they see -
      so the board is what was last seen, not a live feed. Opening an item
      re-checks that one item.
      {loaded?.cross?.avg30d
       ? ` wynnmarket's 30-day average for it is ${money(loaded.cross.avg30d)}.`
       : ""}
     </p>
    </div>
   </div>
  </div>
 );
}

/**
 * Positive and negative are both common on ingredients - most of them trade a
 * penalty for a bonus - so the sign has to be readable without doing the maths.
 * Colour follows benefit rather than sign, which differs for spell cost.
 */
function Effects({
 ids,
 consumable,
}: {
 ids: Record<string, unknown>;
 consumable: Record<string, number>;
}) {
 const rows = [
  ...Object.entries(ids).map(([k, v]) => {
   const m = idMeta(k);
   const n = idSign(v);
   return {
    key: k,
    label: m.label,
    text: idRange(v, m.unit),
    good: m.higherIsBetter ? n > 0 : n < 0,
    zero: n === 0,
   };
  }),
  ...Object.entries(consumable).map(([k, v]) => {
   const m = CONSUMABLE[k] ?? idMeta(k);
   return {
    key: k,
    label: m.label,
    text: idRange(v, m.unit),
    good: v > 0,
    zero: v === 0,
   };
  }),
 ];

 if (rows.length === 0) {
  return (
   <p className="text-[13.5px] text-faint">
    No identifications - this one is pure profit.
   </p>
  );
 }

 return (
  <dl className="grid gap-1.5">
   {rows.map((r) => (
    <div key={r.key} className="flex items-baseline justify-between gap-6">
     <dt
      className={`text-[13.5px] ${r.zero ? "text-faint" : r.good ? "text-money" : "text-loss"}`}
     >
      {r.label}
     </dt>
     <dd
      className={`tnum shrink-0 text-[13.5px] font-medium ${
       r.zero ? "text-faint" : r.good ? "text-money" : "text-loss"
      }`}
     >
      {r.text}
     </dd>
    </div>
   ))}
  </dl>
 );
}

/** A sighting this old is history, not something you can go and buy. */
function stale(at: string, now: number) {
 return hoursOld(at, now) > FRESH_HOURS;
}

function H({ children }: { children: React.ReactNode }) {
 return (
  <h3 className="mb-2.5 flex items-baseline gap-2 font-hand text-[15px] text-parch">
   {children}
  </h3>
 );
}

function Note({ children }: { children: React.ReactNode }) {
 return <span className="tnum font-normal text-faint">· {children}</span>;
}

