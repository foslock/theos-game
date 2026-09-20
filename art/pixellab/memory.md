# Memory boxes (garage mini-game)

Texture keys: `bg_memory_0` (640 x 400), `box_closed`, `box_open` (64 x 52), `mem_<thing>`
(24 x 24: hammer, wrench, paint, flashlight, ball, tape, bulb, can). Layout: `SHELVES` in
`src/scenes/MemoryScene.ts`; rules: `src/puzzles/memory.ts`.

## The shelf wall (2026-09-20)

`/generate-image-v2` 632x424, seed 44, with the garage art as `--style`:

> (global style) Inside a home garage: a wall of four long empty wooden shelves, one above the
> other, evenly spaced, running the full width of the image, seen straight on, plain beige wall
> behind them, a strip of grey concrete floor along the bottom, the shelves completely empty

Raw render in `art/pixellab/raw/memory_shelves_seed44.png`, fitted the `fit_room.py` way (top 24
rows cropped, 4px edge padding). Shelf top surfaces measure at y 79, 151, 220, 291; boxes stand
with their bottoms 7px below each (`SHELVES.y`), between x 70 and 570.

## Boxes and things

Closed and open box: 64x52, seed 21, candidate 0 of 16 for both (same perspective). Things:
one 24x24 call each (64 candidates), seeds 30-37. Picks: hammer 3, wrench 0, paint 3,
flashlight 4, ball 1, tape 0, bulb 0, can 7.
