#!/usr/bin/env python3
"""Numbered contact sheet of PixelLab candidates: contact_sheet.py DIR/NAME OUT.png"""
import glob, os, re, sys
from PIL import Image, ImageDraw
base, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(base + "_*.png"), key=lambda f: int(re.search(r"_(\d+)\.png$", f).group(1)))
imgs = [Image.open(f).convert("RGBA") for f in files]
w, h = imgs[0].size
scale = max(1, 96 // max(w, h))
cols = 8 if len(imgs) > 16 else 4
cell_w, cell_h = w * scale + 8, h * scale + 8
rows = (len(imgs) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (110, 110, 110, 255))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(imgs):
    x, y = (i % cols) * cell_w, (i // cols) * cell_h
    sheet.alpha_composite(im.resize((w * scale, h * scale), Image.NEAREST), (x + 4, y + 4))
    d.text((x + 4, y + 2), str(i), fill=(255, 255, 0, 255))
sheet.save(out)
print(len(imgs), "candidates", (w, h), "->", out)
