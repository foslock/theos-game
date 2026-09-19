# Bathroom

Texture keys: `bg_bathroom_0`, `bg_bathroom_1` (640 x 400). Hotspots: `src/data/rooms/bathroom.ts`.

## Prompt

> (global style) A small bright bathroom with pale blue tiles, a toilet on the left, a sink with a round mirror in the centre, a bathtub on the right with a yellow rubber duck on its edge, a doorway on the far right.

## Frame 1 variation

> Dripping tap; duck bobs one pixel.

## Must be visible

- Toilet (left), sink and mirror (centre), rubber duck (right)
- Right doorway back to the bedroom

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 21,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A small bright bathroom with white walls and pale blue tiles. A white toilet on the left, a white pedestal sink with a round mirror above it in the centre, a white bathtub on the right with a yellow rubber duck sitting on its edge, a fluffy blue bath mat on the floor, a small window. An open doorway on the far right edge.

## Ambient (2026-09-18)

- The tub's tap drips from (427,206) to the water at y 232, drawn in code; no new art.
