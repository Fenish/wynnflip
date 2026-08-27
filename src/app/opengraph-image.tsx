import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";


/**
 * The card that unfurls when the link is pasted.
 *
 * 1200x630 because that is the 1.91:1 every client crops to; anything else
 * gets letterboxed or cut. It carries a headline and the address rather than
 * the mark alone - a bare logo tells someone who has already heard of the site
 * nothing they did not know, and tells everyone else nothing at all.
 *
 * Built here rather than committed as a PNG so it cannot drift from the site:
 * same fonts, same ground, same parchment strip, all read from this repo.
 */
export const alt =
 "WynnLytics - what to buy, kill and gather on the Wynncraft trade market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const dir = join(process.cwd(), "src/app/_og");
const [hand, body, bodyBold, logo] = await Promise.all([
 readFile(join(dir, "ArchitectsDaughter.ttf")),
 readFile(join(dir, "PlexSans.ttf")),
 readFile(join(dir, "PlexSans-SemiBold.ttf")),
 readFile(join(dir, "logo.png")),
]);

const PARCH = "#baaa80";
const INK = "#412624";

export default function Image() {
 return new ImageResponse(
  /*
   * Parchment rather than the board's dark ground. In a feed of dark embeds a
   * light one stops the scroll, and it is the game's own panel colour, so it
   * reads as Wynncraft rather than as a generic dashboard.
   */
  <div
   style={{
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background: PARCH,
    padding: "0 84px",
    fontFamily: "Plex",
   }}
  >
   {/* eslint-disable-next-line @next/next/no-img-element -- satori */}
   <img
    src={`data:image/png;base64,${logo.toString("base64")}`}
    width={480}
    height={181}
    alt=""
   />

   <div
    style={{
     display: "flex",
     fontFamily: "Hand",
     fontSize: 54,
     color: INK,
     marginTop: 30,
    }}
   >
    What to buy, kill and gather
   </div>

   <div style={{ display: "flex", fontSize: 30, color: "#5d4038", marginTop: 12 }}>
    Every listing on the trade market, ranked by what it pays.
   </div>
  </div>,
  {
   ...size,
   fonts: [
    { name: "Hand", data: hand, style: "normal", weight: 400 },
    { name: "Plex", data: body, style: "normal", weight: 400 },
    { name: "PlexBold", data: bodyBold, style: "normal", weight: 600 },
   ],
  },
 );
}
