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
