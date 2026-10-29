"""
Places Nora's avatar paintings and extras in the circle, from the drawings themselves.

For each character it finds the eyes (the two biggest solid ink dots), the mouth (the ink mark just
below them), which way the face tilts, the top of the head, and where the visual weight is.
Then it writes src/components/avatarLayout.ts:
  - the character, optically centered (its weight, not its box, sits in the middle of the circle),
  - each extra sized from the face and turned with it: glasses on the eyes, the mustache over the
    mouth, a bow tie under it, a bow and a flower on the head, hats on top (with the character
    made a little smaller so the whole hat fits).

Run from the repo root:  python3 scripts/avatar-layout.py
Needs Pillow, numpy and scipy. Hand tweaks go in TWEAKS below, so a rerun keeps them.
"""
import json
import math

import numpy as np
from PIL import Image
from scipy import ndimage as nd

CHARACTERS = ['onigiri', 'lemon', 'marshmallow', 'toast', 'cloud', 'frog', 'cat', 'dog', 'pickle', 'goldfish', 'turtle', 'carrot', 'plant', 'mug', 'sushi', 'ramen']
EXTRAS = {'bow': 'bow', 'bowtie': 'bow-tie', 'glasses': 'glasses', 'mustache': 'mustache', 'flower': 'flower', 'partyhat': 'party-hat', 'witchhat': 'witch-hat'}
# Busts are cut off by the circle at the bottom, like a portrait.
BUSTS = {'cat', 'dog'}
# Characters whose face would be too small whole: framed as a portrait instead, zoomed in on the face
# and cropped by the circle (Nora: it's fine to crop them, like Pichi). Eye distance, and where the
# point between the eyes goes, all in circle units.
PORTRAITS = {
    'frog': {'d': 11, 'x': 20, 'y': 15},
    'turtle': {'d': 9, 'x': 21.5, 'y': 15.5},
    'pickle': {'d': 7.2, 'x': 20, 'y': 16.5},
    'carrot': {'d': 7.2, 'x': 20, 'y': 17.5},
    'plant': {'d': 6.8, 'x': 20, 'y': 23.5},
}
R = 20  # circle radius, on a 40 x 40 grid

# Per character, per extra: size (times the computed size), nudge (in eye distances), turn (degrees).
TWEAKS = {
    'frog': {'glasses': {'size': 0.686, 'nudge': (-0.04, 0.08), 'turn': 2}, 'bowtie': {'nudge': (0, -0.2)}, 'partyhat': {'sink': 0.05}, 'witchhat': {'sink': 0.12}, 'bow': {'nudge': (0.42, -0.42), 'size': 0.72}, 'flower': {'nudge': (-0.45, -0.4), 'size': 0.8}},
    'lemon': {'bow': {'nudge': (0.35, -0.35)}},
    'plant': {'partyhat': {'size': 0.9, 'top': 'highest'}, 'witchhat': {'size': 0.9, 'top': 'highest'}, 'bowtie': {'nudge': (0, -0.35)}},
    'carrot': {'partyhat': {'top_frac': 0.33}, 'witchhat': {'top_frac': 0.33}},
    'goldfish': {'bow': {'nudge': (0.4, 0.2)}},
}


def load(path):
    im = Image.open(path).convert('RGBA')
    return np.asarray(im).astype(float)


def solid_blobs(a):
    rgb, al = a[..., :3], a[..., 3]
    lum = rgb @ [0.299, 0.587, 0.114]
    lab, k = nd.label((al > 200) & (lum < 85))
    out = []
    for i in range(1, k + 1):
        ys, xs = np.where(lab == i)
        n = len(xs)
        if n < 25 or n > 3000:
            continue
        bw, bh = np.ptp(xs) + 1, np.ptp(ys) + 1
        out.append({'x': xs.mean(), 'y': ys.mean(), 'n': n, 'fill': n / (bw * bh), 'bw': bw, 'bh': bh})
    return out


def walk(alpha, start, direction, step=1.0):
    """From start, walk in direction until leaving the drawing. Returns the last point inside."""
    h, w = alpha.shape
    x, y = start
    dx, dy = direction
    last = (x, y)
    gap = 0
    for _ in range(2000):
        x += dx * step
        y += dy * step
        if not (0 <= x < w and 0 <= y < h):
            break
        if alpha[int(y), int(x)] > 60:
            last = (x, y)
            gap = 0
        else:
            gap += 1
            if gap > 6:
                break
    return last


def measure(name):
    a = load(f'assets/avatars/{name}.webp')
    h, w = a.shape[:2]
    alpha = a[..., 3]
    blobs = solid_blobs(a)
    eyes = sorted([b for b in blobs if b['fill'] > 0.55 and 0.5 < b['bh'] / b['bw'] < 3], key=lambda b: -b['n'])[:2]
    eyes.sort(key=lambda b: b['x'])
    (lx, ly), (rx, ry) = (eyes[0]['x'], eyes[0]['y']), (eyes[1]['x'], eyes[1]['y'])
    d = math.hypot(rx - lx, ry - ly)
    tilt = math.atan2(ry - ly, rx - lx)
    ex, ey = (lx + rx) / 2, (ly + ry) / 2
    up = (math.sin(tilt), -math.cos(tilt))
    down = (-up[0], -up[1])
    # The mouth: an ink mark below the eyes, closest to where a mouth would be.
    guess = (ex + down[0] * 0.45 * d, ey + down[1] * 0.45 * d)
    cands = [b for b in blobs if b not in eyes and b['n'] < 1500 and math.hypot(b['x'] - guess[0], b['y'] - guess[1]) < 0.6 * d]
    if cands:
        m = min(cands, key=lambda b: math.hypot(b['x'] - guess[0], b['y'] - guess[1]))
        mouth = (m['x'], m['y'])
    else:
        mouth = guess
    top = walk(alpha, (ex, ey), up)
    yy, xx = np.mgrid[0:h, 0:w]
    m = alpha / 255
    centroid = ((xx * m).sum() / m.sum(), (yy * m).sum() / m.sum())
    return {'line': line_thickness(a), 'w': w, 'h': h, 'alpha': alpha, 'eye': (ex, ey), 'd': d, 'tilt': tilt, 'up': up, 'mouth': mouth, 'top': top, 'centroid': centroid, 'mass': m.sum()}


def extra_info(key):
    a = load(f'assets/avatars/extras/{EXTRAS[key]}.webp')
    h, w = a.shape[:2]
    al = a[..., 3]
    info = {'w': w, 'h': h}
    if key == 'glasses':
        # The two lens holes: see-through areas that don't touch the edge.
        lab, k = nd.label(al < 40)
        holes = []
        for i in range(1, k + 1):
            ys, xs = np.where(lab == i)
            if xs.min() == 0 or ys.min() == 0 or xs.max() == w - 1 or ys.max() == h - 1 or len(xs) < 200:
                continue
            holes.append((xs.mean(), ys.mean()))
        holes.sort()
        info['lenses'] = holes[:2]
    if key in ('partyhat', 'witchhat'):
        # The base: from the leftmost point to the lowest point on the right (the rim).
        ys, xs = np.where(al > 60)
        left = (xs.min(), ys[xs == xs.min()].mean())
        right_half = xs > w * 0.55
        low_y = ys[right_half].max()
        right = (xs[right_half][ys[right_half] == low_y].mean(), low_y)
        info['base'] = (left, right)
    return info


# Pichi's avatar: her 720 px painting shown 120 units wide, with lines about 7.2 px thick, so her
# line art is 1.2 units thick in the circle. Every character is zoomed so its lines match (Nora).
LINE = 7.21 * 120 / 720 * 0.75


def line_thickness(alpha_rgba):
    lum = alpha_rgba[..., :3] @ [0.299, 0.587, 0.114]
    dark = (alpha_rgba[..., 3] > 200) & (lum < 90)
    dt = nd.distance_transform_edt(dark)
    ridge = (dt == nd.maximum_filter(dt, size=3)) & (dt >= 1)
    return 2 * float(np.median(dt[ridge]))


# Characters that need their signature part in view: zoom (times the line-weight zoom) and where the
# face goes (x, y in circle units), so the leaves, the handle, the filling or the noodles still show.
FRAMES = {
    'plant': {'zoom': 0.6, 'y': 28},
    'mug': {'zoom': 0.8, 'x': 17, 'y': 23},
    'sushi': {'zoom': 0.82, 'y': 26},
    'ramen': {'zoom': 0.82, 'y': 26.5},
}


def char_frame(name, me):
    """Zoomed so the line art matches Pichi's, with the face (eyes and mouth) centered in the circle."""
    f = FRAMES.get(name, {})
    s = LINE / me['line'] * f.get('zoom', 1)
    fx = (me['eye'][0] + me['mouth'][0]) / 2
    fy = (me['eye'][1] + me['mouth'][1]) / 2
    return s, f.get('x', 20) - fx * s, f.get('y', 20.5) - fy * s


def char_frame_old(name, me):
    """Scale (circle units per drawing pixel) and offset, optically centered."""
    if name in PORTRAITS:
        p = PORTRAITS[name]
        s = p['d'] / me['d']
        return s, p['x'] - me['eye'][0] * s, p['y'] - me['eye'][1] * s
    if name in BUSTS:
        s = 33 / me['w']
        cx = 20 - me['centroid'][0] * s
        top = 24 - me['h'] * s / 2
        return s, cx, top
    s = math.sqrt(470 / me['mass'])
    s = min(s, 31 / me['h'], 31.5 / me['w'])
    while True:
        ox = 20 - me['centroid'][0] * s
        oy = 19.7 - me['centroid'][1] * s
        ys, xs = np.where(me['alpha'] > 60)
        dist = np.hypot(ox + xs * s - 20, oy + ys * s - 20)
        if (dist > 18.4).mean() < 0.004:
            return s, ox, oy
        s *= 0.97


def rot(p, c, ang):
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(ang) - y * math.sin(ang), c[1] + x * math.sin(ang) + y * math.cos(ang))


# Never smaller than this (circle units), so extras read on small faces too.
MIN = {'glasses': 13, 'mustache': 7.5, 'bowtie': 8, 'bow': 11, 'flower': 8, 'partyhat': 10.5, 'witchhat': 15}


def place_extra(name, key, me, frame, ex):
    s, ox, oy = frame
    to = lambda p: (ox + p[0] * s, oy + p[1] * s)
    d = me['d'] * s
    tilt = me['tilt']
    up = me['up']
    tw = TWEAKS.get(name, {}).get(key, {})
    size = tw.get('size', 1.0)
    turn = tw.get('turn', 0.0)
    eye = to(me['eye'])
    mouth = to(me['mouth'])
    deg = math.degrees(tilt)

    def at(center, width, r, anchor=(0.5, 0.5)):
        width = max(width, MIN[key] * size)
        nx, ny = tw.get('nudge', (0, 0))
        center = (center[0] + nx * d, center[1] + ny * d)
        hgt = width * ex['h'] / ex['w']
        x = center[0] - anchor[0] * width
        y = center[1] - anchor[1] * hgt
        return {'x': round(x, 2), 'y': round(y, 2), 'w': round(width, 2), 'h': round(hgt, 2), 'r': round(r + turn, 1), 'rx': round(center[0], 2), 'ry': round(center[1], 2)}

    if key == 'glasses':
        (l1, _), (l2, _) = ex['lenses']
        # Big, so Nora's line art reads at small sizes too, and a little above the eyes.
        width = d / ((l2 - l1) / ex['w']) * 1.5 * size
        ay = np.mean([p[1] for p in ex['lenses']]) / ex['h']
        c = (eye[0] + up[0] * 0.12 * d, eye[1] + up[1] * 0.12 * d)
        return at(c, width, deg, (np.mean([l1, l2]) / ex['w'], ay))
    if key == 'mustache':
        c = (mouth[0] - up[0] * 0.04 * d, mouth[1] - up[1] * 0.04 * d)
        return at(c, 1.55 * d * size, deg)
    if key == 'bowtie':
        c = (mouth[0] - up[0] * 0.8 * d, mouth[1] - up[1] * 0.8 * d)
        return at(c, 1.3 * d * size, deg)
    if key in ('bow', 'flower'):
        side = 1 if key == 'bow' else -1
        ang = tilt + side * math.radians(42)
        direction = (math.sin(ang), -math.cos(ang))
        edge = walk(me['alpha'], me['eye'], direction)
        p = to(edge)
        p = (p[0] - direction[0] * 0.06 * d, p[1] - direction[1] * 0.06 * d)
        width = max((2.1 if key == 'bow' else 1.35) * d * size, MIN[key] * size)
        # Keep it inside the circle (busts reach the edge).
        dist = math.hypot(p[0] - 20, p[1] - 20)
        room = 19.2 - 0.42 * width
        if dist > room:
            p = (20 + (p[0] - 20) * room / dist, 20 + (p[1] - 20) * room / dist)
        return at(p, width, deg + side * 14)
    if key in ('partyhat', 'witchhat'):
        (bl, br) = ex['base']
        base_angle = math.degrees(math.atan2(br[1] - bl[1], br[0] - bl[0]))
        anchor = (((bl[0] + br[0]) / 2) / ex['w'], ((bl[1] + br[1]) / 2) / ex['h'])
        top = me['top']
        if 'top_frac' in tw:
            # A set height on the drawing (like where a carrot's leaves start), above the face.
            top = (me['eye'][0], tw['top_frac'] * me['h'])
        if tw.get('top') == 'highest':
            # The very top of the drawing above the face (past any gaps, like a plant's leaves).
            ys, xs = np.where(me['alpha'] > 60)
            near = np.abs(xs - me['eye'][0]) < me['d'] * 0.8
            i = np.argmin(ys[near])
            top = (xs[near][i], ys[near][i])
        top = to(top)
        sink = tw.get('sink', 0.3 if key == 'partyhat' else 0.42) * d
        p = (top[0] - up[0] * sink, top[1] - up[1] * sink)
        width = (2.0 if key == 'partyhat' else 2.9) * d * size
        return at(p, width, deg - base_angle * 0.85, anchor)
    raise ValueError(key)


def fit_hat(char_box, hat):
    """Shrink and lower the whole avatar so the hat fits inside the circle. Returns [k, dx, dy]."""
    cx, cy = hat['rx'], hat['ry']
    corners = [(hat['x'], hat['y']), (hat['x'] + hat['w'], hat['y']), (hat['x'], hat['y'] + hat['h']), (hat['x'] + hat['w'], hat['y'] + hat['h'])]
    corners = [rot(p, (cx, cy), math.radians(hat['r'])) for p in corners]
    top = min(p[1] for p in corners)
    bottom = char_box[1] + char_box[3]
    span = bottom - top
    k = min(1.0, 34.5 / span)
    # Center the hat + character vertically, a touch high.
    dy = 19.6 - (top + span / 2) * k
    dx = 20 - 20 * k
    return [round(k, 3), round(dx, 2), round(dy, 2)]


def fit_hat_portrait(hat):
    """Portraits and busts stay cut off at the bottom: shrink toward the bottom of the circle just
    enough for the hat to fit, so the face stays big."""
    cx, cy = hat['rx'], hat['ry']
    corners = [(hat['x'], hat['y']), (hat['x'] + hat['w'], hat['y']), (hat['x'], hat['y'] + hat['h']), (hat['x'] + hat['w'], hat['y'] + hat['h'])]
    top = min(rot(p, (cx, cy), math.radians(hat['r']))[1] for p in corners)
    k = min(1.0, 38.0 / (40 - top))
    return [round(k, 3), round(20 - 20 * k, 2), round(40 - 40 * k, 2)]


def main():
    extras = {k: extra_info(k) for k in EXTRAS}
    layout = {}
    for name in CHARACTERS:
        me = measure(name)
        frame = char_frame(name, me)
        s, ox, oy = frame
        box = (ox, oy, me['w'] * s, me['h'] * s)
        entry = {'x': round(box[0], 2), 'y': round(box[1], 2), 'w': round(box[2], 2), 'h': round(box[3], 2), 'extras': {}}
        for key in EXTRAS:
            e = place_extra(name, key, me, frame, extras[key])
            if key in ('partyhat', 'witchhat'):
                e['fit'] = fit_hat_portrait(e)
            entry['extras'][key] = e
        layout[name] = entry
    body = json.dumps(layout, indent=2)
    with open('src/components/avatarLayout.ts', 'w') as f:
        f.write('// Made by scripts/avatar-layout.py from Nora\'s drawings. Rerun it instead of editing by hand.\n')
        f.write('// Character box and each extra on a 40 x 40 circle: x, y, w, h, turned r degrees around (rx, ry).\n')
        f.write('// fit: [scale, dx, dy] for the whole avatar, so a hat fits in the circle.\n\n')
        f.write('export type Placed = { x: number; y: number; w: number; h: number; r: number; rx: number; ry: number; fit?: [number, number, number] }\n')
        f.write('export type CharacterLayout = { x: number; y: number; w: number; h: number; extras: Record<string, Placed> }\n\n')
        f.write(f'export const AVATAR_LAYOUT: Record<string, CharacterLayout> = {body}\n')
    print('wrote src/components/avatarLayout.ts')


if __name__ == '__main__':
    main()
