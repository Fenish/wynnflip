"use client";

import { TIERS } from "@/lib/gather.shared";
import { PROFESSIONS, profession, stars } from "@/lib/professions";

export interface GatherFilter {
 /** Empty means every profession. */
 profs: string[];
 /** Highest node level you can actually gather. */
 maxLevel: number;
 /** Star tiers to judge by. Empty means all three. */
 tiers: number[];
 /** Hide anything that barely trades. */
 movingOnly: boolean;
}

export const ALL_LEVELS = 115;

/**
 * Narrowing the board to what you can actually do.
 *
 * The full list is dominated by level 110-115 materials, which is correct and
 * useless if your professions are in the twenties. Profession and level are
 * the two things that decide whether a row is reachable at all, so they go
 * first; the traffic filter is for when you would rather not sit on stock.
 */
export function GatherFilters({
 value,
 onChange,
 shown,
 total,
}: {
 value: GatherFilter;
 onChange: (next: GatherFilter) => void;
 shown: number;
 total: number;
}) {
 const toggle = (key: string) =>
  onChange({
   ...value,
   profs: value.profs.includes(key)
    ? value.profs.filter((p) => p !== key)
    : [...value.profs, key],
  });

 return (
  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
   <div className="flex flex-wrap gap-1.5" role="group" aria-label="Profession">
    {Object.keys(PROFESSIONS).map((key) => {
     const p = profession(key);
     const on = value.profs.includes(key);
     return (
      <button
       key={key}
       onClick={() => toggle(key)}
       aria-pressed={on}
       className={`cursor-pointer rounded border px-2.5 py-1 text-[12.5px] transition-colors ${
        on
         ? `border-tier-1/60 bg-tier-1/10 ${p.tone}`
         : "border-line text-faint hover:border-line-strong hover:text-muted"
       }`}
      >
       {p.label}
      </button>
     );
    })}
   </div>

   <div className="flex gap-1.5" role="group" aria-label="Star tier">
    {TIERS.map((t) => {
     const on = value.tiers.includes(t);
     return (
      <button
       key={t}
       onClick={() =>
        onChange({
         ...value,
         tiers: on
          ? value.tiers.filter((x) => x !== t)
          : [...value.tiers, t],
        })
       }
       aria-pressed={on}
       aria-label={`${t} star`}
       className={`cursor-pointer rounded border px-2 py-1 text-[12.5px] transition-colors ${
        on
         ? "border-tier-1/60 bg-tier-1/10 text-tier-1"
         : "border-line text-faint hover:border-line-strong hover:text-muted"
       }`}
      >
       {stars(t)}
      </button>
     );
    })}
   </div>

   <label className="flex items-center gap-2 text-[12.5px] text-faint">
    Up to level
    <input
     type="range"
     min={1}
     max={ALL_LEVELS}
     step={1}
     value={value.maxLevel}
     onChange={(e) => onChange({ ...value, maxLevel: Number(e.target.value) })}
     className="w-32 accent-[var(--color-tier-1)]"
     aria-label="Highest gathering level"
    />
    <input
     type="number"
     min={1}
     max={ALL_LEVELS}
     value={value.maxLevel}
     onChange={(e) =>
      onChange({
       ...value,
       maxLevel: Math.min(ALL_LEVELS, Math.max(1, Number(e.target.value) || 1)),
      })
     }
     className="tnum w-14 rounded border border-line bg-surface px-1.5 py-0.5 text-center text-text"
     aria-label="Highest gathering level"
    />
   </label>

   <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-faint">
    <input
     type="checkbox"
     checked={value.movingOnly}
     onChange={(e) => onChange({ ...value, movingOnly: e.target.checked })}
     className="accent-[var(--color-tier-1)]"
    />
    Hide slow movers
   </label>

   <span className="tnum ml-auto text-[12px] text-faint">
    {shown} of {total}
   </span>
  </div>
 );
}
