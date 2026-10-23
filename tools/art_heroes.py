"""Hero actors: genuine crops from the bundle (re-extracted from source sheets when clipped) + derived forms."""
from __future__ import annotations
import re
import numpy as np
from PIL import Image, ImageDraw
from art_lib import (SRC, alpha_mask, clean_alpha, dilate, flip, frame_meta, glow_outline, locate_crop, recover_full,
                     save_frame, trim_pad)

HERO_ROOT = SRC / '01-02-heroes'
BATTLE = ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'victory', 'ko']
DIRS = ['down', 'left', 'right', 'up']
FRAMES = ['idle', 'walk-01', 'walk-02', 'walk-03']
DIR_FACING = {'down': 'front', 'up': 'back', 'left': 'left', 'right': 'right'}

# registry id -> (bundle folder, display name, base display height px @720p)
GENUINE = {
    'goku-base': ('goku-base', 'Goku', 175),
    'goku-ssj': ('goku-ssj', 'Goku (Super Saiyan)', 190),
    'gohan-base': ('gohan-base', 'Gohan', 190),
    'trunks-base': ('future-trunks-base', 'Future Trunks', 185),
    'trunks-ssj': ('future-trunks-ssj', 'Future Trunks (Super Saiyan)', 200),
    'vegeta-base': ('vegeta-base', 'Vegeta', 170),
    'vegeta-ssj': ('vegeta-ssj-provisional', 'Vegeta (Super Saiyan)', 188),
    'piccolo-base': ('piccolo-base', 'Piccolo', 215),
    'piccolo-kami': ('piccolo-kami-merged', 'Piccolo (Kami merged)', 235),
    'krillin-base': ('krillin-base', 'Krillin', 140),
    'tien-base': ('tien-base', 'Tien', 200),
}


def parse_duplicates():
    """Return list of groups, each a list of bundle-relative paths."""
    txt = (SRC / 'manifest' / 'DUPLICATE-FRAMES-TO-FIX.md').read_text(encoding='utf8')
    groups, cur = [], None
    for line in txt.splitlines():
        if line.startswith('## Duplicate group'):
            cur = []
            groups.append(cur)
        m = re.match(r'- `(.+)`', line)
        if m and cur is not None:
            cur.append(m.group(1))
    return groups


def _ident(a: Image.Image, b: Image.Image) -> bool:
    return a.size == b.size and bool((np.array(a.convert('RGBA')) == np.array(b.convert('RGBA'))).all())


def load_source(folder: str):
    """Load all frames of one bundle folder. Returns dict with battle/ow/portrait images and per-frame status."""
    sheet = Image.open(HERO_ROOT / 'source-sheets' / f'{folder}.png').convert('RGBA')
    out = {'battle': {}, 'ow': {d: {} for d in DIRS}, 'portrait': None, 'status': {}}

    def get(path, key, recover=True):
        crop = Image.open(HERO_ROOT / path).convert('RGBA')
        crop = clean_alpha(crop)
        st = 'unchanged'
        if recover:
            org = locate_crop(sheet, Image.open(HERO_ROOT / path))
            if org is not None:
                im, st = recover_full(clean_alpha(sheet), crop, org)
                crop = clean_alpha(im)
            else:
                st = 'fallback:origin-not-found'
        out['status'][key] = st
        return crop

    for s in BATTLE:
        out['battle'][s] = get(f'battle/{folder}/{s}.png', f'battle/{s}')
    for d in DIRS:
        for f in FRAMES:
            out['ow'][d][f] = get(f'overworld/{folder}/{d}/{f}.png', f'ow/{d}/{f}')
    out['portrait'] = clean_alpha(Image.open(HERO_ROOT / 'portraits' / f'{folder}.png'))
    return out


def edge_touch(im: Image.Image) -> bool:
    a = alpha_mask(im, 24)
    return int(a[0].sum() + a[-1].sum() + a[:, 0].sum() + a[:, -1].sum()) > 12


# ----------------------------------------------------------------- colour tools
def rgb_to_hsv(a):
    r, g, b = [a[..., i].astype(float) / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm, gm, bm = m & (mx == r), m & (mx == g) & (mx != r), m & (mx == b) & (mx != r) & (mx != g)
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx


def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60
    c = v * s
    x = c * (1 - np.abs(h % 2 - 1))
    z = np.zeros_like(h)
    conds = [(h < 1), (h < 2), (h < 3), (h < 4), (h < 5), (h >= 5)]
    rs = np.select(conds, [c, x, z, z, x, c])
    gs = np.select(conds, [x, c, c, x, z, z])
    bs = np.select(conds, [z, z, x, c, c, x])
    m = v - c
    return (np.stack([rs + m, gs + m, bs + m], -1) * 255).clip(0, 255).astype(np.uint8)


def hue_shift_region(im: Image.Image, lo, hi, target, sat_min=0.2):
    a = np.array(im.convert('RGBA'))
    h, s, v = rgb_to_hsv(a)
    m = (a[..., 3] > 0) & (h >= lo) & (h <= hi) & (s >= sat_min)
    rgb = hsv_to_rgb(np.where(m, target + (h - (lo + hi) / 2) * 0.3, h), s, v)
    a[..., :3] = np.where(m[..., None], rgb, a[..., :3])
    return Image.fromarray(a, 'RGBA')


def distance_from_transparent(mask: np.ndarray, maxd: int = 4):
    """Chebyshev-ish distance to nearest transparent pixel, capped at maxd."""
    dist = np.where(mask, maxd, 0)
    inv = ~mask
    cur = inv.copy()
    d = np.zeros(mask.shape, dtype=int)
    for i in range(1, maxd):
        cur = dilate(cur, 1)
        d[(cur & mask) & (d == 0)] = i
    d[(d == 0) & mask] = maxd
    return d


def gold_hair(im: Image.Image, frac: float = 0.5, whole: bool = False, strong: bool = False):
    """Recolour near-black hair pixels to Super Saiyan gold. Derived art (heuristic region)."""
    a = np.array(im.convert('RGBA'))
    op = a[..., 3] > 24
    ys, xs = np.where(op)
    if len(ys) == 0:
        return im
    y0, y1 = ys.min(), ys.max()
    mx, mn = a[..., :3].max(-1).astype(int), a[..., :3].min(-1).astype(int)
    neutral_dark = (mx < 105) & (mx - mn < 48)
    region = np.zeros_like(op)
    if whole:
        region[:, int(xs.min() + (xs.max() - xs.min()) * 0.5):] = True
    else:
        region[: int(y0 + (y1 - y0) * frac), :] = True
    d = distance_from_transparent(op, 4)
    hair = op & neutral_dark & region & (d >= 2)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    base = np.array([238, 178, 30]); dark = np.array([196, 128, 18]); hi = np.array([255, 230, 104])
    col = np.broadcast_to(base, a.shape[:2] + (3,)).copy()
    col[d == 2] = dark
    strand = ((xx + yy // 2) % 7 == 0) & (d >= 3)
    col[strand] = hi
    a[..., :3] = np.where(hair[..., None], col.astype(np.uint8), a[..., :3])
    return Image.fromarray(a, 'RGBA')


def desaturate_tint(im: Image.Image, sat: float, tint, amt: float, dark: float = 1.0):
    a = np.array(im.convert('RGBA')).astype(float)
    g = a[..., :3].mean(-1, keepdims=True)
    rgb = g + (a[..., :3] - g) * sat
    rgb = rgb * (1 - amt) + np.array(tint, dtype=float) * amt * (g / 160.0)
    a[..., :3] = (rgb * dark).clip(0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def lightning(im: Image.Image, seed: int, count: int = 14, color=(235, 250, 255), thick: int = 2):
    """Procedural lightning arcs around the silhouette (derived VFX overlay baked into the form sprite)."""
    rng = np.random.default_rng(seed)
    pad = 26
    can = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    can.alpha_composite(im, (pad, pad))
    m = alpha_mask(can, 40)
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    d = ImageDraw.Draw(can)
    layer = Image.new('RGBA', can.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for _ in range(count):
        # start on the silhouette edge region, walk outward in jagged steps
        sx = int(rng.integers(x0, x1 + 1)); sy = int(rng.integers(y0, y1 + 1))
        ang = rng.uniform(0, 2 * np.pi)
        pts = [(sx, sy)]
        for _s in range(int(rng.integers(3, 6))):
            ang += rng.uniform(-1.0, 1.0)
            step = rng.uniform(7, 15)
            sx = int(sx + np.cos(ang) * step); sy = int(sy + np.sin(ang) * step)
            pts.append((sx, sy))
        ld.line(pts, fill=(*color, 255), width=thick)
        ld.line(pts, fill=(120, 200, 255, 255), width=1)
    lm = np.array(layer)[..., 3] > 0
    behind = Image.fromarray((np.stack([lm] * 4, -1) * np.array(layer)).astype(np.uint8), 'RGBA')
    out = Image.new('RGBA', can.size, (0, 0, 0, 0))
    out.alpha_composite(behind)
    out.alpha_composite(can)
    # a few arcs drawn over the sprite as well
    over = Image.new('RGBA', can.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    for _ in range(max(2, count // 4)):
        sx = int(rng.integers(x0, x1 + 1)); sy = int(rng.integers(y0, y1 + 1))
        pts = [(sx, sy)]
        ang = rng.uniform(0, 2 * np.pi)
        for _s in range(3):
            ang += rng.uniform(-1.2, 1.2)
            sx = int(sx + np.cos(ang) * 9); sy = int(sy + np.sin(ang) * 9)
            pts.append((sx, sy))
        od.line(pts, fill=(255, 255, 255, 255), width=1)
    out.alpha_composite(over)
    return out


def widen(im: Image.Image, fx: float, fy: float = 1.0):
    """Derived bulk: nearest-neighbour stretch (never smooth-resampled)."""
    return im.resize((max(1, round(im.width * fx)), max(1, round(im.height * fy))), Image.NEAREST)


def bandage(im: Image.Image, facing: str = 'right'):
    """Heuristic wounded-arm overlay: white bandage + blood on the rear-arm side of the sprite (derived, not authentic art)."""
    a = np.array(im.convert('RGBA'))
    op = a[..., 3] > 24
    ys, xs = np.where(op)
    if len(ys) == 0:
        return im
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0, y1 - y0
    # rear arm = left third for right-facing poses, middle band vertically
    bx0 = x0 + int(w * 0.12); bx1 = x0 + int(w * 0.34)
    by0 = y0 + int(h * 0.44); by1 = y0 + int(h * 0.62)
    reg = np.zeros_like(op); reg[by0:by1, bx0:bx1] = True
    wound = reg & op
    a[wound, :3] = (236, 232, 226)
    stripe = wound & (((np.mgrid[0:a.shape[0], 0:a.shape[1]][0]) % 5) == 0)
    a[stripe, :3] = (200, 196, 190)
    blood = np.zeros_like(op); blood[by0 + int(h * 0.05):by0 + int(h * 0.12), bx0 + 2:bx0 + int(w * 0.1)] = True
    a[blood & op, :3] = (176, 24, 28)
    return Image.fromarray(a, 'RGBA')


def bob(im: Image.Image, dy: int = 2):
    """1-2px upward step variant for duplicate walk slots (derived, honest)."""
    pad = Image.new('RGBA', (im.width, im.height + dy), (0, 0, 0, 0))
    pad.alpha_composite(im, (0, 0))
    return pad


# ----------------------------------------------------------------- build
def hero_actor(reg, actor_id, display, dh, frames, quality, provenance, note='', fallback=None, facing_ow=True, provisional=False):
    """Write all frames of one hero actor and register it. frames: dict from load_source-like structure plus optional
    per-frame quality overrides in frames['q'] (key -> (quality, note))."""
    q = frames.get('q', {})

    def store(key, im, rel, facing, default_q=quality, trim=True):
        qq, nn = q.get(key, (default_q, ''))
        n = ' '.join(x for x in (note if key == 'battle/idle' else '', nn, 'edge_touch' if edge_touch(im) else '') if x)
        return save_frame(im, f'heroes/{actor_id}/{rel}', qq, facing, n, trim=trim)

    battle = {}
    for s in BATTLE:
        battle[s] = store(f'battle/{s}', frames['battle'][s], f'battle/{s}.png', 'right')
    ow = {}
    for d in DIRS:
        idle = store(f'ow/{d}/idle', frames['ow'][d]['idle'], f'overworld/{d}/idle.png', DIR_FACING[d])
        walk = [store(f'ow/{d}/{f}', frames['ow'][d][f], f'overworld/{d}/{f}.png', DIR_FACING[d]) for f in FRAMES[1:]]
        ow[d] = {'idle': idle, 'walk': walk}
    por = save_frame(frames['portrait'], f'heroes/{actor_id}/portrait.png', q.get('portrait', (quality, ''))[0], 'front',
                     q.get('portrait', (quality, ''))[1])
    reg['actors'][actor_id] = dict(id=actor_id, kind='hero', displayName=display, facing='right', displayHeight=dh,
                                   battle=battle, overworld=ow, portrait=por, approved=False,
                                   provisional=provisional or quality != 'genuine',
                                   provenance=provenance, **({'fallbackReason': fallback} if fallback else {}))


def build_heroes(reg, log):
    dup_groups = parse_duplicates()
    dup_keys = {}  # (folder, kind, dir, frame) -> group index
    for gi, g in enumerate(dup_groups):
        for p in g:
            m = re.match(r'01-02-heroes/overworld/([^/]+)/([^/]+)/([^.]+)\.png', p)
            if m:
                dup_keys[(m.group(1), 'ow', m.group(2), m.group(3))] = gi
            m = re.match(r'01-02-heroes/battle/([^/]+)/([^.]+)\.png', p)
            if m:
                dup_keys[(m.group(1), 'battle', m.group(2), '')] = gi
            m = re.match(r'01-02-heroes/portraits/([^.]+)\.png', p)
            if m:
                dup_keys[(m.group(1), 'portrait', '', '')] = gi
    loaded = {}
    for aid, (folder, display, dh) in GENUINE.items():
        fr = load_source(folder)
        fr['q'] = {}
        log(f'[hero] {aid}: statuses ' + ', '.join(f'{k}={v}' for k, v in fr['status'].items() if v not in ('unchanged',)))
        # duplicate-slot handling: keep the first listed path of each group, derive the rest
        for gi, g in enumerate(dup_groups):
            members = [k for k, v in dup_keys.items() if v == gi and k[0] == folder]
            if not members:
                continue
            # which member is "kept": first in the markdown order that belongs to this folder
            order = []
            for p in g:
                for k in members:
                    if _key_path(k) == p:
                        order.append(k)
            keep = order[0] if order else members[0]
            for k in order[1:]:
                _derive_dup(fr, k, folder)
        loaded[aid] = fr
        hero_actor(reg, aid, display, dh, fr, 'genuine',
                   f'bundle 01-02-heroes/*/{folder} (source sheet {folder}.png); frames re-extracted from the sheet where the bundle cell clipped the sprite',
                   note='', provisional=False)
        if aid == 'vegeta-ssj':
            reg['actors'][aid]['provisional'] = True
            reg['actors'][aid]['fallbackReason'] = 'bundle file is named vegeta-ssj-provisional'
        if aid == 'piccolo-kami':
            reg['actors'][aid]['portrait']['note'] = 'bundle portrait is an exact duplicate of piccolo-base; replaced by a crop of the kami-merged battle idle (derived)'
            reg['actors'][aid]['portrait']['quality'] = 'derived'
    # piccolo-kami portrait: crop head from idle battle frame
    return loaded


def _key_path(k):
    folder, kind, d, f = k
    if kind == 'ow':
        return f'01-02-heroes/overworld/{folder}/{d}/{f}.png'
    if kind == 'battle':
        return f'01-02-heroes/battle/{folder}/{d}.png'
    return f'01-02-heroes/portraits/{folder}.png'


def _derive_dup(fr, k, folder):
    _, kind, d, f = k
    if kind == 'battle':
        # tien: charge == idle, special == attack
        if d == 'charge':
            fr['battle']['charge'] = glow_outline(fr['battle']['idle'], (170, 210, 255), 3, 150)
        elif d == 'special':
            fr['battle']['special'] = glow_outline(fr['battle']['attack'], (255, 230, 120), 3, 160)
        else:
            fr['battle'][d] = glow_outline(fr['battle'][d], (255, 255, 255), 2, 120)
        fr['q'][f'battle/{d}'] = ('derived', 'duplicate_slot: bundle frame was an exact duplicate; this is the other pose + coloured energy rim (derived, not a unique pose)')
    elif kind == 'ow':
        base = fr['ow'][d]
        base_all = fr['ow']
        if d in ('down', 'up'):
            # mirror a different walk frame of the same direction (opposite leg forward)
            donor = next((x for x in ('walk-01', 'walk-02', 'walk-03') if x != f), 'walk-01')
            new = flip(base[donor])
            note = f'duplicate_slot: mirrored {donor} (alternate leg), derived'
        else:
            donor = next((x for x in ('walk-01', 'walk-03', 'walk-02') if x != f and (folder, 'ow', d, x) not in _DUPSEEN), 'walk-01')
            new = bob(base[donor], 2)
            note = f'duplicate_slot: 2px bob variant of {donor} (facing preserved), derived'
        _DUPSEEN.add((folder, 'ow', d, f))
        if f == 'idle' and d in ('left', 'right'):
            opp = 'right' if d == 'left' else 'left'
            new = flip(base_all[opp]['idle'])
            note = f'duplicate_slot: mirrored {opp}/idle (facing corrected), derived'
        elif f == 'idle':
            return
        base[f] = new
        fr['q'][f'ow/{d}/{f}'] = ('derived', note)
    else:
        pass


_DUPSEEN: set = set()


# ----------------------------------------------------------------- derived forms
def map_frames(fr, fn_battle, fn_ow=None, fn_portrait=None, dir_aware=False):
    out = {'battle': {}, 'ow': {d: {} for d in DIRS}, 'portrait': None, 'q': {}, 'status': {}}
    for s in BATTLE:
        out['battle'][s] = fn_battle(fr['battle'][s], s)
    fo = fn_ow or fn_battle
    for d in DIRS:
        for f in FRAMES:
            out['ow'][d][f] = fo(fr['ow'][d][f], f'{d}/{f}')
    fp = fn_portrait or fn_battle
    out['portrait'] = fp(fr['portrait'], 'portrait')
    return out


def build_derived_heroes(reg, loaded, log):
    base = loaded
    # ---- goku-weakened
    f = lambda im, k: desaturate_tint(im, 0.45, (150, 200, 170), 0.35, 0.92)
    fr = map_frames(base['goku-base'], f)
    hero_actor(reg, 'goku-weakened', 'Goku (heart virus)', 175, fr, 'derived',
               'derived from goku-base: desaturated pale-green tint; no slumped/ill pose art exists',
               note='derived tint only; not a unique ill-Goku pose set', fallback='missing-art: goku-virus-weakened (tint of goku-base)', provisional=True)
    # ---- gohan-ssj / ssj2
    gold = lambda im, k: gold_hair(im, frac=0.42, whole=(k == 'ko'))
    gs = map_frames(base['gohan-base'], lambda im, k: glow_outline(gold(im, k), (255, 220, 60), 3, 160),
                    fn_portrait=lambda im, k: gold_hair(im, 0.6))
    hero_actor(reg, 'gohan-ssj', 'Gohan (Super Saiyan)', 200, gs, 'derived',
               'derived from gohan-base: hair recoloured gold + yellow aura rim',
               note='derived: hair recolour heuristic + aura; not redrawn SSJ sprites', fallback='missing-art: gohan-ssj', provisional=True)
    seedbase = [0]

    def ssj2(im, k):
        seedbase[0] += 1
        g = glow_outline(gold(im, k), (255, 236, 110), 4, 200)
        return lightning(g, 1000 + seedbase[0], count=16)
    g2 = map_frames(base['gohan-base'], ssj2, fn_portrait=lambda im, k: lightning(gold_hair(im, 0.6), 77, 8))
    hero_actor(reg, 'gohan-ssj2', 'Gohan (Super Saiyan 2)', 205, g2, 'derived',
               'derived from gohan-base: gold hair + wider aura + baked lightning arcs',
               note='derived: lightning is a procedural overlay; real SSJ2 hair/pose art still missing', fallback='missing-art: gohan-ssj2', provisional=True)
    # ---- gohan-wounded
    gw = map_frames(base['gohan-base'], lambda im, k: bandage(desaturate_tint(im, 0.85, (170, 60, 50), 0.12), 'right'),
                    fn_ow=lambda im, k: bandage(im, 'right'))
    hero_actor(reg, 'gohan-wounded', 'Gohan (wounded arm)', 190, gw, 'derived',
               'derived from gohan-base: heuristic bandage/blood overlay on the rear arm',
               note='derived overlay only; real one-armed art missing', fallback='missing-art: gohan-wounded-arm', provisional=True)
    # ---- gohan-training
    gt = map_frames(base['gohan-base'], lambda im, k: hue_shift_region(im, 240, 330, 140, 0.18))
    hero_actor(reg, 'gohan-training', 'Gohan (training gi)', 190, gt, 'derived',
               'derived from gohan-base: purple gi hue-shifted to green',
               note='derived recolour only', fallback='missing-art: gohan-alternate-clothing (recolour)', provisional=True)
    # ---- vegeta-ascended (bulky grade 2)
    va = map_frames(base['vegeta-ssj'], lambda im, k: glow_outline(widen(im, 1.3, 1.05), (255, 170, 40), 3, 160),
                    fn_portrait=lambda im, k: widen(im, 1.15, 1.0))
    hero_actor(reg, 'vegeta-ascended', 'Vegeta (Ascended Super Saiyan)', 205, va, 'derived',
               'derived from vegeta-ssj: 1.3x horizontal nearest-neighbour stretch + orange aura',
               note='derived: stretched for bulk; real expanded-musculature art missing', fallback='missing-art: vegeta-ascended', provisional=True)
    # ---- trunks-ultra (grade 3)
    seedbase[0] = 0

    def ult(im, k):
        seedbase[0] += 1
        g = desaturate_tint(widen(im, 1.4, 1.08), 1.0, (210, 60, 60), 0.0, 1.0)
        g = glow_outline(g, (235, 70, 70), 3, 170)
        return lightning(g, 3000 + seedbase[0], count=8, color=(255, 200, 200))
    tu = map_frames(base['trunks-ssj'], ult, fn_portrait=lambda im, k: widen(im, 1.2, 1.0))
    hero_actor(reg, 'trunks-ultra', 'Future Trunks (Ultra / Grade 3)', 215, tu, 'derived',
               'derived from trunks-ssj: 1.4x horizontal nearest-neighbour stretch + red aura + sparks',
               note='derived: stretched for bulk; real Grade 3 art missing', fallback='missing-art: trunks-ultra-grade3', provisional=True)
    # ---- piccolo-kami portrait fix: crop head of battle idle
    pk = reg['actors']['piccolo-kami']
    src = base['piccolo-kami']['battle']['idle']
    m = frame_meta(src)
    bx, by, bw, bh = m['bbox']
    head = src.crop((bx, by, bx + bw, by + int(bh * 0.5)))
    pk['portrait'] = save_frame(head, 'heroes/piccolo-kami/portrait.png', 'derived', 'front',
                                'bundle portrait was an exact duplicate of piccolo-base; replaced with a crop of the kami-merged battle idle head/cloak (derived)', trim=True)
