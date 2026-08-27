import { profession } from "@/lib/professions";

/**
 * A tool per gathering profession, drawn rather than downloaded.
 *
 * Materials have no sprite anywhere public: the wiki has no page or file for
 * them, and the official API reports only `profession.grainBarley` - the name
 * of a model inside Wynncraft's resource pack, with no URL and no texture hash
 * (some ingredients do carry a hash, materials never do). So these are drawn
 * on a 16-unit grid with crisp edges, which at least belongs in the same world
 * as the pixel sprites beside them.
 */
const TOOLS: Record<string, string[]> = {
 // pickaxe: head across the top, handle down to the right
 mining: [
  "M3 4h2v1H3z",
  "M5 3h6v1H5z",
  "M11 4h2v1h-2z",
  "M7 5h2v1H7z",
  "M8 6h1v2H8z",
  "M9 8h1v2H9z",
  "M10 10h1v3h-1z",
 ],
 // rod angled up, line dropping to a float
 fishing: [
  "M3 12h2v1H3z",
  "M5 10h2v2H5z",
  "M7 8h2v2H7z",
  "M9 6h2v2H9z",
  "M11 5h1v2h-1z",
  "M11 8h1v3h-1z",
  "M10 11h3v2h-3z",
 ],
 // a wheat stalk
 farming: [
  "M7 12h2v2H7z",
  "M7 8h2v4H7z",
  "M5 5h2v2H5z",
  "M9 5h2v2H9z",
  "M5 8h2v2H5z",
  "M9 8h2v2H9z",
  "M7 3h2v2H7z",
 ],
 // axe: blade left, handle down the right
 woodcutting: [
  "M4 3h4v1H4z",
  "M3 4h5v1H3z",
  "M3 5h5v1H3z",
  "M4 6h4v1H4z",
  "M8 4h2v1H8z",
  "M9 5h1v3H9z",
  "M10 8h1v5h-1z",
 ],
};

export function ProfIcon({ name, size = 36 }: { name: string; size?: number }) {
 const p = profession(name);
 const paths = TOOLS[name] ?? [];

 return (
  <span
   className="slot shrink-0"
   style={{ width: size, height: size }}
   title={p.label}
  >
   <svg
    viewBox="0 0 16 16"
    width={Math.round(size * 0.72)}
    height={Math.round(size * 0.72)}
    shapeRendering="crispEdges"
    role="img"
    aria-label={p.label}
    className="block"
   >
    {paths.map((d, i) => (
     <path key={i} d={d} fill="currentColor" className={p.tone} />
    ))}
   </svg>
  </span>
 );
}
