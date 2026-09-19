# Characters

## Theo (player, 64 x 96) — DONE (large version)

PixelLab character id `84e20a6a-cbe4-4850-97d0-6c25ab6ffe62` (v3, 8 rotations,
seed 23, view "low top-down", 64x96 so he stands about half a fridge tall).
The first approved 32x48 version is id `b9367698-f775-4ebf-9f0b-0053ec2591a5`
(seed 7), kept at `public/assets/characters/small/`. Sheet at `public/assets/characters/theo.png`
built from the south-facing `breathing-idle` (faces the player) and east-facing `walk` template animations
(walk frames 0,1,3,4 of 6). Cost: 2 generations to create + 1 per animation.

> cheerful toddler boy about 2 years old, chubby cheeks, very short thin light
> blond hair cut close to the head, high forehead, blue rectangular glasses,
> big happy grin, light blue t-shirt, blue denim shorts, white sneakers, 1990s
> children's point-and-click adventure game character, chunky black outline,
> warm saturated colors

Reference photos: `reference/theo.jpg`, `reference/theo-and-lucy.jpeg`.

## Lucy (Theo's baby sister, 48 x 72) — DONE (large version)

PixelLab character id `43fb3ac0-a4fc-4505-a59d-8bd075a4b154` (v3, seed 11,
view "low top-down", 48x72). The first 28x40 version is id
`eebb9e9c-c2e6-4e1b-91ca-58f991c28040`, kept at `public/assets/characters/small/`. Sheet at `public/assets/characters/lucy.png`, same
build as Theo (walk frames 0,1,3,4 of 6).

Lucy is 6 months old in the photos and is drawn that age, but stands, walks
and talks in the game.

> happy baby girl about 6 months old, nearly bald head with a little wispy
> light blonde hair, big pink bow headband, big blue eyes, chubby cheeks,
> open-mouth giggle, cream knitted sleeveless romper with pink trim, bare
> feet, standing upright, 1990s children's point-and-click adventure game
> character, chunky black outline, warm saturated colors

Reference photos: `reference/lucy.jpeg`, `reference/theo-and-lucy.jpeg`.

## Item icons (24 x 24 each, transparent)

- Spoon: silver spoon, slight tilt
- Bowl: blue cereal bowl
- Cereal: orange cereal box with a cartoon sun
- Milk: white milk carton
- Basketball: orange basketball
- Stomp Rocket: red foam rocket with fins
- Kitchen Door Key: gold key with a round bow
- Garage Key: silver key with a square bow
- Playhouse Key: small brass key with a heart-shaped bow
- Toy Bus: yellow toy school bus
- Backpack (48 x 44): brown canvas backpack with two straps and a front pocket

## Chosen item candidates (generate-image-v2, 24x24, 64 per call)

spoon 4 (seed 41), bowl: regenerated empty (seed 142, candidate 40; the first batch all had cereal in them), cereal 38 (43), milk 4 (44), basketball 49 (45),
stomp_rocket 4 (46), kitchen_door_key 24 (47), garage_key 22 (48),
playhouse_key 10 (49), toy_bus 62 (50), backpack: regenerated at 64x64 (seed 77) because the
48x44 render was cropped at the top; candidate 8 trimmed to its bounds and padded to 52x56.

## Wake-up intro: whole-bed tiles (2026-09-18)

The first attempt used figure-only sprites (`theo_asleep`, `theo_sitting`) pasted onto the bed in
the room art, with the footboard redrawn in front. They could never line up: each sprite carried
its own bedding and bedposts drawn for a different bed, and an 18px strip of redrawn footboard
sliced the sleeper. Replaced by tiles that contain the whole bed, so nothing has to register
against the background.

- The bed was **removed from `bedroom/bg_0.png` and `bg_1.png`** with `/inpaint-v3` (mask rect
  (112,178)-(278,320); the two frames are byte-identical there, so one patch served both). The
  endpoint caps input at 512x512, so it ran on a 512x400 crop, and it re-renders the whole frame —
  only the masked rect was pasted back, leaving the rest of the room untouched.
- `bed_asleep.png` 160x136, seed 31, candidate 2: generated with the old bed's crop as a reference
  image so the frame, palette and perspective match the room.
- `bed_sit.png` seed 32, candidate 0: generated with `bed_asleep.png` as the reference so the bed
  stays put between poses. Its silhouette still drifts 3-6px from the others.
- `bed_empty.png`: **not generated** — the empty-bed batches all came out smaller than the approved
  bed, which made it jump. Instead Theo was inpainted out of `bed_asleep.png` (mask (90,16)-(138,72)
  in tile space, seed 7) and the original alpha reapplied, so its silhouette is byte-identical.
- All three are drawn at `BED_POS` (124,196) in `GameScene`. That offset seats the front-left leg on
  the carpet; at the generator's framing the leg floated 21-30px up onto the wall.
- Lesson: for a pose that has to sit in existing furniture, generate the furniture with it and pass
  the room art as a reference. Inpainting removes things well but will not add a figure.

## Lucy's clap (2026-09-18)

`lucy_clap.png` 96x72, two 48x72 frames: hands apart, then pressed together. Played once through
(three claps) whenever the carried-item count rises and Lucy is in the room.

- No template animation fits a clap and `/characters/{id}/animations` is POST-only, so the template
  ids cannot be listed — guessing one is not worth it. Generated as poses with `/generate-image-v2`
  instead, the same route as Theo's wake-up frames.
- `together` came from seed 51, candidate 9, with Lucy's idle frame 0 as the reference. `apart` came
  from seed 52, candidate 8, referencing the *chosen together frame* so the body would match rather
  than the idle. Most of the other candidates dropped the pink bow.
- The two frames were then aligned to idle frame 0 by searching for the offset that best overlaps
  the bottom 16 rows of her silhouette — her legs, which no arm pose should move. `together` needed
  dx +2 and `apart` dx +7; without that her feet slide as the animation plays.

## Slide ride: seated, seen from behind (2026-09-18)

`theo_slide.png` 128x72 (two 64x72 frames) and `lucy_slide.png` 96x56 (two 48x56 frames):
hands down, then arms up, looped at 2 fps as a cheer while they ride down the slide with their
backs to the player.

- Generated as poses with `/generate-image-v2` (16 candidates per call at these sizes), the
  idle frame 0 crop as the reference ("keep hair, glasses, shirt... but draw him from behind").
- "Sitting on a slide" put a slide under most candidates; "sitting on the floor ... figure only,
  nothing else in the image, no slide, no floor" gave clean figures.
- Theo: hands down seed 81 candidate 11; arms up seed 87 candidate 0 (referencing the chosen
  hands-down frame so the body matches), shifted dx +3, dy +22 so the feet sit on the same row.
- Lucy: hands down seed 85 candidate 1; arms up seed 86 candidate 1. Same bounds, no shift.
- Only the chosen candidates are kept in `raw/`; the batches are reproducible from the seeds
  above (`theo_slide_b` seed 82 and `lucy_slide_a/b` seeds 83/84 were the slide-under-figure runs).

## Hoop game: shooting pose (2026-09-18)

`theo_shoot.png` 128x96, two 64x96 frames: turned three-quarters away toward the upper right
(where the hoops are), holding the ball up in both hands, then the follow-through with open hands
and no ball. The thrown ball is a separate object that starts where the held ball sits (frame 0's
ball centre is (46,18), which is `HAND_OFFSET` (14,-78) from his feet).

- `/generate-image-v2` at 64x96 gives only 4 candidates per call. Hold: seed 91, candidate 0,
  idle frame 0 as the reference. Release: seed 92, candidate 0, referencing the chosen hold
  frame ("a moment later with the ball gone"), shifted dy +6 so the feet share a row.
- `Character.pose()` in `src/systems/Walker.ts` shows a frame from this sheet; walking or
  `idle()` restores the normal sheet, so nothing else has to know about it.
