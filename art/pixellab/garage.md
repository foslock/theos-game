# Garage

Texture keys: `bg_garage_0`, `bg_garage_1` (640 x 400). Hotspots: `src/data/rooms/garage.ts`.

## Prompt

> (global style) A cluttered two-car garage with a grey concrete floor, a red family car on the right, a bicycle leaning on the left wall, a red toolbox on the floor, shelves with paint cans, a big garage door in the back.

## Frame 1 variation

> Overhead light flickers; a dangling cord sways.

## Must be visible

- Car (right), bicycle (left), toolbox (bottom-left)
- Left door back to the family room

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 24,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A cluttered two-car garage with a grey concrete floor. A red family car on the right, a blue bicycle leaning on the left wall, a red toolbox on the floor bottom-left, wooden shelves with paint cans and boxes, a big white garage door in the back wall, a hanging work light. An open door on the far left edge.

## Ambient (2026-09-18)

- The hanging lamp (x 388-452, y 0-66) was inpainted out of `bg_0`/`bg_1` (`/inpaint-v3` on a
  256x128 crop at (300,0), seed 111; only the mask rect pasted back, frame 1's highlight shift
  reapplied). `lamp.png` is the lamp cut out of the original by flood-filling the orange ceiling away
  from the crop's edges, so the shade's dome stays solid (a colour key had left it see-through). It rocks about (420,0) with a code-drawn glow, and a moth
  (`ambient/moth.png`, open seed 103 candidate 3, closed seed 104 candidate 2) circles it.
