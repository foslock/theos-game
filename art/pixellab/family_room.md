# Family Room

Texture keys: `bg_family_room_0`, `bg_family_room_1` (640 x 400). Hotspots: `src/data/rooms/familyRoom.ts`.

## Prompt

> (global style) A comfortable family room with a big couch, a television on a wooden stand, a bookshelf on the left wall, a rug, a coffee table, and a toy bus on the floor near the right. A doorway on the left and a door to the garage on the right.

## Frame 1 variation

> TV static flickers; lamp glint moves.

## Must be visible

- Couch (centre-left) with a cushion gap where the kitchen door key hides
- TV (centre-right), bookshelf (left)
- Floor spot near x=490, y=315 for the toy bus sprite
- Left doorway (kitchen), right door (garage)

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 23,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A comfortable family room. White built-in bookshelves full of colourful books on the left wall, a fireplace with a gold framed painting above it, a big red and white checked armchair and a yellow couch with cushions, a wide flat television on a white cabinet centre-right, a bay window with a window seat, a round wooden coffee table, a blue rug on a wooden floor, a toy bus on the floor near the right. An open doorway on the far left edge and a door on the far right edge.

## 2026-09-18 — floor patch removed

The prompt asked for "a toy bus on the floor near the right", so the render had one baked in.
It had been painted out at some point, leaving a rectangle of floorboards at (512,266)-(578,315)
whose diagonal seams did not line up with the surrounding floor — visible as a lighter panel
under the `toy_bus` pickup. Repaired with `/inpaint-v3` on a 512x400 crop (x 128-640) and pasted
back into both frames, which are byte-identical in that rectangle. The pickup sprite itself was
always clean; only the background was wrong.
