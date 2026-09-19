# Playground

Texture keys: `bg_playground_0` (640 x 400). Hotspots: `src/data/rooms/playground.ts`.


## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 28,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A shady playground under tall trees. A grey metal climbing frame with a slide and a swing on the left, gravel ground, a small white playhouse with black shutters in the background centre, ivy and green bushes on the right, tree trunks, an opening on the far left edge.

## Slide ride backdrop (2026-09-18) — DONE

Texture key `bg_slide` (640 x 400), `public/assets/slide/bg_0.png`. The view down the slide
from its top platform, for `SlideScene`. `/generate-image-v2` at 632x424, seed 71, style
image `intro/house.png`, with `playground/bg_0.png` as the reference ("the same playground,
its palette, its metal slide and trees; this is the view from the top of that slide"). Fitted
with `scripts/fit_room.py slide` (24 rows of sky cropped); the ambient frame it wrote was
deleted, the ride uses one frame. Raw render kept in `raw/slide_bg_s1.png`.

> (global style) The view from the top of a tall grey metal playground slide looking straight
> down it: the slide's smooth bed fills the bottom centre of the image and narrows with
> perspective toward its far end near the middle of the image, with raised metal rails on both
> sides, flat bottom edge at the near end. Beyond the slide's end: brown dirt and gravel ground,
> a small white playhouse with black shutters, green bushes, tall tree trunks and a shady canopy
> of leaves overhead in warm evening light.

The bed in the fitted art runs from y 370 (the platform grate, x 197-442) up to its far end at
y 240 (x 300-342). Those numbers are `SLIDE` in `src/puzzles/slide.ts`; the riders and the
leaves and mud are placed along that trapezoid, and only the moving stripes are drawn in code.
If the art is regenerated, re-measure and update `SLIDE`.

## Ambient (2026-09-18)

- The swing's chains and seat were inpainted out of `bg_0`/`bg_1` (`/inpaint-v3` on a 256x256
  crop at (300,80), seed 112, mask: two 7px strips from (395,100)/(417,100) to the seat and the
  seat rect). A cut-out of the thin chains was too broken to use, so the empty swing is drawn
  in code (`swing` effect: chain tops (396,125) and (418,130) on the underside of the sloping bar, length 108, a half-circle sling seat like the painted swing's) and rocks gently. A sliver of the old seat's outline at (397-413, 241-247) that the mask missed was patched with the gravel below it.
- `ambient/leaf.png`: three 16x16 leaves (seed 107, candidates 7, 6, 34) drifting down here and
  on the slide ride.
