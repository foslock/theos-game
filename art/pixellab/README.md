# PixelLab art hand-off

The demo runs entirely on programmatic placeholder art. Every texture the game
expects is listed in `public/assets/manifest.json`. To swap a placeholder for
real art, drop the PNG under `public/assets/` and add a `"file"` entry to the
manifest. `BootScene` loads every manifest file first, and
`src/placeholders/textures.ts` only generates textures that are still missing,
so scenes can be replaced one at a time.

## Generating with the API

`scripts/pixellab.py` wraps the PixelLab v2 API (key in `.env` as
`PIXELLAB_API_KEY`). Character flow:

```
python3 scripts/pixellab.py character theo "<prompt>" 32x48 --seed 7
python3 scripts/pixellab.py animate <character_id> walk --directions east
python3 scripts/pixellab.py animate <character_id> breathing-idle --directions east
python3 scripts/pixellab.py export <character_id> /tmp/theo
python3 scripts/pixellab.py sheet /tmp/theo/Idle 32 48 public/assets/characters/theo.png \
    --idle animating --walk walking --walk-frames 0,1,3,4
```

Character creation costs 2 generations at these sizes; each template
animation costs 1 per direction. The exported ZIP names the idle animation
`animating` and the walk `walking`.

## Status (2026-09-17)

Every manifest key except `glint` now has PixelLab art. Items were generated
with `/generate-image-v2` at 24x24 (64 candidates per call, ~20 generations),
picked by hand from a contact sheet (`scripts/contact_sheet.py`); the chosen
index per item is recorded in `characters.md`. The 16x16 glint attempt produced
random trinkets, so the glint stays code-drawn. Characters are 64x96 (Theo) and
48x72 (Lucy) so they read at true scale against the rooms; the first 32x48 /
28x40 versions are kept in `public/assets/characters/small/`.

Room hotspot rectangles in `src/data/rooms/*.ts` were re-measured against the
new art with `scripts/fit_room.py --overlay`. Characters path-find around
furniture that reaches into the floor band (see `src/systems/Pathfind.ts`).

## Title screen and opening

The title screen layers `intro_house` (static), three drifting pixel clouds
(`intro_cloud_0..2`, generate-image-v2 at 84x32, seed 61, picks 4/11/14) and
`intro_house_cutout` on top so the clouds pass behind the house. Window glints
use the code-drawn `glint` at texture coords listed in `IntroScene.ts`.

New Game runs `StoryScene` ("One Saturday..." / "...at the Lockwoods", dithered)
and then the bedroom wake-up in `GameScene.wakeUp()`. The bedroom art has no bed of
its own: `bed_empty`, `bed_asleep` and `bed_sit` are whole-bed tiles drawn over it at
`BED_POS`, and the wake-up swaps between them before handing over to `theo_front`.

## Macintosh frame

`public/assets/frame/mac.png` is a classic beige Macintosh (generate-image-v2,
440x572, seed 91) cropped to the case with the screen hole made transparent.
`mac.json` records the hole and the largest 4:3 rectangle inside it; `src/frame.ts`
positions the Phaser canvas there, keeps everything centred on resize, draws
the glass vignette and runs the power-on stretch. Regenerate the JSON if the
art changes (the hole is the transparent area inside the bezel).

## Global style (paste at the top of every prompt)

> 1990s children's point-and-click adventure game background in the style of
> Humongous Entertainment (Putt-Putt, Freddi Fish) and Zoombinis. Chunky,
> readable pixel art, bold black outlines, warm saturated palette, soft
> dithered shading, friendly rounded shapes, no text, no characters, clean
> silhouettes for interactable objects.

## Technical requirements

| Asset | Size | Notes |
|---|---|---|
| Room background | 640 x 400 | Two frames per room: `bg_<room>_0.png` and `bg_<room>_1.png`. Frame 1 is a subtle variation (leaves shifted, light glint moved). Same composition and hotspot positions. |
| Theo sheet | 6 frames of 32 x 48 in one row (192 x 48) | Frames 0-1 idle (breath/blink), 2-5 walk cycle. Feet on the bottom edge, facing right. The game flips the sprite for left. |
| Lucy sheet | 6 frames of 28 x 40 in one row (168 x 40) | Same frame layout as Theo. |
| Item icons | 24 x 24 | Transparent background. Used both in the scene and in the backpack grid. |
| Backpack | 48 x 44 | Transparent background. |
| Glint | 12 x 12 | White four-point sparkle, transparent background. |

The floor line in every room is at y = 280, and characters stand between
y = 300 and y = 370. Keep walkable floor clear of tall furniture in that band.

Hotspot rectangles are defined in `src/data/rooms/<room>.ts`. When the real
background changes where an object sits, update the `zone` and `walkTo` values
there. The placeholder background draws every zone with a label, so a quick
way to line up real art is to overlay the placeholder at 50% opacity.

## Concept-art workflow (optional)

Generating a Midjourney concept sheet first and feeding it to PixelLab as a
reference image gives more consistent lighting and furniture across rooms.
Suggested flow: one Midjourney image per room at 16:10 with the style prompt
above plus "concept art, flat colors", then use it as the reference image in
PixelLab with the same room prompt.
