---
name: verify-rendering
description: Check what the user can see, not what the server sent
metadata:
  type: feedback
---

A 200 response, `img.complete === true`, and `opacity: 1` are all compatible
with the user seeing nothing.

**Why:** icons in this project passed all three checks while eleven rows looked
empty - the sprites were dark artwork on a dark slot. Separately, a screenshot
taken before paint showed *every* icon missing, which was a false alarm in the
opposite direction. Both times the answer came from sampling actual pixels.

**How to apply:** draw the element to a canvas and measure opaque pixel count
and average colour, or compute the contrast of the computed colour against the
resolved background. When auditing contrast, start the background walk at the
element itself - starting at `parentElement` misses its own background and
invents failures. See [[two-grounds]].
