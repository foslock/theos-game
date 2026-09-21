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

## Ambient (2026-09-18)

- Second hand on the wall clock: centre (596,12), length 13. Dust motes drift in the light from
  the back door. (A swaying-foliage layer behind the door's mullions was tried and dropped: with
  the whole view moving it read as the door moving, not the leaves.)

## Gags in the cupboards (2026-09-20)

Four of the eight containers hold a breakfast item; the rest hold a gag, and the live ones pop
out and leave the kitchen the way that thing would (`GAG_SPECS` in `src/puzzles/breakfast.ts`
says which, `BreakfastController` runs the paths). One static sprite each, deformed and rotated
by tweens: no animation frames.

- `kitchen/gag_frog.png` 24x20 (generate-image-v2, seed 152, candidate 34): lands on the floor
  and hops out of the room, squashing to 1.2x0.8 before each spring. **Drawn facing left**,
  which `faces: 'left'` records, so a leftward hop is the art as drawn and a rightward one is
  mirrored. The batch came out facing the camera rather than side-on.
- `kitchen/gag_mouse.png` 24x16 (seed 161, candidate 2): drops to the floor, tears round one
  circle and bolts past the camera off the bottom, growing as it comes. Drawn facing right
  (nose and eye right, tail trailing left), which `faces: 'right'` records.
- `kitchen/gag_spider.png` 24x20 (seed 164, candidate 26): climbs the wall and off the top of
  the screen. Symmetrical, so no `faces` and it is never mirrored; drawn at `scale: 0.8`.
  The first attempt at 20x16 (seed 162) gave beetles with stubby legs: eight legs plus a body
  need the extra room, and spelling out "four legs left, four legs right, gaps between them"
  is what produced real spiders.
- `kitchen/gag_ball.png` 16x16 (seed 163, candidate 33): bounces away to the left, spinning. A
  two-tone swirl was chosen over a plain ball so the spin is visible; round, so no `faces`.
- Still to draw: `gag_pots` 32x24 (roll) and `gag_socks` 24x20 (flop). `empty` has no sprite
  by design.
- Check a sprite's drawn facing before setting `faces`; getting it backwards makes the thing
  moonwalk out of the room.
