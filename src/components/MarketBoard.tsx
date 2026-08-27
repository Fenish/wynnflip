"use client";

import { useEffect, useMemo, useState } from "react";

import { SLOW_BELOW } from "@/lib/advice";
import { ago } from "@/lib/format";
import { REVALIDATE_LABEL } from "@/lib/refresh";
import type { Board, GatherRow } from "@/lib/types";

import { DetailPanel } from "./DetailPanel";
import { ALL_LEVELS, GatherFilters, type GatherFilter } from "./GatherFilters";
import { GatherPanel } from "./GatherPanel";
import {
 FARM_COLS,
 FARM_GRID,
 FLIP_COLS,
 FLIP_GRID,
 GATHER_COLS,
 GATHER_GRID,
 GatherLedgerRow,
 ItemRow,
 LedgerHead,
} from "./Ledger";

type Mode = "farm" | "flip" | "gather";

const MODES: Record<Mode, { tab: string; lead: string }> = {
 flip: {
  tab: "Buy a stack",
  lead:
   "The cheapest listing on the board against what the next seller is asking. Buy it and undercut them.",
 },
 farm: {
  tab: "Kill mobs",
  lead:
   "Ranked by what one drop fetches if you undercut to sell it today. Every price is for a single ingredient.",
 },
 gather: {
  tab: "Gather nodes",
  lead:
   "Every material and star tier as its own product, ranked by what one sells for. A star tier is a separate market with its own price and its own traffic.",
 },
};

const EMPTY: Record<Mode, { head: string; body: string }> = {
 flip: {
  head: "Nothing worth buying to resell right now.",
  body: "Every stack on the board is priced too close to the next one to make the trade pay, or nobody has listed one recently enough to send you after it.",
 },
 farm: {
  head: "No drop is worth the trip right now.",
  body: "Nothing that mobs drop is selling for enough to be worth killing them for, at least not at what the market is asking today.",
 },
 gather: {
  head: "Nothing on the gather board right now.",
  body: "No material has a listing to price it against. This happens when the market is quiet rather than when the materials are gone.",
 },
};

const REPO = "https://github.com/Fenish/wynnlytics";

/**
 * GitHub's own mark, inlined.
 *
 * One 18px glyph is not worth an icon dependency, and the header is the only
 * place it appears. `currentColor` so it takes the parchment ink like every
 * other mark in that strip.
 */
function GitHubMark() {
 return (
  <svg
   width="18"
   height="18"
   viewBox="0 0 16 16"
   fill="currentColor"
   aria-hidden
  >
   <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
 );
}

const NO_FILTER: GatherFilter = {
 profs: [],
 maxLevel: ALL_LEVELS,
 tiers: [],
 movingOnly: false,
};

/**
 * What the screen says when there is nothing to say.
 *
 * Three different silences, and telling them apart is the whole point. A
 * filter that excluded everything is the reader's own doing and is undone with
 * one click. An empty board is the market's doing and no amount of clicking
 * fixes it - so it says when to come back instead. The old copy was one line
 * of faint grey that blamed conditions ("too thin to price, sliding, or last
 * seen too long ago") which are no longer why a row is dropped.
 */
function Nothing({
 mode,
 filtered,
 onClear,
}: {
 mode: Mode;
 /** The board has rows; these filters removed all of them. */
 filtered: boolean;
 onClear: () => void;
}) {
 const said = filtered
  ? {
     head: "No material matches these filters.",
     body: "There is plenty on the board - just none of it at this profession, level and star tier together. Widen one of them.",
    }
  : EMPTY[mode];

 return (
  <div className="px-5 pt-10 lg:px-8">
   <div className="max-w-[52ch] border-l-2 border-l-line-strong pl-4">
    <p className="font-hand text-[19px] leading-snug text-parch">
     {said.head}
    </p>
    <p className="mt-2 text-[13px] leading-relaxed text-muted">{said.body}</p>

    {filtered ? (
     <button
      onClick={onClear}
      className="mt-4 cursor-pointer border border-line-strong px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-parch hover:text-parch"
     >
      Clear filters
     </button>
    ) : (
     <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
      Prices come from players running the WynnVentory mod, so the board fills
      up when people are online and thins out overnight. It refreshes every{" "}
      {REVALIDATE_LABEL}.
     </p>
    )}
   </div>
  </div>
 );
}

/** Name and tier together; the name alone matches three rows. */

/** Name and tier together; the name alone matches three rows. */
function gatherKey(row: GatherRow) {
 return `${row.name}|${row.tier}`;
}

/**
 * The board: a ranked table on the left, the chosen row expanded on the right.
 *
 * The columns are the point. Every figure used to live inside a generated
 * sentence, which put no two rows' numbers at the same x-position; comparing
 * like against like down a column is the one thing a market list does that
 * prose cannot. The verbs moved into the header and the numbers lined up.
 */
export function MarketBoard({ data }: { data: Board }) {
 const [mode, setMode] = useState<Mode>("flip");

 // What the panel is showing. Null still resolves to the top row - the page
 // already decided which move is best, and making someone click to see the
 // reasoning behind a conclusion it exists to have reached is the thing it
 // says it avoids.
 const [chosen, setChosen] = useState<string | null>(null);
 // Whether the panel has taken over the screen. Only a real click sets this,
 // so a default selection never hides the list on a narrow one.
 const [opened, setOpened] = useState(false);

 const [filter, setFilter] = useState<GatherFilter>(NO_FILTER);

 // Read the clock after mount, not during render: the page is static, so the
 // server has no idea how long it will sit in the cache before you load it.
 const [now, setNow] = useState<number | null>(null);
 useEffect(() => {
  const tick = () => setNow(Date.now());
  tick();
  const id = setInterval(tick, 60_000);
  return () => clearInterval(id);
 }, []);
 const fetched =
  now === null
   ? "fetched from WynnVentory"
   : `fetched ${ago((now - data.builtAt) / 3_600_000)} ago`;

 const gathering = mode === "gather";

 // Both arrive ranked. flipRank sorts on `score`, which is the gain discounted
 // by how fast the price is falling; re-sorting here on raw `gain` threw that
 // away and lifted sliding markets above steady ones - Weathered Idol at -49%
 // sat above Lunar Shard at -21% for no reason but a bigger headline number.
 const rows = useMemo(
  () => (mode === "farm" ? data.farm : data.flip),
  [data, mode],
 );

 const gather = useMemo(
  () =>
   data.gather.filter(
    (g) =>
     (filter.profs.length === 0 || filter.profs.includes(g.profession)) &&
     (filter.tiers.length === 0 || filter.tiers.includes(g.tier)) &&
     g.level <= filter.maxLevel &&
     (!filter.movingOnly || g.sold >= SLOW_BELOW),
   ),
  [data.gather, filter],
 );

 const pick = (key: string) => {
  setChosen(key);
  setOpened(true);
 };

 // Resolve the object first and derive the key from it, so the highlighted row
 // and the panel cannot disagree. Falling back to the head matters when a
 // filter drops whatever was chosen - resolving the key alone left the panel
 // blank with nothing to say why.
 const material = gathering
  ? (gather.find((g) => gatherKey(g) === chosen) ?? gather[0] ?? null)
  : null;
 const row = gathering
  ? null
  : (rows.find((r) => r.name === chosen) ?? rows[0] ?? null);
 const picked = material ? gatherKey(material) : (row?.name ?? null);
 const empty = gathering ? gather.length === 0 : rows.length === 0;

 useEffect(() => {
  if (!opened) return;
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpened(false);
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
 }, [opened]);

 return (
  <div className="flex h-dvh flex-col">
   {/* One strip of parchment holds the mark and the tabs, the way the game's
          own site puts its nav buttons in the tan bar. The carved frame is
          spent here and nowhere else. */}
   {/* On a phone the three tabs, the mark and the timestamp want 461px and
          have 375, so the tabs drop to their own line rather than pushing the
          document sideways. */}
   <header className="carved relative z-10 flex flex-wrap items-center gap-x-6 bg-parch px-4 lg:px-7">
    <h1 className="flex shrink-0 items-center py-1.5">
     {/* eslint-disable-next-line @next/next/no-img-element -- one local
              asset; next/image would only wrap it. */}
     <img
      src="/logo.webp"
      alt="WynnLytics"
      width={117}
      height={44}
      className="h-9 w-auto sm:h-11"
     />
    </h1>

    <div
     className="order-last flex w-full self-stretch sm:order-none sm:w-auto"
     role="tablist"
    >
     {(Object.keys(MODES) as Mode[]).map((m) => (
      <button
       key={m}
       role="tab"
       aria-selected={mode === m}
       onClick={() => {
        setMode(m);
        setChosen(null);
        setOpened(false);
       }}
       className={`flex-1 cursor-pointer px-2 font-hand text-[15px] whitespace-nowrap transition-colors sm:flex-none sm:px-4 sm:text-[17px] ${
        mode === m
         ? "bg-ground text-parch"
         : "text-ink/85 hover:bg-ink/10 hover:text-ink"
       }`}
      >
       {MODES[m].tab}
      </button>
     ))}
    </div>

    {/* How long ago the board was fetched. This used to be the age of the
        cheapest listing of whichever item happened to sort first, which is
        biased toward the oldest sighting on the board and disagreed with the
        SEEN column two inches below it - the chrome said 5h while the top row
        said 2h. Per-row sighting age is SEEN's job; this is the page's. */}
    <span className="ml-auto self-center text-right text-[11.5px] text-ink/85">
     <span className="tnum">{fetched}</span>
     <span className="hidden sm:inline">
      {" "}· refreshes every {REVALIDATE_LABEL}
     </span>
    </span>

    <a
     href={REPO}
     target="_blank"
     rel="noreferrer"
     title="Source on GitHub"
     /* 40px of tappable area on a phone, where this sits in a wrapped header
        and a thumb has to find it; tightened once there is a cursor. */
     className="grid size-10 shrink-0 place-items-center self-center rounded-sm text-ink/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:size-7"
    >
     <span className="sr-only">Source on GitHub</span>
     <GitHubMark />
    </a>
   </header>

   <div className="flex min-h-0 flex-1">
    <div
     className={`flex min-w-0 flex-col lg:flex-1 ${opened ? "hidden lg:flex" : "flex-1"}`}
    >
     <div className="px-5 pt-4 lg:px-8">
      <p className="max-w-[72ch] text-[13px] leading-relaxed text-muted">
       {MODES[mode].lead}
      </p>

      {gathering && (
       <GatherFilters
        value={filter}
        onChange={setFilter}
        shown={gather.length}
        total={data.gather.length}
       />
      )}
     </div>

     {empty ? (
      <Nothing
       mode={mode}
       filtered={gathering && data.gather.length > 0}
       onClear={() => setFilter(NO_FILTER)}
      />
     ) : (
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-6 lg:px-8">
       <LedgerHead
        cols={gathering ? GATHER_COLS : mode === "flip" ? FLIP_COLS : FARM_COLS}
        grid={gathering ? GATHER_GRID : mode === "flip" ? FLIP_GRID : FARM_GRID}
       />
       {gathering
        ? gather.map((g) => (
           <GatherLedgerRow
            key={gatherKey(g)}
            row={g}
            active={gatherKey(g) === picked}
            onOpen={() => pick(gatherKey(g))}
           />
          ))
        : rows.map((r) => (
           <ItemRow
            key={r.name}
            row={r}
            mode={mode as "farm" | "flip"}
            active={r.name === picked}
            onOpen={() => pick(r.name)}
           />
          ))}
      </div>
     )}
    </div>

    {/* The panel is the same object as a row, picked up: one large tooltip
            rather than a differently-styled sidebar. */}
    {/* Nothing to show means no gutter to show it in - an empty 520px column
        beside an empty list reads as something failing to load. */}
    <aside
     className={`min-w-0 shrink-0 p-3 ${
      opened ? "flex-1 lg:flex-none" : "hidden"
     } ${material || row ? "lg:block" : "lg:hidden"} lg:w-[440px] xl:w-[520px]`}
    >
     {material ? (
      <div className="tip h-full overflow-hidden">
       <GatherPanel row={material} onClose={() => setOpened(false)} />
      </div>
     ) : row ? (
      <div className="tip h-full overflow-hidden">
       <DetailPanel
        row={row}
        mode={mode === "gather" ? "farm" : mode}
        builtAt={data.builtAt}
        onClose={() => setOpened(false)}
       />
      </div>
     ) : null}
    </aside>
   </div>
  </div>
 );
}
