# Backyard

Texture keys: `bg_backyard_0`, `bg_backyard_1` (640 x 400). Hotspots: `src/data/rooms/backyard.ts`.

## Prompt

> (global style) A sunny suburban backyard with a green lawn, a large leafy tree on the right, a sprinkler on the grass, the back door of the house in the centre top, a small wooden playhouse with a tiny mailbox on the far left, and an opening in the hedge on the far right leading to a sport court.

## Frame 1 variation

> Leaves shift in the wind; a bird hops.

## Must be visible

- Back door of the house (top centre)
- Playhouse door (far left) with a small mailbox at x=100, y=240
- Sprinkler (centre-right), tree (right), bird (top-left)
- Hedge gap on the right (sport court)

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 25,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A sunny backyard lawn. A big white two-storey house with black shutters and dormer windows across the top centre, a low stone wall with flower beds and a wooden railing along its deck, wooden back-door steps coming down in the centre, a small white playhouse with a tiny mailbox on the far left, a large leafy tree on the right, a tall green hedge with an opening on the far right edge, a lawn sprinkler on the grass, a small bird on the left. Bright green grass.
