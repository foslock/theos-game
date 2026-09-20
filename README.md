# Theo's Game

A browser point-and-click adventure in the spirit of Putt-Putt, Freddi Fish and
Zoombinis. See `SPEC.md` for the design and `art/pixellab/` for the art
hand-off notes.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # unit tests (vitest)
npm run build      # typecheck + production bundle in dist/
```

The game autosaves to `localStorage` after every change. "Save file" in the
HUD downloads the save as JSON, and "Load Game > Load from file..." restores it
on another machine.

## Deploy (Render static site)

The build is a plain static bundle in `dist/`, so it runs on any static host.
`render.yaml` is a Render Blueprint for it:

1. Push the repo to GitHub.
2. In Render choose **New > Blueprint** and pick the repo; it reads `render.yaml`
   (build `npm ci && npm run build`, publish `dist`, Node 22). Or create a
   **Static Site** by hand with those same settings.
3. Every push to `main` redeploys; pull requests get preview URLs.

`vite.config.ts` uses a relative `base`, so the same `dist/` also works under a
sub-path (GitHub Pages, S3 folders). The hashed JS bundle lands in `dist/bundle/`
and the art in `dist/assets/`. Test the production build locally with
`npm run build && npm run preview`.

`reference/` (family photos used to prompt PixelLab) and `.env` (the PixelLab
key) are git-ignored and are not needed to build or deploy.

## Layout

| Path | What lives there |
|---|---|
| `src/data/rooms/` | One file per scene: exits, click zones, walk-to points |
| `src/data/graph.ts` | Scene graph helpers derived from the room exits |
| `src/data/items.ts` | Inventory item registry |
| `src/state/` | Game state, store, autosave / export / import, settings |
| `src/systems/` | Conditions, seeded RNG, cursors, walking, pathfinding, dialogue, hints, ambient frames and effects, dither fades, sound |
| `src/puzzles/` | Pure puzzle logic (`breakfast.ts`, `basketball.ts`, `slide.ts`, `rocket.ts`, `race.ts`, `memory.ts`, `tea.ts`, `spots.ts`) and the scene controllers that drive it |
| `src/frame.ts` | The Macintosh shell around the canvas: centring, vignette, power-on animation |
| `src/scenes/` | Phaser scenes: Boot, Intro (title + menu), Story, Load, Settings, Game, Slide (the playground ride), Race (the toy track), Memory (the garage boxes), Tea (the playhouse tea party), Foyer (the ending), Hud |
| `src/ui/MinigamePanel.ts` | What a running mini-game shows in the backpack bar, right of the item grid (readouts, meters, icons, buttons) |
| `src/ui/backpackSlots.ts` | The backpack grid's geometry, and which slot a picked-up thing flies into |
| `src/placeholders/` | Programmatic placeholder art and the dither fade |
| `public/assets/manifest.json` | Every texture key; add a `file` to replace a placeholder |
| `tests/` | Vitest suites for the pure layer |

## Puzzles and mini-games

- **Breakfast** (kitchen): the four items are dealt into drawers, cabinets and the fridge
  from the save's seed; see `src/puzzles/breakfast.ts`.
- **Basketball hunt** (bedroom, family room, garage): one ball per room, drawn half
  behind furniture with a `peek` on its pickup hotspot. The room background is painted
  back over the hidden part, so the art needs no changes.
- **Hoop game** (sport court): with all three balls, clicking a hoop starts it. Hold to
  wind up, release to shoot; one basket at each hoop wins and opens the playground.
  Rim positions, Theo's shooting spots and the ballistics live in
  `src/puzzles/basketball.ts`, so a shot can be simulated in a test.
- **Stomp rocket** (backyard): with the rocket from the garage, clicking the launcher starts a
  five-second click frenzy; every click is nine metres. Theo stomps, the camera follows the
  rocket up through clouds and birds with a metre counter, and it falls back beside the kids.
  After the first launch the rocket stays on the launcher (and leaves the backpack) for replays.
  Pure flight maths in `src/puzzles/rocket.ts`.
- **Slide ride** (playground): its own scene, `SlideScene`. Click either side of the
  slide to move a lane; leaves and mud come down the slide, three bumps restart it.
  The course is generated from the seed in `src/puzzles/slide.ts` and is always
  beatable by construction.
- **Race track** (Theo's room): the toy track on the carpet is a mini-game once Theo has his
  race car (a pickup in the same room). Its own scene, `RaceScene`, shows the track close up;
  two big buttons in the backpack bar drive it: **Push** shoves the car along and **Boost**
  switches the booster on for a moment (blinking lamp, humming motor) so a car passing over it
  is flung round the loop-the-loop, which pushing alone never manages. Three laps without the
  car stopping wins and sets `raceDone`; a stop starts the laps over. The car lives on the track
  afterwards, so it can be replayed. Physics and the track's arc-length path are in
  `src/puzzles/race.ts`; the geometry is `src/puzzles/race-track.json`, which
  `scripts/race_track.py` also reads to paint the track onto the carpet art.

- **Memory boxes** (garage): clicking the shelves opens `MemoryScene`, a wall of four shelves
  with Dad's boxes on them. Open two boxes: a matching pair stays open, a mismatch closes again.
  Three levels, a 2x2, a 3x3 with its middle empty, then a 4x4 of eight pairs; clearing the last
  sets `memoryDone`. Dealing and matching are pure in `src/puzzles/memory.ts`; the deal uses the
  save's seed plus a fresh roll, so a replay is a new layout.

- **What's next.** `src/puzzles/progress.ts` lists the six games in nudging order. After a game is
  won Theo names the next one still to do (Lucy does the same when asked with nothing else to do),
  and once the last is won he says Mom and Dad will be home soon (or, indoors, that he can hear
  them). The ending needs all six and plays on the next door into or through the house: the back
  door from the yard, or leaving the garage or bedroom if the last game was won there.
- **Tea party** (playhouse): clicking the tea set opens `TeaScene`, the little table close up.
  Two teapots pour a fixed three and two; each cup is marked with what it holds and must be
  filled exactly. Pick a pot, click a cup. Pouring past the mark, or leaving a cup one short,
  spills the level and it starts over with the same cups. Three levels of three cups: twos and
  threes first, then four to six, then seven to nine; the last sets `teaDone`. Rules in `src/puzzles/tea.ts`. Pots and cups are one sprite
  each, drawn at a size for their number, with the number embossed on them; the tea is drawn
  masked by the cup's own shape.

## Seeded item spots

The stomp rocket, the race car, the three basketballs, the kitchen door key and the garage key
each list three `spots` in their room file. `src/puzzles/spots.ts` picks one from the save's
seed (independently per item), so a playthrough always finds a thing in the same place but
the next game may not. A spot carries its own click zone, walk-to point, optional `peek`
(how it tucks behind furniture) and a `where` phrase that the idle hints use. The layout
tests check every spot, not just the chosen one.

## Ambient effects

Every room lists small background animations in its `ambient` array (see
`src/systems/Ambience.ts` for the kinds): dust motes, a dripping tap, the kitchen clock's
second hand, the television's frames, the garage
lamp rocking with its glow, a moth or butterfly wandering, birds and clouds passing behind
a sky occluder, steam, falling leaves, and the robin hopping on the lawn. An effect whose
art is missing is skipped, so the placeholder build still runs. The cut-outs and occluders
are derived from the room art with small scripts noted in `art/pixellab/*.md`.

## Adding a scene

1. Create `src/data/rooms/<name>.ts` and register it in `rooms/index.ts` and the `RoomId` type.
2. Give every exit a matching reverse exit in the target room (a test enforces this).
3. Keep click zones from overlapping (a test enforces this too).
4. Add the background keys to the manifest and, when art exists, a `file` path.
