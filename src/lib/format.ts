
export function day(iso: string): string {
 return new Date(iso).toLocaleDateString("en-US", {
  day: "numeric",
  month: "short",
 });
}

/**
 * An identification value the way the game writes it: signed, with its unit,
 * and as a range when the roll varies.
 */
export function idRange(v: unknown, unit = ""): string {
 const s = (x: number) => `${x > 0 ? "+" : ""}${x}${unit}`;
 if (v && typeof v === "object") {
  const o = v as { min?: number; max?: number };
  const lo = o.min ?? 0;
  const hi = o.max ?? lo;
  return lo === hi ? s(lo) : `${s(lo)} to ${s(hi)}`;
 }
 return s(Number(v));
}

/** The midpoint of a rolled value, for deciding whether it helps or hurts. */
export function idSign(v: unknown): number {
 if (v && typeof v === "object") {
  const o = v as { min?: number; max?: number; raw?: number };
  return o.raw ?? ((o.min ?? 0) + (o.max ?? 0)) / 2;
 }
 return Number(v) || 0;
}

/**
 * How long ago a listing was seen.
 *
 * Takes the moment rather than reading the clock, so the server and the client
 * agree - otherwise every one of these is a hydration mismatch waiting for a
 * minute boundary.
 */
export function when(iso: string, now: number): string {
  const mins = (now - new Date(iso).getTime()) / 60000
  if (!Number.isFinite(mins) || mins < 0) return '-'
  if (mins < 60) return `${Math.round(mins)}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

/**
 * Money at a glance, magnitude in the suffix rather than the digit count.
 *
 * A column holding +$1,687,539 next to +$2,286 encodes 738x as two extra
 * glyphs, and the eye reads width, not digits. Capping at four significant
 * characters and moving the scale into a letter is what every market screen
 * does - TradingView shows 5.07T beside 98 in the same column.
 */
export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`
  if (abs >= 10_000) return `$${(n / 1000).toFixed(0)}k`
  if (abs >= 1_000) return `$${(n / 1000).toFixed(1)}k`
  if (abs >= 1) return `$${Math.round(n)}`
  return `$${n.toFixed(2)}`
}

/**
 * A price, written out in full.
 *
 * The board deals in plain numbers with a dollar sign, never emerald
 * denominations - "24eb" is the game's notation and not what anyone wants to
 * read on a screen that exists to compare prices. Sub-unit prices keep two
 * decimals because gathered materials really do trade at $0.40.
 */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  if (Math.abs(n) < 1 && n !== 0) return `$${n.toFixed(2)}`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

/** How long ago, in the fewest characters that stay honest. */
export function ago(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '-'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 48) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}
