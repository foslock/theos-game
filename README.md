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
| `src/systems/` | Conditions, seeded RNG, cursors, walking, pathfinding, dialogue, hints, ambient frames, dither fades, sound |
| `src/puzzles/` | Pure puzzle logic (`breakfast.ts`) and its scene controller |
| `src/frame.ts` | The Macintosh shell around the canvas: centring, vignette, power-on animation |
| `src/scenes/` | Phaser scenes: Boot, Intro (title + menu), Story, Load, Settings, Game, Hud |
| `src/placeholders/` | Programmatic placeholder art and the dither fade |
| `public/assets/manifest.json` | Every texture key; add a `file` to replace a placeholder |
| `tests/` | Vitest suites for the pure layer |

## Adding a scene

1. Create `src/data/rooms/<name>.ts` and register it in `rooms/index.ts` and the `RoomId` type.
2. Give every exit a matching reverse exit in the target room (a test enforces this).
3. Keep click zones from overlapping (a test enforces this too).
4. Add the background keys to the manifest and, when art exists, a `file` path.
