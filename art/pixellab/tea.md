# Tea party (playhouse mini-game)

Texture keys: `bg_tea_0` (640 x 400), `teapot` (64 x 56), `teacup` (48 x 40). Layout: `TABLE`
in `src/scenes/TeaScene.ts`; rules: `src/puzzles/tea.ts`.

## The table (2026-09-20)

`/generate-image-v2` 632x424, seed 53, with the playhouse art as `--style` and as a
`--reference` ("the same playhouse: its window, table and teddy bear, seen closer"):

> (global style) Close-up of a small wooden child's play table inside a wooden playhouse, seen
> from the front and slightly above, the empty table top filling the lower half of the image and
> the full width, directly behind the table a square window with a white frame looking out on
> green leaves and sky, wooden plank wall around the window, a brown teddy bear sitting in a
> small wooden chair at the far right edge of the image, partly cut off by the edge, nothing on
> the table, no tea set

(A first take, seed 52, showed the whole playhouse behind the table; the user wanted just the
window and the bear's chair.) Raw render in `art/pixellab/raw/tea_table_seed53.png`, fitted the
`fit_room.py` way. Table edges are measured into `TABLE` in `TeaScene.ts`.

## Pot and cups

The pot: 64x56 seed 61 candidate 3 (plain pink, so the embossed number reads). The cup: 56x48
seed 63 candidate 5, asked for "with clear empty space all around" because the first 48x40 cup
touched the image edges and its saucer was clipped. Sixteen candidates a call at these sizes.

The cups share that one silhouette: `empty.png` is the render; `partial` and `full` have the
tea drawn in by hand (a brown ellipse in the rim opening, deeper and smaller for the partial one,
with a highlight). A brim-full version was tried and dropped as too full; the "full" cup is the
former two-thirds one. Inpainting the rim (`/inpaint-v3`, 56x48, seed 7) gave a good "full" and
"most" but painted no tea at all for "a little", so the drawn set is used for consistency.

`over.png`, the overfilled cup shown from a spill until the level resets, *is* an inpaint
(seed 9, mask over the rim, the body and the saucer top, original alpha reapplied): tea over the
rim, down the side and pooled on the saucer came out well in one try.
