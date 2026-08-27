"use client";

import { useCallback, useState } from "react";

const CDN = "https://www.wynnventory.com/cdn/icons";
const SKINS = "https://textures.minecraft.net/texture";

/** A skin sheet is 64x64; the face is the 8x8 at (8,8), the hat at (40,8). */
const SHEET = 64;
const CELL = 8;

type State = "loading" | "ready" | "failed";

/**
 * Where an icon lives, in the order to try it.
 *
 * `npm run build:icons` puts the whole set under public/icons, so almost every
 * sprite is served from this site. The remote source stays as a fallback for
 * anything the download missed or that the game added since - a new item shows
 * up rather than leaving a hole until someone reruns the script.
 *
 * The filename is derived from the key on both sides, so the index only has to
 * store where the icon came from.
 */
function sources(icon: string): {
 local: string;
 remote: string;
 skin: boolean;
} {
 const skin = icon.startsWith("s:");
 const key = icon.slice(2);
 return {
  local: skin ? `/icons/s-${key}.png` : `/icons/${key}.webp`,
  remote: skin ? `${SKINS}/${key}` : `${CDN}/${key}.webp`,
  skin,
 };
}

/**
 * Track an image that may already have finished, and fall back once.
 *
 * `onLoad` alone is not enough: a cached or very fast image can complete before
 * React attaches the handler, and then the event never arrives - the sprite
 * sits there fully downloaded while the component still thinks it is loading
 * and keeps it hidden. Every request in the network log came back 200 and half
 * the slots were still empty, which was exactly that.
 */
function useImageSource(icon?: string) {
 const [state, setState] = useState<State>("loading");
 const [fallback, setFallback] = useState(false);

 const attach = useCallback((el: HTMLImageElement | null) => {
  if (el?.complete) setState(el.naturalWidth > 0 ? "ready" : "failed");
 }, []);

 const onLoad = useCallback(() => setState("ready"), []);

 // A missing local file is expected, not an error - try the source once.
 const onError = useCallback(() => {
  setFallback((was) => {
   if (was) setState("failed");
   return true;
  });
 }, []);

 if (!icon)
  return {
   state: "failed" as State,
   src: "",
   skin: false,
   attach,
   onLoad,
   onError,
  };

 const { local, remote, skin } = sources(icon);
 return {
  state,
  src: fallback ? remote : local,
  skin,
  attach,
  onLoad,
  onError,
 };
}

/**
 * An item square drawn like an inventory slot.
 *
 * Two shapes of sprite behind one component. A plain webp drops straight in.
 * A Minecraft skin is a whole character sheet, and only the face belongs in the
 * slot, so the local copy is cropped at build time while the remote fallback
 * has to be cropped here in CSS.
 *
 * Nothing loads until it scrolls near the viewport, and a shimmer holds the
 * square's exact size until it does, so the list never jumps.
 */
export function Slot({
 icon,
 alt = "",
 size = 36,
}: {
 icon?: string;
 alt?: string;
 size?: number;
}) {
 const { state, src, skin, attach, onLoad, onError } = useImageSource(icon);
 const inner = Math.round(size * 0.72);
 const cropping = skin && src.startsWith(SKINS);

 return (
  <div className="slot relative" style={{ width: size, height: size }}>
   {icon && state === "loading" && (
    <span
     className="shimmer absolute rounded-[2px]"
     style={{ width: inner, height: inner }}
     aria-hidden
    />
   )}

   {src && state !== "failed" && (
    <>
     {/* eslint-disable-next-line @next/next/no-img-element -- deliberately
              unoptimised: 8x8 pixel sprites, and the image pipeline would blur
              them and proxy every one. */}
     <img
      ref={attach}
      src={src}
      alt={alt}
      width={inner}
      height={inner}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={onError}
      className={`block [image-rendering:pixelated] ${
       state === "ready" && !cropping ? "" : "opacity-0"
      } ${cropping ? "absolute" : ""}`}
     />

     {cropping && state === "ready" && <SkinFace src={src} size={inner} />}
    </>
   )}
  </div>
 );
}

/** The face out of an uncropped skin sheet, using the image already fetched. */
function SkinFace({ src, size }: { src: string; size: number }) {
 const scale = size / CELL;
 const layer = (x: number) => ({
  backgroundImage: `url(${src})`,
  backgroundSize: `${SHEET * scale}px ${SHEET * scale}px`,
  backgroundPosition: `-${x * scale}px -${CELL * scale}px`,
  imageRendering: "pixelated" as const,
 });

 return (
  <span
   className="relative block"
   style={{ width: size, height: size }}
   role="presentation"
  >
   <span className="absolute inset-0" style={layer(CELL)} />
   <span className="absolute inset-0" style={layer(CELL * 5)} />
  </span>
 );
}
