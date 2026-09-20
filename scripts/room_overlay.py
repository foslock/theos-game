#!/usr/bin/env python3
"""Draw a room's background with its hotspot zones, exits, walk targets and item
sprites placed the way GameScene places them.  room_overlay.py ROOM OUT.png [scale]"""
import os, re, sys
from PIL import Image, ImageDraw
room, out = sys.argv[1], sys.argv[2]
scale = int(sys.argv[3]) if len(sys.argv) > 3 else 2
ts = {"family_room": "familyRoom", "sport_court": "sportCourt"}.get(room, room)
src = open(f"src/data/rooms/{ts}.ts").read()
bg = Image.open(f"public/assets/{room}/bg_0.png").convert("RGBA")
colors = {"exit": (255, 0, 0), "pickup": (0, 200, 0), "backpack": (0, 200, 0), "container": (255, 140, 0), "decoration": (0, 120, 255), "talk": (200, 0, 200)}
# hotspot entries
for m in re.finditer(r"\{\s*(?:kind: '(\w+)',\s*)?(?:to|id): '(\w+)'(.*?)zone: \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}(.*?)\}", src, re.S):
    kind, name, pre, x, y, w, h, post = m.groups()
    kind = kind or "exit"
    x, y, w, h = map(int, (x, y, w, h))
    if kind in ("pickup", "backpack") and "hidden: true" not in (pre + post):
        item = re.search(r"item: '(\w+)'", pre + post)
        key = f"items/{item.group(1)}.png" if item else "items/backpack.png"
        p = f"public/assets/{key}"
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            bg.alpha_composite(im, (x + w // 2 - im.width // 2, y + h // 2 - im.height // 2))
d = ImageDraw.Draw(bg)
for m in re.finditer(r"\{\s*(?:kind: '(\w+)',\s*)?(?:to|id): '(\w+)'(.*?)zone: \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}(.*?)\}", src, re.S):
    kind, name, pre, x, y, w, h, post = m.groups()
    kind = kind or "exit"
    x, y, w, h = map(int, (x, y, w, h))
    c = colors.get(kind, (255, 255, 255))
    d.rectangle((x, y, x + w - 1, y + h - 1), outline=c)
    d.text((x + 2, y + 1), name, fill=c)
    wt = re.search(r"walkTo: \{ x: (\d+), y: (\d+) \}", post) or re.search(r"walkTo: \{ x: (\d+), y: (\d+) \}", pre)
    if wt:
        wx, wy = map(int, wt.groups())
        d.ellipse((wx - 3, wy - 3, wx + 3, wy + 3), fill=c)
        d.line((x + w // 2, y + h // 2, wx, wy), fill=c)
# Seeded spots: every place a pickup could be, dashed in green with its `where` phrase.
for m in re.finditer(r"\{ zone: \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}(.*?)where: (['\"])(.+?)\6 \}", src, re.S):
    x, y, w, h = map(int, m.groups()[:4])
    where = m.group(7)
    at = re.search(r"at: \{ x: (\d+), y: (\d+) \}", m.group(5))
    c = (0, 255, 120)
    for i in range(x, x + w, 4):
        d.line((i, y, min(i + 1, x + w - 1), y), fill=c); d.line((i, y + h - 1, min(i + 1, x + w - 1), y + h - 1), fill=c)
    for j in range(y, y + h, 4):
        d.line((x, j, x, min(j + 1, y + h - 1)), fill=c); d.line((x + w - 1, j, x + w - 1, min(j + 1, y + h - 1)), fill=c)
    if at:
        d.ellipse((int(at.group(1)) - 2, int(at.group(2)) - 2, int(at.group(1)) + 2, int(at.group(2)) + 2), outline=c)
    d.text((x, y + h + 1), where, fill=c)
for key, col in (("restPoint", (255, 255, 0)), ("lucyRestPoint", (255, 105, 180))):
    m = re.search(key + r": \{ x: (\d+), y: (\d+) \}", src)
    if m:
        px, py = map(int, m.groups())
        d.rectangle((px - 4, py - 4, px + 4, py + 4), fill=col)
d.line((0, 280, 640, 280), fill=(0, 0, 255))
bg.resize((640 * scale, 400 * scale), Image.NEAREST).save(out)
print(out)
