"use client";

import { gatherSpeed } from "@/lib/advice";
import { money, when } from "@/lib/format";
import { profession, stars } from "@/lib/professions";
import type { GatherRow } from "@/lib/types";

import { PriceChart } from "./PriceChart";
import { ProfIcon } from "./ProfIcon";
import { Slot } from "./Slot";

const wiki = (name: string) =>
 `https://wynncraft.wiki.gg/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;

/**
 * One gathered product: what it sells for, and whether anyone is buying.
 *
 * Everything here comes with the row, so there is nothing to load. The other
 * star tiers of the same material sit at the bottom for context - they are
 * different products at wildly different prices, and it is worth knowing the
 * three-star of the thing in your bag is worth five hundred times the one.
 */
export function GatherPanel({
 row,
 onClose,
}: {
 row: GatherRow;
 onClose?: () => void;
}) {
 const p = profession(row.profession);
 const speed = gatherSpeed(row.sold);

 return (
  <div className="flex h-full flex-col">
   <div className="flex items-start gap-3.5 border-b border-line/70 bg-black/25 px-5 py-3">
    {row.icon ? (
     <Slot icon={row.icon} alt={row.name} size={44} />
    ) : (
     <ProfIcon name={row.profession} size={44} />
    )}
    <div className="min-w-0 flex-1">
     <h2 className="text-[16px] leading-tight font-semibold">
      <a
       href={wiki(row.name)}
       target="_blank"
       rel="noreferrer"
       className="hover:text-tier-1 hover:underline"
      >
       {row.name}
      </a>{" "}
      <span className="text-tier-1">{stars(row.tier)}</span>
     </h2>
     <p className="mt-0.5 text-[12px] text-faint">
      <span className={p.tone}>{p.label}</span> · level {row.level} nodes and
      above
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
     <section className="border-l-2 border-l-tier-1 bg-white/[0.035] px-4 py-3.5">
      <p className="font-hand text-[19px] leading-snug text-parch">
       {p.verb} {row.name} {stars(row.tier)} at {p.label} {row.level}
      </p>
      <div className="mt-2 grid gap-1.5 text-[13px] leading-relaxed text-muted">
       <p>
        List at{" "}
        <span className="tnum font-semibold text-money">
         {money(row.price)}
        </span>{" "}
        each - that is the cheapest anyone is asking, and you have to go under
        it to sell today. Ten of them is{" "}
        <span className="tnum text-money">{money(row.price * 10)}</span>, a
        hundred is{" "}
        <span className="tnum text-money">{money(row.price * 100)}</span>.
       </p>
       <p className={speed.tone}>{speed.line}</p>
      </div>
     </section>

     <section>
      <H>
       What is on the board
       <Note>{row.listings} listings</Note>
      </H>
      <div className="grid gap-px overflow-hidden border border-line">
       {row.open.map((l, i) => {
        const sets = l.at === row.setterAt;
        return (
         <div
          key={`${l.at}-${i}`}
          className={`flex items-baseline gap-3 px-3 py-1.5 text-[13px] ${
           sets ? "bg-money/10" : "bg-surface"
          }`}
         >
          <span
           className={`tnum w-20 shrink-0 font-medium ${sets ? "text-money" : ""}`}
          >
           {money(l.unit)}
          </span>
          <span className="text-faint">each</span>
          <span className="tnum ml-auto shrink-0 text-muted">
           {l.amount > 1 ? `${l.amount} for ${money(l.total)}` : "single"}
          </span>
          <span className="w-16 shrink-0 text-right text-[11.5px] text-faint">
           {when(l.at, row.builtAt)}
          </span>
         </div>
        );
       })}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-faint">
       Prices are per item; the quantity beside them is how many that seller
       has. The highlighted row is where the price above comes from.
      </p>
     </section>

     {row.days.length > 1 && (
      <section>
       <H>
        Price
        <Note>last {row.days.length} days</Note>
       </H>
       <PriceChart days={row.days} />
      </section>
     )}

     {row.siblings.length > 0 && (
      <section>
       <H>The other tiers of this material</H>
       <div className="grid gap-px overflow-hidden border border-line">
        {row.siblings.map((s) => (
         <div
          key={s.tier}
          className="flex items-baseline gap-3 bg-surface px-3 py-1.5 text-[13px]"
         >
          <span className="w-10 shrink-0 text-tier-1">{stars(s.tier)}</span>
          <span className="tnum font-medium">{money(s.price)}</span>
          <span className="text-faint">each</span>
          <span className={`tnum ml-auto ${gatherSpeed(s.sold).tone}`}>
           {s.sold.toLocaleString("en-US")} sold/day
          </span>
         </div>
        ))}
       </div>
      </section>
     )}

     <p className="border-t border-line pt-4 text-[12.5px] leading-relaxed text-faint">
      A material and a star tier are separate products with separate markets, so
      each has its own price and its own traffic. Prices come from WynnVentory,
      which is players uploading what they see on the board, not a live feed.
     </p>
    </div>
   </div>
  </div>
 );
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
