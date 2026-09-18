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

spoon 4 (seed 41), bowl 62 (42), cereal 38 (43), milk 4 (44), basketball 49 (45),
stomp_rocket 4 (46), kitchen_door_key 24 (47), garage_key 22 (48),
playhouse_key 10 (49), toy_bus 62 (50), backpack: regenerated at 64x64 (seed 77) because the
48x44 render was cropped at the top; candidate 8 trimmed to its bounds and padded to 52x56.

## Wake-up intro poses (generate-image-v2 with `theo_front` as subject reference)

- `theo_asleep.png` 96x48, seed 31, candidate 0: head on the pillow at the right, blanket to the left.
  Placed at (176,191) in the bedroom with the footboard redrawn in front of it.
- `theo_sitting.png` 64x80, seed 32, candidate 8: sitting up yawning, arms raised. The generator's
  bedposts were erased from the side columns. Placed at (222,188).
- An `/inpaint-v3` attempt to paint Theo straight into the bed art repainted the bed but never
  added a figure, so standalone sprites are the way to go for poses like this.
