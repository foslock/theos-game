# Kitchen

Texture keys: `bg_kitchen_0`, `bg_kitchen_1` (640 x 400). Hotspots: `src/data/rooms/kitchen.ts`.

## Prompt

> (global style) A warm family kitchen. Along the left wall: three upper cabinets in a row, a counter with three drawers and one lower cabinet below, a toaster on the counter. A tall refrigerator centre-left. A back door with a window in the centre. A round breakfast table with two chairs on the right. A wall clock top right. Stairs up on the far left, an open doorway on the far right.

## Frame 1 variation

> Clock hand moves; light through the back door window flickers.

## Must be visible

- 3 upper cabinets, 3 drawers, 1 lower cabinet, fridge (all must read as openable)
- Back door in the centre (locked until the key is found)
- Table on the right where Lucy sits
- Left stairs (bedroom) and right doorway (family room)

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 22,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A bright white family kitchen. On the left wall a tall stainless steel double oven, then a row of three white upper cabinets, a white counter with three drawers and one lower cabinet under it, a toaster on the counter. A big stainless steel refrigerator centre-left. A white back door with many glass panes in the centre showing green trees. A wooden breakfast table with two wooden chairs on the right. A round wall clock top right. A staircase going up on the far left edge, an open doorway on the far right edge. Light wood floor.
