#!/usr/bin/env python3
"""Fit a 632x424 PixelLab room render to the game's 640x400 background pair.

  python3 scripts/fit_room.py NAME RAW_PNG [--top 24] [--overlay OUT.png]

Crops `--top` rows of ceiling, pads 4px on each side by repeating the edge
column and writes public/assets/<NAME>/bg_0.png. (It used to write a second
frame with shifted highlights too; the rooms are single-frame now, the
flicker read as the windows changing brightness.) With --overlay it also
draws the room's current hotspot zones (parsed from src/data/rooms) at 2x for
lining up the art."""
import os, re, sys
from PIL import Image, ImageDraw

name, raw = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
top = int(args[args.index("--top") + 1]) if "--top" in args else 24
overlay = args[args.index("--overlay") + 1] if "--overlay" in args else None

im = Image.open(raw).convert("RGB")
assert im.size == (632, 424), im.size
im = im.crop((0, top, 632, top + 400))
out = Image.new("RGB", (640, 400))
out.paste(im, (4, 0))
out.paste(im.crop((0, 0, 1, 400)).resize((4, 400)), (0, 0))
out.paste(im.crop((631, 0, 632, 400)).resize((4, 400)), (636, 0))
d = f"public/assets/{name}"
os.makedirs(d, exist_ok=True)
out.save(f"{d}/bg_0.png")

print("wrote", d)

if overlay:
    ts = {"family_room": "familyRoom", "sport_court": "sportCourt"}.get(name, name)
    src = open(f"src/data/rooms/{ts}.ts").read()
    ov = out.copy()
    dr = ImageDraw.Draw(ov)
    for m in re.finditer(r"(?:id|to): '(\w+)'.*?zone: \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}", src, re.S):
        i, x, y, w, h = m.group(1), *map(int, m.groups()[1:])
        dr.rectangle((x, y, x + w, y + h), outline=(255, 0, 0))
        dr.text((x + 2, y + 2), i, fill=(255, 0, 0))
    for m in re.finditer(r"(?:restPoint|lucyRestPoint|walkTo): \{ x: (\d+), y: (\d+) \}", src):
        x, y = map(int, m.groups())
        dr.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(0, 0, 255))
    dr.line((0, 280, 640, 280), fill=(0, 0, 255))
    ov.resize((1280, 800), Image.NEAREST).save(overlay)
    print("overlay", overlay)
