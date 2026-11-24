# Baloo 2: the bar in lslash/Lslash is almost horizontal, so the lowercase one looks like t. Rotate the bar by a dozen-odd degrees (in gvar too).
# Usage: python3 font-slash.py <input.ttf> <output.ttf> <degrees> (needs fonttools; applied: 32).
import math, sys
from fontTools.ttLib import TTFont
src, dst, deg = sys.argv[1], sys.argv[2], float(sys.argv[3])
f = TTFont(src)
gl, gv = f['glyf'], f['gvar']
a = math.radians(deg); ca, sa = math.cos(a), math.sin(a)
for name in ['lslash', 'Lslash']:
    g = gl[name]
    coords, ends, _ = g.getCoordinates(gl)
    n0 = ends[0] + 1
    pts = [coords[i] for i in range(n0)]
    cx = sum(p[0] for p in pts) / n0; cy = sum(p[1] for p in pts) / n0
    for i in range(n0):
        x, y = coords[i][0] - cx, coords[i][1] - cy
        coords[i] = (round(cx + x * ca - y * sa), round(cy + x * sa + y * ca))
    g.coordinates = coords
    g.recalcBounds(gl)
    for tv in gv.variations.get(name, []):
        for i in range(n0):
            d = tv.coordinates[i]
            if d is None: continue
            tv.coordinates[i] = (round(d[0] * ca - d[1] * sa), round(d[0] * sa + d[1] * ca))
f.save(dst)
print('ok')
