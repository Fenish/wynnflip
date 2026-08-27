import Link from "next/link";

/**
 * Almost every 404 here is a shared link that has gone stale.
 *
 * The board only carries what is currently worth doing, so an item someone
 * linked last week may simply not be on it any more - it has not moved, it
 * stopped qualifying. That is the likely story, so the page tells it rather
 * than shrugging with "page not found".
 *
 * The layout pins the body at h-full / overflow-hidden for the board, which
 * owns its own scrolling; anything else has to scroll itself.
 */
export default function NotFound() {
 return (
  <main className="relative flex h-dvh flex-col items-center justify-center overflow-y-auto bg-ground px-6 text-center">
   {/* The number, big enough to be scenery rather than a label. It sits
          behind everything at a few percent, so it reads as texture the way
          the board's own noise does. */}
   <span
    aria-hidden
    className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-hand text-[38vw] leading-none text-parch/[0.05] sm:text-[26rem]"
   >
    404
   </span>

   <div className="relative flex flex-col items-center">
    {/* The way home. It lifts and brightens on hover so it reads as
        something you can press rather than a letterhead.

        No `motion-reduce:` gate here: globals.css already zeroes every
        transition duration under that setting, so the lift becomes instant
        rather than animated. Suppressing the scale on top of that would take
        away the only hover feedback and leave the mark looking dead. */}
    <Link
     href="/"
     aria-label="Back to the board"
     className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-parch"
    >
     {/* eslint-disable-next-line @next/next/no-img-element -- one local
              asset; next/image would only wrap it. */}
     <img
      src="/logo.webp"
      alt="WynnLytics"
      width={117}
      height={44}
      className="h-12 w-auto opacity-70 transition duration-200 ease-out hover:scale-110 hover:opacity-100 sm:h-16"
     />
    </Link>

    <p className="mt-9 font-hand text-[34px] leading-none text-parch sm:text-[44px]">
     Nothing here.
    </p>

    <p className="mt-5 max-w-[46ch] text-[14px] leading-relaxed text-muted">
     If you followed a link to an item, it has probably just dropped off the
     board. The list only carries what is worth doing right now, so something
     worth flipping last week may not be today.
    </p>

    <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-faint">
     It will come back the next time the market says so.
    </p>

    <Link
     href="/"
     className="mt-9 border border-line-strong px-5 py-2 text-[13px] text-muted transition-colors hover:border-parch hover:bg-white/[0.03] hover:text-parch"
    >
     Back to the board
    </Link>
   </div>

   {/* a thin parchment rule at the foot, the way the header carries one */}
   <span
    aria-hidden
    className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-parch/25"
   />
  </main>
 );
}
