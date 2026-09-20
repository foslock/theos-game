#!/usr/bin/env python3
"""Paint the toy race track onto the carpet close-up for the race mini-game.

  python3 scripts/race_track.py [RAW_FLOOR.png]

Reads the geometry from src/puzzles/race-track.json (the same numbers the game
drives the car with), fits the 632x424 PixelLab carpet render to 640x400 the way
fit_room.py does, and rasterises the track pixel by pixel: an orange ribbon with
darker rails and a black outline, the loop-the-loop as a ring standing on the far
straight, the checkered start line and the blue booster halves either side of the
near straight. Writes:

  public/assets/race/bg_0.png       the carpet with the track on it
  public/assets/race/loop_front.png the loop's near rail alone, drawn over the car
                                    while it is in the loop (its top-left is written
                                    into the JSON as loopFront)
"""
import json, math, os, sys
from PIL import Image

RAW = sys.argv[1] if len(sys.argv) > 1 else "art/pixellab/raw/race_floor_seed31.png"
GEO = "src/puzzles/race-track.json"
geo = json.load(open(GEO))
W, H = 640, 400

# ---- the carpet ----
raw = Image.open(RAW).convert("RGB")
assert raw.size == (632, 424), raw.size
raw = raw.crop((0, 24, 632, 424))
floor = Image.new("RGB", (W, H))
floor.paste(raw, (4, 0))
floor.paste(raw.crop((0, 0, 1, 400)).resize((4, 400)), (0, 0))
floor.paste(raw.crop((631, 0, 632, 400)).resize((4, 400)), (636, 0))
px = floor.load()

st, end, loop, boost = geo["straight"], geo["end"], geo["loop"], geo["booster"]
half = geo["width"] / 2
cy = (st["top"] + st["bottom"]) / 2
lx, ly, lr = loop["x"], st["top"] - loop["r"], loop["r"]
bandHalf = loop["band"] / 2

OUTLINE = (24, 14, 8)
RAIL = (196, 78, 22)
RAIL_LIGHT = (232, 110, 40)
BED = (247, 140, 46)
BED_LIGHT = (255, 170, 80)
BED_SHADE = (236, 122, 36)
SUPPORT = (44, 120, 210)
SUPPORT_DARK = (26, 80, 160)
BOX = (52, 130, 228)
BOX_LIGHT = (110, 180, 250)
BOX_DARK = (30, 84, 170)


def ellipse_dist(cx, x, y):
    """Signed distance-ish from the centreline of a half-ellipse end (positive outward)."""
    dx, dy = x - cx, y - cy
    # Scale to a circle of radius rx, so distance is measured in x pixels; good enough at ry/rx ~ 0.75.
    d = math.hypot(dx, dy * end["rx"] / end["ry"])
    return d - end["rx"]


def flat_dist(x, y):
    """Distance from the flat oval's centreline, with a flag for which piece."""
    if st["left"] <= x <= st["right"]:
        return min(abs(y - st["top"]), abs(y - st["bottom"]))
    if x > st["right"]:
        return abs(ellipse_dist(st["right"], x, y))
    return abs(ellipse_dist(st["left"], x, y))


def dither(x, y):
    return (x + y) % 2 == 0


def paint(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = c


# ---- the flat track: outline, rails, bed ----
for y in range(H):
    for x in range(W):
        d = flat_dist(x + 0.5, y + 0.5)
        if d <= half + 1.5:
            if d > half + 0.5:
                paint(x, y, OUTLINE)
            elif d > half - 3.5:
                paint(x, y, RAIL_LIGHT if d < half - 1.5 else RAIL)
            elif d > half - 4.5:
                paint(x, y, OUTLINE)
            else:
                # A lighter stripe down the middle of the bed, softly dithered.
                if d < 2.5:
                    paint(x, y, BED_LIGHT if dither(x, y) else BED)
                elif d > half - 7.5:
                    paint(x, y, BED_SHADE if dither(x, y) else BED)
                else:
                    paint(x, y, BED)

# ---- start line: a checkered band across the near straight ----
sx = geo["start"]["x"]
for y in range(int(st["bottom"] - half + 5), int(st["bottom"] + half - 4)):
    for x in range(sx - 3, sx + 3):
        k = ((x - sx + 3) // 3 + (y - int(st["bottom"] - half + 5)) // 3) % 2
        paint(x, y, (250, 250, 250) if k == 0 else (30, 30, 30))

# ---- the loop: two blue supports, then the ring ----
def ring_dist(x, y):
    return math.hypot(x - lx, y - ly) - lr

for y in range(int(ly), int(st["top"] - half + 1)):
    for x in range(int(lx - lr - bandHalf - 8), int(lx + lr + bandHalf + 9)):
        # Supports run from the ring's outer sides down to the far straight.
        for sxc in (lx - lr - 2, lx + lr + 2):
            if abs(x - sxc) <= 5 and y >= ly + 10:
                paint(x, y, OUTLINE if abs(x - sxc) == 5 else (SUPPORT_DARK if dither(x, y) and abs(x - sxc) > 2 else SUPPORT))

# the ring itself: the far half is the bed seen through the loop, the near rail is a separate image
front = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fpx = front.load()
for y in range(int(ly - lr - bandHalf - 2), int(ly + lr + bandHalf + 3)):
    for x in range(int(lx - lr - bandHalf - 2), int(lx + lr + bandHalf + 3)):
        d = ring_dist(x + 0.5, y + 0.5)
        if abs(d) > bandHalf + 1.5:
            continue
        # Do not paint over the far straight's own rails where the ring meets it.
        if y + 0.5 > st["top"] - half - 1 and abs(d) > 0 and d > 0:
            continue
        if abs(d) > bandHalf + 0.5:
            c = OUTLINE
        elif d > bandHalf - 3:
            c = RAIL_LIGHT if d < bandHalf - 1 else RAIL
        elif d > bandHalf - 4:
            c = OUTLINE
        elif d < -bandHalf + loop["lip"]:
            # The near rail: this goes on the overlay, not the background.
            inner = -bandHalf + loop["lip"]
            if d < -bandHalf + 1:
                c = OUTLINE
            elif d < -bandHalf + loop["lip"] - 1:
                c = RAIL if dither(x, y) else RAIL_LIGHT
            else:
                c = OUTLINE
            fpx[x, y] = c + (255,)
            # Under the lip the background still shows the bed, so a car clipped by it reads as inside.
            paint(x, y, BED_SHADE if dither(x, y) else BED)
            continue
        else:
            c = BED_LIGHT if (abs(d) < 2 and dither(x, y)) else BED
        paint(x, y, c)

# ---- the booster: a blue housing either side of the near straight, rollers on the bed ----
x0, x1 = boost["x0"], boost["x1"]
for (top, bottom) in ((st["bottom"] - half - 20, st["bottom"] - half - 1), (st["bottom"] + half + 1, st["bottom"] + half + 24)):
    for y in range(int(top), int(bottom)):
        for x in range(x0 - 6, x1 + 7):
            edge = x in (x0 - 6, x1 + 6) or y in (int(top), int(bottom) - 1)
            if edge:
                c = OUTLINE
            elif y < top + 4:
                c = BOX_LIGHT
            elif y > bottom - 5 or x > x1 + 2:
                c = BOX_DARK if dither(x, y) else BOX
            else:
                c = BOX
            paint(x, y, c)
# rollers: grey bars across the bed, the car rides over them
for x in range(x0, x1 + 1, 6):
    for y in range(int(st["bottom"] - half + 5), int(st["bottom"] + half - 4)):
        for dx in range(3):
            paint(x + dx, y, (90, 90, 100) if dx == 1 else (150, 150, 160))

os.makedirs("public/assets/race", exist_ok=True)
floor.save("public/assets/race/bg_0.png")
bbox = front.getbbox()
front.crop(bbox).save("public/assets/race/loop_front.png")
geo["loopFront"] = {"x": bbox[0], "y": bbox[1]}
geo["light"] = {"x": x1 + 1, "y": int(st["bottom"] + half + 12)}
json.dump(geo, open(GEO, "w"), indent=2)
open(GEO, "a").write("\n")
print("wrote public/assets/race/bg_0.png and loop_front.png", bbox)
