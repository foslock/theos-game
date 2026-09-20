# Race track (Theo's room mini-game)

Texture keys: `bg_race_0` (640 x 400), `race_loop_front`, `car_top`, `car_side` (32 x 20),
`item_toy_car` and `booster_icon` (24 x 24), `toy_track` (the prop in the bedroom).
Geometry: `src/puzzles/race-track.json`; game: `src/puzzles/race.ts`, `src/scenes/RaceScene.ts`.

## The carpet (2026-09-20)

`/generate-image-v2` 632x424, seed 31, with `public/assets/bedroom/bg_0.png` as `--style`:

> (global style) A close-up view of the soft green carpet floor of a young boy's bedroom, seen
> from high above at a slight angle, the carpet filling the whole image edge to edge with
> gentle dithered light and shade, a few small wooden toy blocks and crayons scattered near the
> edges of the image only, the centre of the carpet empty, no track, no furniture, no text

Raw render kept as `art/pixellab/raw/race_floor_seed31.png`. The track itself is **not**
PixelLab art: `scripts/race_track.py` fits the render to 640x400 the way `fit_room.py` does and
rasterises the track over it from the JSON, so the car's path and the picture cannot drift
apart. Rerun the script after changing the geometry. It also writes `race/loop_front.png`, the
loop's near rail alone, which the scene draws over the car while it is in the loop.

## The car

Three calls at 32x20 / 24x24 (64 candidates each, seed 12), picked from contact sheets:
top-down #35, side-on #31, icon #36. The side view is generated facing right and flipped in
code; in the loop it is rotated by the loop angle with its wheels 3px inside the rail.

## The bedroom prop and the booster button

`toy_track`: 112x56, seed 5, with the bedroom art as `--reference`, candidate 0 of 4 (the first
render clipped the top of the loop; redone at 112x72 asking for empty space above it).
`booster_icon`: 24x24, seed 8, candidate 9; a code-drawn box stands in if the file is missing.
