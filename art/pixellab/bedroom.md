# Theo's Bedroom

Texture keys: `bg_bedroom_0`, `bg_bedroom_1` (640 x 400). Hotspots: `src/data/rooms/bedroom.ts`.

## Prompt

> (global style) A cozy young boy's bedroom in the morning. Sunlight through a window on the back wall, a single bed with a blue blanket on the left-centre, a wooden bedside lamp on the right, wooden floor, toys on a shelf, a poster of a rocket on the wall. A doorway on the far left leads to a bathroom and a staircase down on the far right.

## Frame 1 variation

> Sunbeam through the window shifts slightly; curtain edge moves.

## Must be visible

- Bed (centre-left), lamp (right), window (top centre)
- Empty floor space near x=400 where the backpack sprite is drawn
- Rocket-sized shelf spot near x=140, y=150 for the stomp rocket sprite
- Left doorway (bathroom) and right stair opening (kitchen)

## Ambient (2026-09-18)

- Dust motes drift in the window light (x 282-364, y 122-240); no new art.

## Race track and seeded spots (2026-09-20)

The toy track prop (`toy_track`, see `race.md`) sits on the carpet at the bottom right; feet
path around it. The race car and the basketball each have three spots (`spots` in
`bedroom.ts`); one is chosen from the save's seed. The stomp rocket moved to the garage on
2026-09-20 to keep the room's item count down. The bed hotspot was given
`parts` following the footboard's diagonal so a ball can peek out from under its foot.
