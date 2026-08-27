import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

import { board } from "@/lib/board";
import { decompose, type Unit } from "@/lib/emeralds";
import { money } from "@/lib/format";
import { findBySlug, MODES, type ShareMode } from "@/lib/share";

/**
 * The unfurl card for one row.
 *
 * The item is the subject, so it gets the sprite and the price gets the size;
 * the mark sits in the corner. Everything is read from the same `board()` the
 * page reads, so a shared card cannot quote a number the page disagrees with.
 *
 * Cached on the same window as the board, and it has to be. These handlers are
 * static by default, but reading `params` and pulling live prices makes this
 * one dynamic - so every crawler hit rebuilt it and Vercel answered
 * `x-vercel-cache: MISS` every time. A warm rebuild is about 1.5s; a cold one
 * measured 17s, well past the few seconds an unfurler waits before giving up
 * and showing no image at all. An hour also means a card can never be older
 * than the numbers printed on it.
 */
export const revalidate = 3600;

export const alt = "An item on the Wynncraft trade market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const og = join(process.cwd(), "src/app/_og");
const coin = join(process.cwd(), "public/icons/currency");
const [hand, body, bold, logo, star, mE, mEb, mLe, mStx] = await Promise.all([
 readFile(join(og, "ArchitectsDaughter.ttf")),
 readFile(join(og, "PlexSans.ttf")),
 readFile(join(og, "PlexSans-SemiBold.ttf")),
 readFile(join(og, "logo.png")),
 readFile(join(og, "star.png")),
 readFile(join(coin, "e.png")),
 readFile(join(coin, "eb.png")),
 readFile(join(coin, "le.png")),
 readFile(join(coin, "stx.png")),
]);

const uri = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;
const LOGO = uri(logo);
const STAR = uri(star);
const MARK: Record<Unit, string> = {
 e: uri(mE),
 eb: uri(mEb),
 le: uri(mLe),
 stx: uri(mStx),
};

const GROUND = "#171613";
const PARCH = "#baaa80";
const INK = "#412624";
const TEXT = "#ece7dc";
const MUTED = "#a49b8a";
const MONEY = "#4fd08a";
/** White, yellow, magenta, cyan - the game's own rarity ladder. */
const TIER = ["#ffffff", "#ffff55", "#ff55ff", "#55ffff"];

/**
 * The item's own sprite, as a data URI.
 *
 * The board stores where an icon came from rather than a filename, the same
 * way `Slot` does, and the files are webp - which satori will not draw - so
 * they are decoded to PNG here. A miss just leaves the slot empty rather than
 * failing the card.
 */
async function spriteFor(icon: string): Promise<string | null> {
 if (!icon) return null;
 const key = icon.slice(2);
 const file = icon.startsWith("s:")
  ? join(process.cwd(), "public/icons", `s-${key}.png`)
  : join(process.cwd(), "public/icons", `${key}.webp`);
 try {
  const png = await sharp(await readFile(file))
   .resize(160, 160, { kernel: "nearest", fit: "contain" })
   .png()
   .toBuffer();
  return uri(png);
 } catch {
  return null;
 }
}

/**
 * A bare `img`, and it has to be.
 *
 * The lint rule warns about LCP and bandwidth, neither of which exists here:
 * this tree is never sent to a browser. Satori walks it on the server to
 * rasterize a PNG, and it understands a small subset of HTML - `next/image`
 * emits a srcset, a loader and a wrapper it cannot read, so the card would
 * come out empty. Every src here is already an inlined data URI besides.
 */
const Img = (p: { src: string; w: number; h: number }) => (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={p.src} width={p.w} height={p.h} alt="" />
);

export default async function Image({
 params,
}: {
 params: Promise<{ mode: string; slug: string }>;
}) {
 const { mode, slug } = await params;
 const m = (MODES.includes(mode as ShareMode) ? mode : "flip") as ShareMode;
 const data = await board();
 const id = decodeURIComponent(slug);

 const g = m === "gather" ? findBySlug(data.gather, id, true) : undefined;
 const i =
  m === "gather"
   ? undefined
   : findBySlug(m === "flip" ? data.flip : data.farm, id, false);

 const name = g ? g.name : (i?.name ?? "WynnFlip");
 const tier = g ? g.tier : (i?.tier ?? 0);
 const price = g ? g.price : i?.open[0]?.unit;
 const sprite = await spriteFor(g ? g.icon : (i?.icon ?? ""));
 /*
  * Flip is a different story from the other two. Gather and farm say "this is
  * worth X"; flip says "buy at X, list at Y, keep the difference". So the gain
  * takes the size and the two prices sit under it, rather than reusing the
  * same layout with one number swapped out.
  */
 const isFlip = m === "flip" && Boolean(i);
 const hero = isFlip ? i!.gain : price;
 const resell = isFlip ? i!.resell : undefined;
 const parts = decompose(hero) ?? [];

 const under = g
  ? `${g.sold.toLocaleString("en-US")} sold yesterday`
  : i && !isFlip
    ? `Dropped by ${i.mobs[0] ?? "unknown"}`
    : "";

 return new ImageResponse(
  <div
   style={{
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: GROUND,
    fontFamily: "Plex",
   }}
  >
   <div style={{ display: "flex", flexDirection: "column" }}>
    <div style={{ height: 14, background: PARCH }} />
    <div style={{ height: 5, background: INK }} />
   </div>

   <div
    style={{
     flex: 1,
     display: "flex",
     alignItems: "center",
     gap: 56,
     padding: "0 84px",
    }}
   >
    {sprite && (
     <div
      style={{
       display: "flex",
       background: "#2a261f",
       border: "4px solid #494236",
       padding: 22,
      }}
     >
      <Img src={sprite} w={168} h={168} />
     </div>
    )}

    <div style={{ display: "flex", flexDirection: "column" }}>
     <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
       style={{
        display: "flex",
        fontSize: 40,
        color: TIER[tier] ?? TIER[0],
       }}
      >
       {name}
      </div>
      {/* drawn rather than typed: no font here has U+2726 and satori
                  puts a tofu box where the glyph should be */}
      <div style={{ display: "flex", gap: 4 }}>
       {Array.from({ length: g ? g.tier : 0 }, (_, k) => (
        <Img key={k} src={STAR} w={30} h={30} />
       ))}
      </div>
     </div>

     {hero !== undefined && (
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
       <div
        style={{
         display: "flex",
         fontFamily: "PlexBold",
         fontSize: 100,
         color: MONEY,
        }}
       >
        {isFlip ? `+${money(hero)}` : money(hero)}
       </div>
       {isFlip && (
        <div style={{ display: "flex", fontSize: 30, color: MUTED }}>
         a stack
        </div>
       )}
      </div>
     )}

     {isFlip && price !== undefined && resell !== undefined && (
      <div
       style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 34,
        marginTop: 6,
       }}
      >
       <div style={{ display: "flex", color: MUTED }}>buy</div>
       <div style={{ display: "flex", color: TEXT }}>{money(price)}</div>
       <div style={{ display: "flex", color: MUTED }}>&#8594;</div>
       <div style={{ display: "flex", color: MUTED }}>list</div>
       <div style={{ display: "flex", color: TEXT }}>{money(resell)}</div>
      </div>
     )}

     {parts.length > 0 && (
      <div
       style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        marginTop: 4,
       }}
      >
       {parts.map((p) => (
        <div
         key={p.unit}
         style={{ display: "flex", alignItems: "center", gap: 7 }}
        >
         <Img src={MARK[p.unit]} w={32} h={32} />
         <div style={{ display: "flex", fontSize: 32, color: MUTED }}>
          {Number.isInteger(p.count)
           ? p.count.toLocaleString("en-US")
           : p.count.toFixed(2)}
         </div>
        </div>
       ))}
      </div>
     )}

     {under && (
      <div
       style={{
        display: "flex",
        fontSize: 30,
        color: TEXT,
        marginTop: 18,
       }}
      >
       {under}
      </div>
     )}
    </div>
   </div>

   <div style={{ display: "flex", padding: "0 84px 46px" }}>
    <Img src={LOGO} w={200} h={80} />
   </div>
  </div>,
  {
   ...size,
   fonts: [
    { name: "Hand", data: hand, style: "normal", weight: 400 },
    { name: "Plex", data: body, style: "normal", weight: 400 },
    { name: "PlexBold", data: bold, style: "normal", weight: 600 },
   ],
  },
 );
}
