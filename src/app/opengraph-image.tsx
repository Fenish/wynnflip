import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SITE_HOST } from "@/lib/site";

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

const GROUND = "#171613";
const PARCH = "#baaa80";
const INK = "#412624";
const TEXT = "#ece7dc";
const MUTED = "#a49b8a";
const MONEY = "#4fd08a";

export default function Image() {
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
   {/* the same carved parchment strip the site's header sits on */}
   <div style={{ display: "flex", flexDirection: "column" }}>
    <div style={{ height: 14, background: PARCH }} />
    <div style={{ height: 5, background: INK }} />
   </div>

   <div
    style={{
     flex: 1,
     display: "flex",
     flexDirection: "column",
     justifyContent: "center",
     padding: "0 84px",
    }}
   >
    {/* eslint-disable-next-line @next/next/no-img-element -- satori
              renders a bare img; next/image does not exist in this context. */}
    <img
     src={`data:image/png;base64,${logo.toString("base64")}`}
     width={520}
     height={196}
     alt=""
    />

    <div
     style={{
      display: "flex",
      fontFamily: "Hand",
      fontSize: 52,
      color: PARCH,
      marginTop: 34,
     }}
    >
     What to buy, kill and gather
    </div>

    <div
     style={{
      display: "flex",
      fontSize: 30,
      color: MUTED,
      marginTop: 14,
     }}
    >
     Every listing on the Wynncraft trade market, ranked by what it actually
     pays.
    </div>

    <div
     style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      marginTop: 44,
     }}
    >
     <div
      style={{
       display: "flex",
       background: MONEY,
       color: GROUND,
       fontFamily: "PlexBold",
       fontSize: 26,
       padding: "12px 26px",
      }}
     >
      {SITE_HOST}
     </div>
     <div style={{ display: "flex", fontSize: 24, color: TEXT }}>
      Free · updates hourly
     </div>
    </div>
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
