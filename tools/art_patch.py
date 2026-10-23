"""Patch art (art/patch/art/**): replaced hero sheets, chest, world objects, title, Windows icon.
Entry point: build_patch(reg, log) called from build_art.py after the other builders."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import ROOT, OUT, components, dilate, frame_meta, label_components, save_frame, trim_pad

P = ROOT / 'art' / 'patch' / 'art'
DIRS = ['down', 'left', 'right', 'up']


def defringe(img: Image.Image, solid: int = 200) -> Image.Image:
    """Source sheets carry a red/orange semi-transparent halo. Binarise alpha (pixel-art edge), then strip remaining reddish
    edge pixels that were not fully opaque in the source. Interior reds (Tien's sash) are never touched (only silhouette edge)."""
    a = np.array(img.convert('RGBA'))
    al = a[..., 3].astype(int)
    keep = al >= solid
    # remove tiny specks
    lab, n = label_components(dilate(keep, 1))
    if n:
        sizes = np.bincount(lab[keep], minlength=n + 1)
        small = sizes < 12
        keep &= ~small[lab]
    for _ in range(3):
        p = np.pad(keep, 1)
        edge = keep & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
        r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        reddish = (r > g + 28) & (r > b + 28) & (r > 110)
        halo = edge & reddish & (al < 252)
        if not halo.any():
            break
        keep &= ~halo
    out = a.copy()
    out[..., 3] = np.where(keep, 255, 0)
    out[~keep, :3] = 0
    return Image.fromarray(out, 'RGBA')


def sheet(name):
    raw = Image.open(P / 'characters' / f'{name}_replacement.png').convert('RGBA')
    im = defringe(raw)
    boxes = [tuple(int(v) for v in b) for b in components(im, dil=5, min_area=500, thr=90)]
    return im, boxes


def overview(name, out):
    from PIL import ImageDraw
    im, boxes = sheet(name)
    bg = Image.new('RGBA', im.size, (60, 64, 90, 255)); bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    for i, (x, y, w, h) in enumerate(boxes):
        d.rectangle([x, y, x + w, y + h], outline=(255, 40, 40, 255))
        d.rectangle([x, y, x + 30, y + 13], fill=(0, 0, 0, 255))
        d.text((x + 2, y + 1), str(i), fill=(255, 255, 0, 255))
    bg.save(out)
    return boxes


def _bands(mask1d, gap=2, minlen=8):
    out, s, last = [], None, None
    for i, v in enumerate(mask1d):
        if v:
            if s is None: s = i
            last = i
        elif s is not None and i - last > gap:
            out.append((s, last + 1)); s = None
    if s is not None: out.append((s, last + 1))
    return [(a, b) for a, b in out if b - a >= minlen]


def only_main(img: Image.Image, thr=0.12) -> Image.Image:
    a = np.array(img)
    m = a[..., 3] > 24
    lab, n = label_components(dilate(m, 2))
    if n < 2:
        return img
    sizes = [int(((lab == i) & m).sum()) for i in range(1, n + 1)]
    big = max(sizes)
    keep = np.zeros(m.shape, bool)
    for i in range(1, n + 1):
        if sizes[i - 1] >= thr * big:
            keep |= (lab == i) & m
    a[~keep, 3] = 0
    return Image.fromarray(a, 'RGBA')


def ow_grid(im, x0, y0, x1, y1):
    """4x4 overworld grid inside a region -> rows x 4 column frames. Columns from empty x-gaps; rows touch vertically,
    so cut at the deepest y-projection valley near each quarter."""
    a = np.array(im)[..., 3] > 90
    reg = a[y0:y1, x0:x1]
    cols = _bands(reg.any(0), gap=6)
    assert len(cols) == 4, cols
    ys = np.nonzero(reg.any(1))[0]
    top, bot = int(ys.min()), int(ys.max()) + 1
    proj = np.convolve(reg.sum(1).astype(float), np.ones(3) / 3, 'same')
    h = (bot - top) / 4
    cuts = [top]
    for k in range(1, 4):
        c = top + h * k
        lo, hi = int(c - 0.25 * h), int(c + 0.25 * h)
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    cuts.append(bot)
    return [[only_main(im.crop((x0 + ca, y0 + cuts[r], x0 + cb, y0 + cuts[r + 1]))) for ca, cb in cols] for r in range(4)]


def mirror(img):
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def erase_beam(img, seed_xy):
    """Remove the baked energy beam: flood from a seed inside the beam over bright blue/white pixels only (the glove is bounded by
    a dark outline and pink/skin tones, so the fill never enters it)."""
    from collections import deque
    a = np.array(img)
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    lum = (r + g + b) / 3
    beamy = (al > 0) & (((b > r + 25) & (lum > 125)) | ((np.minimum(np.minimum(r, g), b) >= 236)))
    h, w = beamy.shape
    seen = np.zeros((h, w), bool)
    q = deque([seed_xy[::-1]])
    seen[seed_xy[1], seed_xy[0]] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and beamy[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    # also drop beam anti-aliasing: pixels adjacent to the removed region that are still blue-ish
    p = np.pad(seen, 1)
    near = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    seen |= near & (al > 0) & (b > r + 15) & (lum > 110)
    # leftovers around the fingertips: work in the hand region (60px left of the right-most skin pixel); the wristband is darker/left of it
    skin_all = (r > 200) & (g > 130) & (b > 90) & (r > b + 30) & (al > 0) & ~seen
    if skin_all.any():
        xmax = int(np.nonzero(skin_all.any(0))[0].max())
        hand = np.arange(w)[None, :] > xmax - 28
        seen |= hand & (al > 0) & (b > r + 50) & (lum > 95) & ~skin_all
        skin = skin_all & hand
        ytop = int(np.nonzero(skin.any(1))[0].min())
        seen |= hand & (al > 0) & (b > r + 30) & (np.arange(h)[:, None] < ytop + 3)
    a[seen, 3] = 0
    return only_main(Image.fromarray(a, 'RGBA'))


# battle state -> component index in the defringed sheet (tables verified on docs/art-evidence/patch-ov-*.png)
SPECS = {
    'tien-base': dict(sheet='tien_base', display='Tien', dh=200, grid=(0, 640, 440, 1086),
                      battle=dict(idle=0, attack=5, guard=2, charge=1, special=4, hurt=3, victory=6, ko=7), portrait=12,
                      notes=dict(hurt='sheet has no separate hurt pose: the shouting pose (comp 3) is used for hurt', charge='gathering open-hand pose (comp 1)')),
    'vegeta-ssj': dict(sheet='vegeta_ssj', display='Vegeta (Super Saiyan)', dh=188, grid=(0, 680, 440, 1086),
                       battle=dict(idle=0, attack=1, guard=2, charge=3, special=4, hurt=5, victory=6, ko=7), portrait=12, notes={}),
    'gohan-ssj': dict(sheet='gohan_ssj', display='Gohan (Super Saiyan)', dh=200, grid=(0, 640, 450, 1086),
                      battle=dict(idle=0, guard=1, hurt=2, attack=3, special=4, charge=5, victory=6, ko=7), portrait=12,
                      notes=dict(hurt='sheet has no separate hurt pose: the shouting pose (comp 2) is used for hurt',
                                 charge='Kamehameha stance with the baked beam erased (beam is drawn by the engine)'),
                      right_only=True),
}


def build_heroes(reg, log):
    from art_heroes import DIR_FACING
    for aid, sp in SPECS.items():
        im, boxes = sheet(sp['sheet'])
        battle = {}
        cache = {}
        for st in ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'victory', 'ko']:
            i = sp['battle'][st]
            if i not in cache:
                x, y, w, h = boxes[i]
                f = only_main(im.crop((max(0, x - 1), max(0, y - 1), x + w + 1, y + h + 1)))
                if aid == 'gohan-ssj' and i == 5:
                    f = erase_beam(f, (f.width - 40, int(f.height * 0.5)))
                cache[i] = f
            note = sp['notes'].get(st, '')
            if st == 'idle':
                note = f'art/patch {sp["sheet"]}_replacement.png (defringed, alpha binarised)'
            battle[st] = save_frame(cache[i], f'heroes/{aid}/battle/{st}.png', 'genuine', 'right', note, trim=True)
        grid = ow_grid(im, *sp['grid'])
        rows = {'down': grid[0], 'left': grid[1], 'right': grid[2], 'up': grid[3]}
        notes = {}
        if sp.get('right_only'):
            # sheet rows: front, RIGHT-facing side view, back, back. Left = mirror of the right-facing side view (a side profile, so correct);
            # up uses the first back row (the second back row is a near duplicate).
            rows = {'down': grid[0], 'right': grid[1], 'left': [mirror(f) for f in grid[1]], 'up': grid[2]}
            notes['left'] = 'mirrored from the right-facing side view (sheet has no left-facing row)'
            notes['up'] = 'first of two near-duplicate back rows'
        owr = {}
        for d in ['down', 'left', 'right', 'up']:
            fr = rows[d]
            fac = DIR_FACING[d]
            idle = save_frame(fr[0], f'heroes/{aid}/overworld/{d}/idle.png', 'genuine', fac, ('idle = first of 4 sheet frames; ' if True else '') + notes.get(d, ''), trim=True)
            walk = [save_frame(f, f'heroes/{aid}/overworld/{d}/walk-0{k + 1}.png', 'genuine', fac, '', trim=True) for k, f in enumerate(fr[1:4])]
            owr[d] = {'idle': idle, 'walk': walk}
        x, y, w, h = boxes[sp['portrait']]
        por = save_frame(only_main(im.crop((x - 1, y - 1, x + w + 1, y + h + 1))), f'heroes/{aid}/portrait.png', 'genuine', 'front', '', trim=True)
        old = reg['actors'].get(aid, {})
        reg['actors'][aid] = dict(id=aid, kind='hero', displayName=sp['display'], facing='right', displayHeight=old.get('displayHeight', sp['dh']),
                                  battle=battle, overworld=owr, portrait=por, approved=False, provisional=False,
                                  provenance=f'art/patch/art/characters/{sp["sheet"]}_replacement.png; per-frame crops from tools/art_patch.py tables; defringed')
        log(f'[patch] {aid} <- {sp["sheet"]}_replacement.png')


def _premul_resize(img, size):
    """BOX downscale on premultiplied alpha, then binarise alpha (pixel-art edge) and un-premultiply -> no dark/red fringes."""
    a = np.array(img.convert('RGBA')).astype(np.float32)
    al = a[..., 3:4] / 255.0
    pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1).astype(np.uint8)
    small = np.array(Image.fromarray(pm, 'RGBA').resize(size, Image.BOX)).astype(np.float32)
    alpha = small[..., 3:4]
    rgb = np.where(alpha > 0, small[..., :3] / np.maximum(alpha / 255.0, 1e-3), 0)
    out = np.concatenate([np.clip(rgb, 0, 255), np.where(alpha >= 110, 255, 0)], -1).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return Image.fromarray(out, 'RGBA')


def build_chest(reg, log):
    src = Image.open(P / 'world' / 'treasure_chest_closed.png').convert('RGBA')
    a = np.array(src)
    keep = a[..., 3] >= 200
    a[..., 3] = np.where(keep, 255, 0)
    a[~keep, :3] = 0
    src = trim_pad(Image.fromarray(a, 'RGBA'), 0)
    w = 68
    h = round(src.height * w / src.width)
    closed = _premul_resize(src, (w, h))
    closed = trim_pad(closed, 0)
    # ---- open variant: body stays, dark interior + gold heap, lid swings up behind (flipped, darkened = its inside)
    h = closed.height
    ys = int(h * 0.50)
    body = closed.crop((0, ys, w, h))
    lid = closed.crop((0, 0, w, ys))
    lid_in = lid.transpose(Image.FLIP_TOP_BOTTOM)
    la = np.array(lid_in).astype(np.float32)
    la[..., :3] *= 0.62
    lid_in = Image.fromarray(la.astype(np.uint8), 'RGBA')
    lid_h = int(ys * 0.8)
    lid_in = lid_in.resize((int(w * 0.92), lid_h), Image.NEAREST)
    la2 = np.array(lid_in)
    opq = la2[..., 3] > 0
    for xx in range(la2.shape[1]):  # dark 1px outline along the flipped lid's cut edge so it does not read as clipped
        col = np.nonzero(opq[:, xx])[0]
        if len(col):
            la2[col.min(), xx, :3] = (16, 10, 22)
            la2[col.min() + 1, xx, :3] = (34, 24, 36)
    lid_in = Image.fromarray(la2, 'RGBA')
    rise = lid_h - 6
    H = body.height + rise + 4
    open_im = Image.new('RGBA', (w, H), (0, 0, 0, 0))
    open_im.alpha_composite(lid_in, ((w - lid_in.width) // 2, 0))
    by = H - body.height
    # interior: dark band across the top of the body, within the body's own width
    ba = np.array(body)[..., 3] > 0
    top_row = np.nonzero(ba[0])[0] if ba[0].any() else np.nonzero(ba[2])[0]
    x0, x1 = int(top_row.min()), int(top_row.max())
    ia = np.zeros((H, w, 4), np.uint8)
    for yy in range(by - 7, by + 4):
        k = (yy - (by - 7)) / 10.0
        inset = int(round(abs(k - 0.5) * 6))
        for xx in range(x0 + 3 + inset, x1 - 3 - inset):
            ia[yy, xx] = (46, 26, 16, 255)
    open_im.alpha_composite(Image.fromarray(ia, 'RGBA'))
    # gold heap
    rs = np.random.RandomState(7)
    ga = np.zeros((H, w, 4), np.uint8)
    cx = (x0 + x1) // 2
    for yy in range(by - 9, by + 2):
        half = int((1 - ((yy - (by - 4)) / 6.0) ** 2) * (x1 - x0) * 0.32) if abs(yy - (by - 4)) < 6 else 0
        for xx in range(cx - half, cx + half + 1):
            if x0 + 4 < xx < x1 - 4:
                t = rs.rand()
                ga[yy, xx] = (255, 215, 64, 255) if t > 0.45 else (214, 150, 24, 255) if t > 0.12 else (255, 244, 170, 255)
    open_im.alpha_composite(Image.fromarray(ga, 'RGBA'))
    open_im.alpha_composite(body, (0, by))
    objs = reg.setdefault('objects', {})
    c = save_frame(closed, 'objects/chest-closed.png', 'genuine', 'front', 'art/patch treasure_chest_closed.png; defringed, premultiplied BOX downscale to 68px wide (one tile = 32px at 1x, 64px at the 2x world camera)', trim=True, pad=0)
    o = save_frame(open_im, 'objects/chest-open.png', 'derived', 'front', 'derived by tools/art_patch.py from the closed chest pixels (body + dark interior + gold heap + lid flipped/darkened); no painted open state exists', trim=True, pad=0)
    # same screen scale for both: 30px tall closed
    dh_c = 30
    objs['chest-closed'] = dict(c, displayHeight=dh_c)
    objs['chest-open'] = dict(o, displayHeight=round(dh_c * o['h'] / c['h']))
    log(f'[patch] chest closed {c["w"]}x{c["h"]} open {o["w"]}x{o["h"]}')


ICON_SHEET = P / 'world' / 'Pixel RPG Save Heal Shop Icon Sheet.png'


def cut_object(box, gthr=12, lthr=150, peel=18):
    """Background removal for the glow-backed icon sheet. The background is a smooth blurred glow, sprites have sharp outlines:
    flood from the crop border over low-gradient dark pixels (stops at sprite outlines), then peel grey haze off the edge."""
    import cv2
    from collections import deque
    sheet_bgr = cv2.imread(str(ICON_SHEET))
    x0, y0, x1, y1 = box
    c = sheet_bgr[y0:y1, x0:x1].copy()
    g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gb = cv2.GaussianBlur(g, (0, 0), 0.8)
    grad = np.hypot(cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)) / 4
    ok = (grad < gthr) & (g < lthr)
    h, w = ok.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if ok[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if ok[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and ok[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    fg = ~seen
    rgb = cv2.cvtColor(c, cv2.COLOR_BGR2RGB).astype(int)
    sat = rgb.max(-1) - rgb.min(-1)
    lum = rgb.mean(-1)
    haze = (lum > 55) & (lum < 178) & (sat < 38) & (grad < 20)
    for _ in range(peel):
        bgp = np.pad(~fg, 1, constant_values=True)
        edge = fg & (bgp[:-2, 1:-1] | bgp[2:, 1:-1] | bgp[1:-1, :-2] | bgp[1:-1, 2:])
        fg &= ~(edge & haze)
    fg &= ~((lum > 60) & (lum < 138) & (sat < 30) & (grad < 7))
    # outer glow (tan/grey/green) sitting outside the dark sprite outline: flood from the background into smooth, mid-tone foreground
    smooth = fg & (grad < 9) & (lum < 196) & (sat < 75)
    q = deque()
    out = ~fg
    bgp = np.pad(out, 1, constant_values=True)
    nb = bgp[:-2, 1:-1] | bgp[2:, 1:-1] | bgp[1:-1, :-2] | bgp[1:-1, 2:]
    for y, x in zip(*np.nonzero(smooth & nb)):
        q.append((y, x))
    gone = np.zeros(fg.shape, bool)
    while q:
        y, x = q.popleft()
        if gone[y, x] or not smooth[y, x]:
            continue
        gone[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and smooth[ny, nx] and not gone[ny, nx]:
                q.append((ny, nx))
    fg &= ~gone
    # fill enclosed holes (interior pixels the cleanup passes may have knocked out) with their original colours
    hole = ~fg
    reach = np.zeros(fg.shape, bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1) if hole[y, x]) 
    q.extend((y, x) for x in range(w) for y in (0, h - 1) if hole[y, x])
    while q:
        y, x = q.popleft()
        if reach[y, x]:
            continue
        reach[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and hole[ny, nx] and not reach[ny, nx]:
                q.append((ny, nx))
    fg |= hole & ~reach
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8), connectivity=8)
    keep = np.zeros(fg.shape, bool)
    big = stats[1:, cv2.CC_STAT_AREA].max() if n > 1 else 0
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 0.02 * big:
            keep |= lab == i
    rgba = cv2.cvtColor(c, cv2.COLOR_BGR2RGBA)
    rgba[..., 3] = keep * 255
    return trim_pad(Image.fromarray(rgba), 0)


# crop boxes on the 1536x1024 sheet (verified on docs/art-evidence/patch-objects.png). dh = on-screen height in px at 1x
OBJECT_BOXES = {
    'save': ((30, 60, 480, 390), 72), 'heal': ((515, 70, 1010, 385), 72), 'shop': ((1030, 70, 1495, 385), 72),
}


def decontaminate(img, rounds=1):
    """Replace the colour of the outermost silhouette pixels (which still carry the glow of the old background) by the average of
    their opaque interior neighbours."""
    a = np.array(img).astype(np.float32)
    for _ in range(rounds):
        op = a[..., 3] > 0
        p = np.pad(op, 1)
        inner = op & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
        edge = op & ~inner
        ys, xs = np.nonzero(edge)
        new = a.copy()
        for y, x in zip(ys, xs):
            ys0, ys1, xs0, xs1 = max(0, y - 1), y + 2, max(0, x - 1), x + 2
            sub_i = inner[ys0:ys1, xs0:xs1]
            if sub_i.any():
                new[y, x, :3] = a[ys0:ys1, xs0:xs1, :3][sub_i].mean(0)
        a = new
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def build_objects(reg, log):
    objs = reg.setdefault('objects', {})
    for key, (box, dh) in OBJECT_BOXES.items():
        im = cut_object(box)
        # store at 2x display height (the world camera runs at zoom 2, so the texture is sampled 1:1 on screen)
        h2 = dh * 2
        w2 = round(im.width * h2 / im.height)
        small = decontaminate(_premul_resize(im, (w2, h2)))
        f = save_frame(small, f'objects/{key}.png', 'genuine', 'front', f'art/patch Pixel RPG Save Heal Shop Icon Sheet.png; background removed by edge-seeded flood fill + haze peel; baked label plates excluded', trim=True, pad=0)
        objs[key] = dict(f, displayHeight=dh)
        log(f'[patch] object {key} {f["w"]}x{f["h"]}')


ICON_BOXES = {'cmd-save': (40, 685, 170, 820), 'cmd-heal': (535, 680, 670, 810), 'cmd-shop': (1030, 685, 1170, 828)}


def build_icons(reg, log):
    ui = reg.setdefault('uiIcons', {})
    for key, box in ICON_BOXES.items():
        im = cut_object(box, peel=6)
        s = 56 / max(im.size)
        sm = decontaminate(_premul_resize(im, (max(1, round(im.width * s)), max(1, round(im.height * s)))))
        canvas = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        canvas.alpha_composite(sm, ((64 - sm.width) // 2, (64 - sm.height) // 2))
        dest = OUT / 'ui' / 'icons' / f'{key}.png'
        dest.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dest, optimize=True)
        ui[key] = f'assets/ui/icons/{key}.png'
        log(f'[patch] icon {key}')


def build_title(reg, log):
    import shutil
    src = P / 'title' / 'cell_saga_title_screen.png'
    dest = OUT / 'title'
    dest.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGB')
    im.save(dest / 'cell_saga_title_screen.png', optimize=True)
    # preview for the loading state: BOX 2x downscale (836x470)
    im.resize((im.width // 2, im.height // 2), Image.BOX).save(dest / 'title-small.png', optimize=True)
    reg['title'] = dict(path='assets/title/cell_saga_title_screen.png', w=im.width, h=im.height, small='assets/title/title-small.png')
    log(f'[patch] title {im.size}')


def build_windows_icon(log):
    # square 1:1 crop of the title key art centred on the gold 'III' + Cell glow focal region, upscaled with NEAREST-safe LANCZOS-free BOX
    src = Image.open(P / 'title' / 'cell_saga_title_screen.png').convert('RGBA')
    x, y, side = 262, 468, 400   # Goku + SSJ Gohan on the cliff (checked on docs/art-evidence/patch-icon.png)
    crop = src.crop((x, y, x + side, y + side))
    out = ROOT / 'build'
    out.mkdir(exist_ok=True)
    big = crop.resize((512, 512), Image.LANCZOS)
    big.save(out / 'icon.png')
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    big.save(out / 'icon.ico', sizes=sizes)
    log('[patch] build/icon.ico + icon.png')


def build_patch(reg, log):
    build_heroes(reg, log)
    build_chest(reg, log)
    build_objects(reg, log)
    build_icons(reg, log)
    build_title(reg, log)
    build_windows_icon(log)


if __name__ == '__main__':
    # standalone: re-read the registry fresh, apply only the patch keys, write back (no pruning; safe next to other art builders)
    import json
    rp = ROOT / 'src/data/artRegistry.generated.json'
    reg = json.loads(rp.read_text(encoding='utf8'))
    build_patch(reg, print)
    rp.write_text(json.dumps(reg, indent=1, sort_keys=True), encoding='utf8')
