"""Detailed colour vector of the horseman from the flag photo.

Usage: python -I vectorize.py <flag.png> <out.svg> <debug_dir>
"""
import re
import sys

import vtracer
from PIL import Image, ImageFilter

src, out_svg, dbg = sys.argv[1], sys.argv[2], sys.argv[3]
SCALE = 6
BOX = (100, 8, 352, 290)  # horseman area in the 450x298 photo

im = Image.open(src).convert("RGB").crop(BOX)
im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
im = im.filter(ImageFilter.GaussianBlur(1.6))

# palette: name -> (sample colour in photo, output colour on the site)
PALETTE = {
    "bg": ((26, 52, 214), None),
    "gold_light": ((242, 236, 86), "#EDD493"),
    "gold_mid": ((228, 196, 62), "#D6B163"),
    "line": ((176, 128, 44), "#7E5A22"),
    "red": ((214, 44, 28), "#B3202A"),
    "white": ((240, 240, 236), "#F4EFE3"),
    "dark": ((60, 50, 40), "#3A2A14"),
}
names = list(PALETTE)
samples = [PALETTE[n][0] for n in names]


def nearest(px):
    r, g, b = px
    best, bd = 0, 1e18
    for i, (sr, sg, sb) in enumerate(samples):
        d = 2 * (r - sr) ** 2 + 4 * (g - sg) ** 2 + 3 * (b - sb) ** 2
        if d < bd:
            best, bd = i, d
    return best


idx = Image.new("P", im.size)
idx.putpalette([c for s in samples for c in s] + [0] * (768 - 3 * len(samples)))
idx.putdata([nearest(p) for p in im.getdata()])
idx = idx.filter(ImageFilter.ModeFilter(7))
q = idx.convert("RGB")
q.save(f"{dbg}/quantized.png")

# vtracer wants a list of RGBA tuples
rgba = q.convert("RGBA")
pixels = list(rgba.getdata())
svg = vtracer.convert_pixels_to_svg(
    pixels,
    size=rgba.size,
    colormode="color",
    hierarchical="cutout",
    mode="spline",
    filter_speckle=24,
    color_precision=8,
    layer_difference=6,
    corner_threshold=70,
    length_threshold=5.0,
    max_iterations=10,
    splice_threshold=45,
    path_precision=1,
)

# drop background, recolour to the site palette
out_paths = []
lookup = {s: PALETTE[n][1] for n, s in zip(names, samples)}
for m in re.finditer(r'<path d="([^"]+)" fill="#([0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"/>', svg):
    d, hexcol, tx, ty = m.groups()
    rgb = tuple(int(hexcol[i:i + 2], 16) for i in (0, 2, 4))
    key = min(samples, key=lambda s: sum((a - b) ** 2 for a, b in zip(s, rgb)))
    colour = lookup[key]
    if colour is None:
        continue
    out_paths.append(f'<path d="{d}" fill="{colour}" transform="translate({tx},{ty})"/>')

w, h = rgba.size
result = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
    f'aria-label="Пересвет на коне — фигура с флага клуба">\n' + "\n".join(out_paths) + "\n</svg>\n"
)
open(out_svg, "w", encoding="utf-8").write(result)
print("paths:", len(out_paths), "of", svg.count("<path"), "size KB:", round(len(result) / 1024, 1), "viewBox:", w, h)
