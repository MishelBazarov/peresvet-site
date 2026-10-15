"""Extract the horseman (without stars/rectangle) from the potrace flag SVG.

Usage: python3 -I horseman.py <in.svg> <out.svg>
"""
import re
import sys

src = open(sys.argv[1], encoding="utf-8").read()
paths = re.findall(r'<path d="([^"]+)"', src, re.S)
main = " ".join(paths[0].split())
islands = [" ".join(p.split()) for p in paths[1:]]

TOK = re.compile(r"[MmLlCcZz]|-?\d+(?:\.\d+)?")


def subpaths(d):
    """Split a path into subpaths, returning list of (abs_start, tokens, abs_points)."""
    toks = TOK.findall(d)
    out, cur, start, sub, pts = [], (0.0, 0.0), (0.0, 0.0), None, []
    i, cmd = 0, None
    while i < len(toks):
        t = toks[i]
        if t in "MmLlCcZz":
            cmd = t
            i += 1
            if cmd in "Zz":
                sub["toks"].append("z")
                out.append(sub)
                cur = start
                sub = None
                continue
            continue
        # numbers
        if cmd in "Mm":
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if cmd == "m":
                x, y = cur[0] + x, cur[1] + y
            cur = start = (x, y)
            sub = {"start": (x, y), "toks": [], "pts": [(x, y)]}
            cmd = "l" if cmd == "m" else "L"
            continue
        if cmd in "Ll":
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            sub["toks"].append(("l", x, y) if cmd == "l" else ("L", x, y))
            if cmd == "l":
                cur = (cur[0] + x, cur[1] + y)
            else:
                cur = (x, y)
            sub["pts"].append(cur)
            continue
        if cmd in "Cc":
            nums = [float(v) for v in toks[i:i + 6]]; i += 6
            sub["toks"].append((cmd, *nums))
            if cmd == "c":
                for k in (0, 2):
                    sub["pts"].append((cur[0] + nums[k], cur[1] + nums[k + 1]))
                cur = (cur[0] + nums[4], cur[1] + nums[5])
            else:
                sub["pts"] += [(nums[0], nums[1]), (nums[2], nums[3])]
                cur = (nums[4], nums[5])
            sub["pts"].append(cur)
            continue
        raise ValueError(t)
    return out


def emit(sub):
    parts = [f"M{sub['start'][0]:g} {sub['start'][1]:g}"]
    last = None
    for tk in sub["toks"]:
        if tk == "z":
            parts.append("z"); last = None; continue
        c, *n = tk
        s = " ".join(f"{v:g}" for v in n)
        parts.append(s if c == last else f"{c}{s}")
        last = c
    return "".join(p if p[0].isalpha() or p == "z" else " " + p for p in parts)


subs = subpaths(main)
# subpath 0 is the outer rectangle; the biggest remaining one is the horseman, the small ones are stars
def area(s):
    xs = [p[0] for p in s["pts"]]; ys = [p[1] for p in s["pts"]]
    return (max(xs) - min(xs)) * (max(ys) - min(ys))

rest = subs[1:]
horse = max(rest, key=area)
isl = [subpaths(d)[0] for d in islands]

xs = [p[0] for p in horse["pts"]]; ys = [p[1] for p in horse["pts"]]
# potrace group transform: x' = 0.1x, y' = 298 - 0.1y
minx, maxx = min(xs) * 0.1, max(xs) * 0.1
miny, maxy = 298 - max(ys) * 0.1, 298 - min(ys) * 0.1
pad = 4
vb = (minx - pad, miny - pad, (maxx - minx) + 2 * pad, (maxy - miny) + 2 * pad)

# shield quadrants sit around x 2400-2750, y 1550-2050 (potrace units); others are cut-outs
shield, holes = [], []
for s in isl:
    cx = sum(p[0] for p in s["pts"]) / len(s["pts"])
    cy = sum(p[1] for p in s["pts"]) / len(s["pts"])
    (shield if 2350 < cx < 2800 and 1500 < cy < 2100 else holes).append(s)

body = emit(horse) + "".join(emit(h) for h in holes)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" role="img" aria-label="Пересвет на коне — фигура с флага клуба">
  <g transform="translate(0 298) scale(0.1 -0.1)">
    <path fill="currentColor" fill-rule="evenodd" d="{body}"/>
    <path fill="#B3202A" class="shield" d="{''.join(emit(s) for s in shield)}"/>
  </g>
</svg>
'''
open(sys.argv[2], "w", encoding="utf-8").write(svg)
print("subpaths:", len(subs), "islands:", len(isl), "shield:", len(shield), "holes:", len(holes), "viewBox:", [round(v, 1) for v in vb])
