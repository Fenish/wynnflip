"use client";

import {
 createContext,
 useCallback,
 useContext,
 useMemo,
 useSyncExternalStore,
} from "react";

import { decompose, emeraldText, type Unit } from "@/lib/emeralds";
import { compact as dollarCompact, money as dollarMoney } from "@/lib/format";

/**
 * Which way to write a price.
 *
 * Every figure on this board is a count of emeralds, so this is two spellings
 * of one number rather than a conversion. Plain numbers compare at a glance -
 * $360 against $4,200 is one subtraction - while denominations are what a
 * player actually types into a trade window. Neither is right for both jobs,
 * so it is a switch.
 */
export type Denom = "number" | "emerald";

/*
 * Renamed with the project. The old key is not migrated: it holds one boolean
 * that a reader can set again in a click, and carrying a dead name forward to
 * avoid that is not worth it.
 */
const KEY = "wynnflip:denom";

interface Ctx {
 denom: Denom;
 setDenom: (d: Denom) => void;
 /** A price written out in full, for prose and single figures. */
 money: (n: number | null | undefined) => string;
 /** The short form a table column has room for. */
 compact: (n: number | null | undefined) => string;
}

const DenomContext = createContext<Ctx | null>(null);

/**
 * The choice lives in localStorage, which makes it an external store rather
 * than React state - so React reads it as one.
 *
 * Reading it into `useState` from an effect would work, but it paints the
 * default first and then immediately re-renders, and it leaves a second tab
 * showing the old spelling. `useSyncExternalStore` has a server snapshot for
 * the prerender, a client snapshot after hydration, and the `storage` event
 * keeps other tabs in step for free.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
 listeners.add(cb);
 window.addEventListener("storage", cb);
 return () => {
  listeners.delete(cb);
  window.removeEventListener("storage", cb);
 };
}

/**
 * Where the choice lives when localStorage will not have it.
 *
 * A private window throws on both read and write, and without this the switch
 * would be inert there: the write fails, the read still says "number", and
 * clicking does nothing. It holds for the visit and is forgotten after.
 */
let fallback: Denom = "number";

function readDenom(): Denom {
 try {
  const saved = localStorage.getItem(KEY);
  return saved === "emerald" || saved === "number" ? saved : fallback;
 } catch {
  return fallback;
 }
}

/** The server cannot know, so it renders the default and hydration agrees. */
const serverDenom = (): Denom => "number";

export function DenomProvider({ children }: { children: React.ReactNode }) {
 const denom = useSyncExternalStore(subscribe, readDenom, serverDenom);

 const setDenom = useCallback((d: Denom) => {
  fallback = d;
  try {
   localStorage.setItem(KEY, d);
  } catch {
   /* not persisted, but `fallback` holds it for this visit */
  }
  // `storage` only fires in *other* tabs, so this one is told directly
  listeners.forEach((cb) => cb());
 }, []);

 const value = useMemo<Ctx>(
  () => ({
   denom,
   setDenom,
   money: denom === "emerald" ? emeraldText : dollarMoney,
   compact: denom === "emerald" ? emeraldText : dollarCompact,
  }),
  [denom, setDenom],
 );

 return <DenomContext.Provider value={value}>{children}</DenomContext.Provider>;
}

export function useMoney(): Ctx {
 const ctx = useContext(DenomContext);
 if (!ctx) throw new Error("useMoney needs a DenomProvider above it");
 return ctx;
}

/* ------------------------------------------------------------------ icons */

/**
 * The four denominations, as the game draws them.
 *
 * Emerald, Emerald Block, Liquid Emerald and a stack of those. LE really is a
 * bottle in Wynncraft rather than a gem, which is not something you would
 * guess, so these are the real sprites rather than anything invented here.
 *
 * Rendered nearest-neighbour: they are 32px pixel art shown at a third of that
 * and smoothing turns them to mush.
 */
export function UnitMark({ unit, size = 13 }: { unit: Unit; size?: number }) {
 return (
  // 32px pixel art at 13px; next/image would proxy and resample it for no gain
  // eslint-disable-next-line @next/next/no-img-element
  <img
   src={`/icons/currency/${unit}.png`}
   alt=""
   width={size}
   height={size}
   className="inline-block [image-rendering:pixelated]"
   aria-hidden
  />
 );
}

/**
 * A figure with the game's own marks beside each unit.
 *
 * In number mode there is nothing to draw, so this is the plain string.
 */
export function Money({
 value,
 plus = false,
 className = "",
}: {
 value: number | null | undefined;
 /**
  * Mark a gain with a leading +. Only in number mode: the denominations
  * already read as a quantity, and a + in front of a row of icons is noise.
  */
 plus?: boolean;
 className?: string;
}) {
 const { denom, money } = useMoney();

 if (denom !== "emerald")
  return (
   <span className={className}>
    {plus ? "+" : ""}
    {money(value)}
   </span>
  );

 const parts = decompose(value);
 if (!parts) return <span className={className}>-</span>;

 // mark first, then the count - the unit is what you are looking for and the
 // number only means something once you know which unit it is counting
 return (
  // The gap between parts has to beat the gap inside one by enough to group
  // them: at 6px against 2px a count ran straight into the next unit's mark,
  // so `12eb` and `50e` read as one number.
  <span
   className={`inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap ${className}`}
  >
   {parts.map((p) => (
    <span key={p.unit} className="inline-flex shrink-0 items-center gap-1">
     <UnitMark unit={p.unit} />
     {Number.isInteger(p.count)
      ? p.count.toLocaleString("en-US")
      : p.count.toFixed(2)}
    </span>
   ))}
  </span>
 );
}

/**
 * A finished sentence, with the denominations in it marked up.
 *
 * The advice prose is built in a plain .ts module that knows nothing about
 * React, so rather than turn it into a component tree this finds the amounts
 * it already wrote - `5eb`, `40e`, `2stx` - and swaps each for its mark and
 * count. In number mode there is nothing to find and the string passes
 * through untouched.
 *
 * The pattern needs the unit suffix, so the bare numbers in the same sentence
 * ("Buy 168 at ...", "297 of these changed hands") are left alone.
 */

export function Prose({ children }: { children: string }) {
 const { denom } = useMoney();
 if (denom !== "emerald") return <>{children}</>;

 const out: React.ReactNode[] = [];
 let last = 0;
 let m: RegExpExecArray | null;
 // Built per call rather than shared at module scope: a global regex carries
 // lastIndex between calls, and resetting it from inside a component is a
 // write to state React does not own. The word boundary keeps it off words
 // that merely start with a unit's letters.
 const token = /(\d[\d,]*(?:\.\d+)?)(stx|le|eb|e)\b/g;

 while ((m = token.exec(children)) !== null) {
  if (m.index > last) out.push(children.slice(last, m.index));
  out.push(
   <span
    key={`${m.index}-${m[2]}`}
    className="inline-flex items-center gap-0.5 align-[-2px]"
   >
    <UnitMark unit={m[2] as Unit} />
    {m[1]}
   </span>,
  );
  last = m.index + m[0].length;
 }
 if (last < children.length) out.push(children.slice(last));

 return <>{out}</>;
}

/* ----------------------------------------------------------------- switch */

/**
 * The toggle itself.
 *
 * Two labelled halves rather than a checkbox: a switch with one label makes
 * the reader work out which state means what, and both spellings deserve a
 * name.
 */
export function DenomSwitch() {
 const { denom, setDenom } = useMoney();

 return (
  <div
   role="radiogroup"
   aria-label="Price format"
   /* On the dark board now, so it is drawn the way the filter chips are:
      a hairline that firms up on the half you are on. */
   className="flex shrink-0 self-center overflow-hidden rounded border border-line"
  >
   {(
    [
     ["number", "$", "Plain numbers"],
     ["emerald", null, "Emerald denominations"],
    ] as const
   ).map(([value, label, title]) => (
    <button
     key={value}
     role="radio"
     aria-checked={denom === value}
     title={title}
     onClick={() => setDenom(value)}
     className={`grid h-6 w-7 cursor-pointer place-items-center text-[12px] transition-colors ${
      denom === value
       ? "bg-line-strong/60 text-text"
       : "text-faint hover:bg-white/[0.04] hover:text-muted"
     }`}
    >
     <span className="sr-only">{title}</span>
     {/* the game's own mark, the way `$` stands for the other spelling */}
     {label ?? <UnitMark unit="e" size={13} />}
    </button>
   ))}
  </div>
 );
}
