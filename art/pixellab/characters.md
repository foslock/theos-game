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
