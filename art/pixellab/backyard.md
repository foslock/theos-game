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

## Ambient (2026-09-18)

- `robin.png`: the robin cut out of the lawn (x 116-156, y 288-320; lawn keyed out), and the
  lawn patched behind it with the grass just to its right. It hops and pecks by tilting; a
  generated hop batch (seed 113) came out smaller than the painted bird and was not used.
- `sky_occluder.png`: the top 150 rows with the sky transparent (rule: greens, darks, trunks
  and the house/chimney shapes are kept), drawn over the intro clouds and the bird flock
  (`ambient/bird.png`: wings up seed 101 candidate 3, wings down seed 102 candidate 11, both
  desaturated to one grey so the flap does not flicker).

## Stomp rocket (2026-09-18)

- `stomp_launcher.png` 96x64: the launcher without its rocket (blue tripod, leaning red tube, hose,
  red pad), `/generate-image-v2` seed 121 candidate 0 with the user's product photo
  (`raw/stomp_rocket_photo.png`) as the reference and the house as the style image. It stands on
  the lawn with its feet at (500,350); the tube top is at sprite (22,2) and the pad centre at
  (41,48), which `LAUNCHER` in `src/puzzles/StompRocketController.ts` carries in scene pixels.
- `rocket_flying.png` 24x48: the foam rocket, seed 122 candidate 1, same reference. It sits on
  the tube tilted like the tube, straightens as it climbs, noses over at the top and lands beside
  the kids. The backpack icon `item_stomp_rocket` is the pickup in the bedroom.
- The game: click for five seconds (9 m a click), Theo stomps, the camera follows the rocket up
  a gradient sky with the intro clouds, the flock bird and stars above 180 m, then it falls back.
- Sights on the way up (`ambient/sky_*.png`, seeds 131-134, candidates plane 1, satellite 47,
  saucer 9, moon 6): the plane crosses at 100 m, the satellite hangs at 150 m with a red light
  blinking in code, the saucer wobbles across at 200 m, the moon hangs at 250 m. Only the ones
  below the flight's peak are placed.
- 2026-09-20: one sight at **every fifty metres**, so pumping harder always shows something new.
  `SIGHTS` in `src/puzzles/rocket.ts` is the list: each has a drift (0 hangs still and is placed
  anywhere across the sky), an optional bob, an optional blinking light, and a `faces` saying
  which way the art is drawn so a crossing sight is mirrored to fly nose-first. The plane's nose
  and the kite's tail are both drawn to the left; the saucer is symmetrical and never mirrors.
  - `sky_kite.png` 32x40 (seed 141, candidate 12): drifts across at 50 m, the first thing the
    rocket passes. A kite whose tail trails to the right, so it faces left.
  - `sky_comet.png` 48x24 (seed 171, candidate 0): streaks across at 300 m. Its icy head leads
    to the left with the tail trailing right, so `faces: 'left'`.
  - `sky_astronaut.png` 32x32 (seed 172, candidate 33): drifts and bobs at 350 m, waving, tether
    trailing behind to the right, so `faces: 'left'` too.
  - `sky_planet.png` 64x48 (seed 174, candidate 12): hangs at 400 m, the highest thing there is.
    The first batch at 48x48 had **every** candidate's ring running off both edges; regenerated
    at 64x48 asking for the ring to "stop well short of the left and right edges", which gave
    two clean ones out of sixteen. Check `Image.getbbox()` against the canvas before picking:
    a ring or a tail touching an edge has been cut, and it is not obvious at 1x.
  - The 64-candidate batch a call returns is **overwritten** by a re-run with the same seed and
    does not reproduce, so a batch worth picking from goes in its own `raw/<name>_batch/` folder
    before anything else is generated.
