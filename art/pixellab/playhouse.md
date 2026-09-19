# Playhouse

Texture keys: `bg_playhouse_0`, `bg_playhouse_1` (640 x 400). Hotspots: `src/data/rooms/playhouse.ts`.

## Prompt

> (global style) The inside of a small wooden playhouse, pink walls, a tiny table with a toy tea set, a teddy bear on a little chair, a small window on the left, a door on the right, and a second small door at the back leading to the playground.

## Frame 1 variation

> Light through the window shifts; teddy blinks.

## Must be visible

- Tea set (left), teddy (right), window (left)
- Floor spot near x=475, y=282 for the garage key sprite
- Right door (backyard), back door (playground, locked in the demo)

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 27,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) The inside of a small wooden playhouse with warm wood plank walls and a vaulted wood ceiling. A small white-framed window on the left, a tiny wooden table with a toy tea set on the left, a brown teddy bear sitting on a little chair on the right, a small cream rug, a white door on the far right edge, and a second small white door in the back wall centre.

## Ambient (2026-09-18)

- `window_frame.png`: the side window's frame and mullions (x 34-156, y 134-227; mullion bands
  x 74-80, 111-117 and y 179-184), drawn over a bird from `ambient/bird.png` that passes the
  panes now and then. Dust motes drift in the window light. Steam rises from the teapot lid
  (148,242). (A swaying-foliage layer was tried and dropped, as in the kitchen.)
