# Foyer (the ending)

Texture keys: `bg_foyer` (640 x 400), `parents`, `theo_back`, `lucy_back`. Not a room in
`src/data/rooms/`: the ending is its own scene (`src/scenes/FoyerScene.ts`) with positions in
`src/data/foyer.ts`. It plays when the party comes back through the kitchen door with all three
mini-games won (`src/puzzles/ending.ts`). The save is not touched, so Resume Game goes back outside.

## Background — DONE (2026-09-19)

`/generate-image-v2` at 632x424, seed 24, style image `public/assets/intro/house.png`, reference
`reference/foyer.jpeg` ("ignore the blue painter's tape on the right wall and draw that wall plain").
One try. Fitted with `scripts/fit_room.py foyer RAW --top 0` (the 24 spare rows came off the
*bottom* so the chandelier's ceiling mount is kept). Raw render in `raw/foyer_seed24.png`.

> (global style) A grand front hall of a family home seen straight on from inside the house. A
> wide staircase on the left rising to an upper landing, white painted balusters, a polished dark
> wood handrail, and a dark navy blue patterned carpet runner on the steps. A white six-panel
> front door in the centre of the back wall with a tall narrow window beside it showing a green
> lawn. Warm mottled gold wallpaper above white wainscoting panels on every wall; the right wall
> is plain gold wallpaper with nothing on it. A sparkling crystal chandelier hanging from the high
> ceiling. A warm honey-coloured wooden plank floor. A white doorway on the far right leading to
> another room. Bright morning light, empty room.

Measured: door x 292-366 (bottom y 290), sidelight x 376-398 y 160-250, chandelier x 262-372
y 0-115, newel post of the stairs x 150-200. Dust motes drift in the sidelight and around the
chandelier (`FOYER.ambient`).

## Mom and Dad — DONE (2026-09-19)

`parents.png` 88x192, feet on the bottom edge, drawn at `FOYER.parents` (330, 326): in front of the
door, beside the foot of the stairs. Reference `reference/mom-and-dad.jpeg` with "no drinks in
their hands"; style image `characters/theo_front.png`.

- First try at 160x176 (seed 201) cropped the feet. Regenerated at 160x200 with that render as an
  extra reference ("redraw them so the whole figure fits with their shoes fully visible"): seed 202
  is the one used (seed 203 was a spare). Raw in `raw/parents_seed202.png`.
- They come out at about 1.9x Theo's height, which is true to life; against the hall's deeper
  perspective they stand a step nearer the camera than the door, which reads fine.
- Their outlines are finer than Theo's chunky ones. Redo with `--style` off or a stronger
  "chunky black outline" if that bothers anyone.

> A man and a woman standing side by side facing the viewer, smiling, a married couple in their
> thirties, drawn full length from head to shoes with empty space above the head and below the
> feet. The man on the left: tall, short dark brown hair, neat short dark beard, light blue
> button-up shirt with the sleeves rolled, tan trousers, brown loafers, his right arm around the
> woman's shoulders and his left arm hanging at his side, holding nothing. The woman on the right:
> long straight blonde hair, big smile, long yellow sundress with thin straps and a large green
> tropical leaf and pink flower print on the skirt, white sandals, both arms hanging at her sides,
> holding nothing. 1990s children's point-and-click adventure game characters, chunky black
> outline, warm saturated colors, figures only, nothing else in the image, no glasses, no drinks,
> no background.

## The kids from behind — DONE (2026-09-19)

`theo_back.png` (9 x 64x96) and `lucy_back.png` (9 x 48x72): frame 0 standing (the characters'
existing `north` rotation), 1-6 the `running-6-frames` template facing north (1 generation each),
7-8 two frames of `two-footed-jump` north (1 generation each). Frames share one baseline, as in
`scripts/pixellab.py sheet`.

- The template list is in the 422 error from `/characters/animations` when the id is wrong: try
  `animate <id> jump` to print it. Useful ones: `running-4/6/8-frames`, `two-footed-jump`,
  `jumping-1/2`, `running-jump`, `picking-up`, `pushing`, `sad-walk`.
- The jump template turned Theo round to face the camera on 4 of its 7 frames, so the jump is a
  tween in code: frame 7 (arms out) on the way up, frame 8 (arms up) at the top, frame 0 on
  landing. Theo's picks are jump frames 3 and 4; Lucy's (all facing away) 2 and 4.
