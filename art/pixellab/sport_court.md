# Sport Court

Texture keys: `bg_sport_court_0`, `bg_sport_court_1` (640 x 400). Hotspots: `src/data/rooms/sportCourt.ts`.

## Prompt

> (global style) A backyard sport court with a green painted surface, three basketball hoops of increasing height on the right side, a wooden bench on the left, a chain-link fence and trees in the background.

## Frame 1 variation

> Net sways; sunlight glints on the hoop rim.

## Must be visible

- Three hoops at different heights (right)
- Bench (left)
- Left opening back to the backyard
- Three partially hidden spots for basketballs (behind the bench, in a bush, on a fence post) for the later search puzzle

## Generated 2026-09-17 — DONE

`/generate-image-v2` at 632x424 (the API maximum for this aspect), seed 26,
style image `public/assets/intro/house.png`, reference photo from `reference/`
where one exists. Fitted to 640x400 with `scripts/fit_room.py` (24 rows of
ceiling cropped, edges padded). Frame 1 is a programmatic highlight shift, not
a second render. Cost: 40 generations.

> (global style) A backyard sport court with a light concrete surface and white painted court lines, tall trimmed green hedges around it, three basketball hoops of increasing height on the right side, a wooden bench on the left, stone steps and green shrubs on the left, tall trees and a white house roof behind the hedge, a bush and a fence post near the right, an opening on the far left edge.

## Rim and net overlays (2026-09-18)

`net_low.png`, `net_mid.png`, `net_high.png` are the rims and nets cut straight out of `bg_0.png`
(rects (408,170)-(438,198), (467,143)-(501,176), (532,111)-(562,146)): white/grey net and orange
rim pixels kept, plus any dark outline pixel touching them, everything else transparent. The hoop
game draws them back over the art so a ball that goes in drops behind the rim and net. Their
positions are the `net` entries in `HOOPS` (`src/puzzles/basketball.ts`); redo the cut-out if the
court art changes.

## Ambient (2026-09-18)

- `sky_occluder.png` as in the backyard, with the house and the three backboards added as
  shapes. Clouds and birds pass behind it; a butterfly (`ambient/butterfly.png`, open seed 105
  candidate 7, closed = the same frame squashed to half width) wanders over the hedge.
