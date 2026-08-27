export interface Ingredient {
  name: string;
  tier: number;
  level: number;
  skills: string[];
  ids: Record<string, unknown>;
  consumable: Record<string, number>;
  grid: Record<string, number>;
  drops: { name: string; spots: number[][] }[];
}

/** One day of trade-market aggregates, as WynnVentory reports them. */
export interface MarketDay {
  date: string;
  low: number | null;
  median: number | null;
  trimmed: number | null;
  high: number | null;
  count: number;
}

export interface Trend {
  /** Oldest to newest across days that had traffic. */
  pct: number;
  /** Last three days against the first three - steadier than endpoint to endpoint. */
  recentPct: number;
  /** Biggest single-day ratio; catches data breaks masquerading as price moves. */
  step: number;
  suspect: boolean;
  days: number;
  series: number[];
}

/** One live trade-market listing, reduced to what a buyer cares about. */
export interface Listing {
  /** What one of them costs; the seller sets this directly. */
  unit: number;
  total: number;
  amount: number;
  at: string;
}

export interface Priced {
  name: string;
  tier: number;
  level: number;
  skills: string[];
  icon: string;
  /** All three are per single ingredient, from the live listings. */
  median: number;
  low: number;
  high: number;
  /** Live listings on the board right now - usually a handful. */
  open: Listing[];
  /** Yesterday's traffic from the history feed; the liquidity measure. */
  listings: number;
  mobs: string[];
  spots: number[][];
  trend: Trend | null;
  /** The full series and drop list travel with the row so the detail panel
   * opens with no round trip; only the second-source price loads lazily. */
  days: MarketDay[];
  drops: { name: string; spots: number[][] }[];
  /** flip only: total emeralds if the bought stack all sells just under the
   * next cheapest ask, and the price that ask sits at. */
  gain?: number;
  resell?: number;
  sellable?: number;
  /** How long ago the listing being recommended was actually seen. */
  seenHours?: number;
  score?: number;
}

export interface Board {
  farm: Priced[];
  flip: Priced[];
  gather: GatherRow[];
  scanned: number;
  /** Candidates with no live listing at all - unpriceable, not zero-priced. */
  unlisted: number;
  /** When the board was assembled. Passed down rather than read from the clock
   * during render: the server and the client would disagree, and "seen 6 hours
   * ago" is exactly the kind of boundary that flips between them. */
  builtAt: number;
}

/** A gathering material as the official API describes it. */
export interface Material {
  name: string;
  /** mining | fishing | farming | woodcutting */
  profession: string;
  /** Gathering level the node requires. */
  level: number;
}



/**
 * One thing you can gather and sell.
 *
 * A material and a star tier together, because they are separate products:
 * Redwood Paper at one star goes for 89 and at three stars for 49,606, and
 * nobody sells "Redwood Paper" - they sell the one they happen to have. So the
 * row is what it fetches each and how many of them the market took yesterday,
 * and there is no probability anywhere in it.
 */
export interface GatherRow {
  name: string;
  /** Filename in public/icons, or empty when the game has no sprite for it. */
  icon: string;
  profession: string;
  /** Gathering level the node requires. */
  level: number;
  tier: number;
  /** What one of them sells for - the cheapest ask you would undercut. */
  price: number;
  /** How many are on the board right now. */
  listings: number;
  open: Listing[];
  /** Timestamp of the listing the price came from, so it can be marked. */
  setterAt: string | null;
  /** How many changed hands yesterday. */
  sold: number;
  days: MarketDay[];
  trend: Trend | null;
  /** The same material's other tiers, for context in the panel. */
  siblings: { tier: number; price: number; sold: number }[];
  builtAt: number;
}
