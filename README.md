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
| `src/puzzles/` | Pure puzzle logic (`breakfast.ts`, `basketball.ts`, `slide.ts`) and the scene controllers that drive it |
| `src/frame.ts` | The Macintosh shell around the canvas: centring, vignette, power-on animation |
| `src/scenes/` | Phaser scenes: Boot, Intro (title + menu), Story, Load, Settings, Game, Slide (the playground ride), Hud |
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
- **Stomp rocket** (backyard): with the rocket from Theo's room, clicking the launcher starts a
  five-second click frenzy; every click is nine metres. Theo stomps, the camera follows the
  rocket up through clouds and birds with a metre counter, and it falls back beside the kids.
  After the first launch the rocket stays on the launcher (and leaves the backpack) for replays.
  Pure flight maths in `src/puzzles/rocket.ts`.
- **Slide ride** (playground): its own scene, `SlideScene`. Click either side of the
  slide to move a lane; leaves and mud come down the slide, three bumps restart it.
  The course is generated from the seed in `src/puzzles/slide.ts` and is always
  beatable by construction.

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
