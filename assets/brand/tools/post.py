"""Clean vtracer output: drop blue background, recolour to the site gold, crop to the figure.

Usage: python3 -I post.py raw.svg out.svg
Also prints the figure's points-based minimum enclosing circle (in output viewBox units).
"""
import math
import random
import re
import sys

raw = open(sys.argv[1], encoding="utf-8").read()

SAMPLES = {
    (26, 52, 214): None,          # blue background
    (242, 236, 86): "#EDD493",    # light gold
    (228, 196, 62): "#D2AC5E",    # mid gold
    (176, 128, 44): "#7A5620",    # dark lines
    (214, 44, 28): "#B3202A",     # shield red
    (240, 240, 236): "#F4EFE3",
    (60, 50, 40): "#3A2A14",
}

paths, pts = [], []
for m in re.finditer(r'<path d="([^"]+)" fill="#([0-9A-Fa-f]{6})"(?: transform="translate\(([-\d.]+),([-\d.]+)\)")?\s*/>', raw):
    d, hexcol, tx, ty = m.groups()
    tx, ty = float(tx or 0), float(ty or 0)
    rgb = tuple(int(hexcol[i:i + 2], 16) for i in (0, 2, 4))
    key = min(SAMPLES, key=lambda s: sum((a - b) ** 2 for a, b in zip(s, rgb)))
    colour = SAMPLES[key]
    if colour is None:
        continue
    nums = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
    xy = [(nums[i] + tx, nums[i + 1] + ty) for i in range(0, len(nums) - 1, 2)]
    pts += xy
    paths.append((d, colour, tx, ty))

xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
pad = 6
vb = (minx - pad, miny - pad, maxx - minx + 2 * pad, maxy - miny + 2 * pad)

# darker layers last so lines sit on top of fills (cutout mode makes them disjoint anyway)
order = {"#EDD493": 0, "#D2AC5E": 1, "#7A5620": 2, "#B3202A": 3, "#F4EFE3": 4, "#3A2A14": 5}
paths.sort(key=lambda p: order.get(p[1], 9))
body = "\n".join(
    f'  <path d="{d}" fill="{c}"' + (f' transform="translate({tx:g},{ty:g})"' if tx or ty else "") + "/>"
    for d, c, tx, ty in paths
)
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" '
    f'role="img" aria-label="Пересвет на коне — фигура с флага клуба">\n{body}\n</svg>\n'
)
open(sys.argv[2], "w", encoding="utf-8").write(svg)


# minimum enclosing circle (Welzl, iterative)
def circle2(a, b):
    c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    return c, math.dist(a, c)


def circle3(a, b, c):
    ax, ay = a; bx, by = b; cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-12:
        return None
    ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
    return (ux, uy), math.dist((ux, uy), a)


def inside(c, p):
    return c is not None and math.dist(c[0], p) <= c[1] + 1e-7


def mec(points):
    p = points[:]
    random.seed(1)
    random.shuffle(p)
    c = None
    for i, a in enumerate(p):
        if inside(c, a):
            continue
        c = (a, 0)
        for j in range(i):
            b = p[j]
            if inside(c, b):
                continue
            c = circle2(a, b)
            for k in range(j):
                q = p[k]
                if inside(c, q):
                    continue
                c = circle3(a, b, q) or c
    return c


# outer points only are enough: thin the set
sample = pts[::3]
(cx, cy), r = mec(sample)
print(f"paths={len(paths)} size={len(svg)/1024:.0f}KB viewBox={[round(v) for v in vb]}")
print(f"MEC centre=({cx:.1f},{cy:.1f}) r={r:.1f}  -> relative to viewBox: "
      f"cx={(cx - vb[0]) / vb[2]:.4f} cy={(cy - vb[1]) / vb[3]:.4f} r/w={r / vb[2]:.4f} r/h={r / vb[3]:.4f}")
