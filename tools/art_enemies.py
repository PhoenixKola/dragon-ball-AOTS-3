"""Enemy actors: hand-assigned frames from the ten bundle enemy sheets (indices from dil=2 component analysis, or explicit
rects where frames overlap) + derived Super Perfect Cell / Cell Junior + procedural minions."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import (SRC, alpha_mask, clean_alpha, components, dilate, frame_meta, glow_outline, label_components,
                     save_frame, trim_pad)
from art_heroes import desaturate_tint, hue_shift_region, lightning, rgb_to_hsv, hsv_to_rgb

ENEMY_SHEETS = SRC / '03-enemies' / 'source-sheets'

# actor id -> (sheet file stem, display name, displayHeight, picks)
# a pick is an int (component index from components(sheet, dil=2)) or a rect tuple (x, y, w, h)
SPEC = {
    'mecha-frieza': ('mecha-frieza', 'Mecha Frieza', 205,
                     dict(idle=28, guard=29, attack=30, special=31, hurt=34, ko=35, charge=37, beam=(344, 835, 285, 214), portrait=41)),
    'king-cold': ('king-cold', 'King Cold', 245,
                  dict(idle=22, attack=24, special=25, guard=28, hurt=30, ko=37, charge=35, beam=26, portrait=15)),
    'android-19': ('android-19', 'Android 19', 190,
                   dict(idle=18, guard=19, attack=22, special=28, hurt=33, ko=34, charge=26, beam=27, portrait=29)),
    'android-20': ('android-20-gero', 'Android 20 (Dr. Gero)', 185,
                   dict(idle=18, guard=19, attack=21, special=20, hurt=22, ko=27, charge=24, beam=26, portrait=23)),
    'android-17': ('android-17', 'Android 17', 190,
                   dict(idle=37, guard=39, attack=40, special=44, hurt=53, ko=56, charge=52, beam=50, portrait=24)),
    'android-18': ('android-18', 'Android 18', 185,
                   dict(idle=10, attack=11, guard=13, special=15, hurt=24, ko=27, charge=(152, 580, 180, 258), beam=16, portrait=26)),
    'android-16': ('android-16-guest', 'Android 16', 255,
                   dict(idle=20, guard=(255, 412, 160, 200), attack=27, special=23, hurt=28, ko=29, charge=25, beam=22, portrait=(6, 846, 316, 232))),
    'cell-imperfect': ('cell-imperfect', 'Imperfect Cell', 225,
                       dict(idle=16, guard=17, attack=18, special=19, hurt=28, ko=29, charge=23, beam=21, portrait=8)),
    'cell-semi-perfect': ('cell-semi-perfect', 'Semi-Perfect Cell', 250,
                          dict(idle=16, attack=17, guard=18, special=20, hurt=31, ko=28, charge=25, beam=29, portrait=15)),
    'cell-perfect': ('cell-perfect', 'Perfect Cell', 258,
                     dict(idle=16, guard=17, attack=18, special=19, hurt=21, ko=22, charge=25, beam=28, portrait=(1243, 752, 205, 290))),
}

STATES = ['idle', 'attack', 'guard', 'charge', 'beam', 'special', 'hurt', 'ko']


def pick_image(sheet, boxes, p):
    """Extract one frame. Index picks keep only components that are mostly inside the bbox (drops overlapping neighbours)."""
    if isinstance(p, tuple):
        x, y, w, h = p
        return clean_alpha(sheet.crop((x, y, x + w, y + h)))
    x, y, w, h = [int(v) for v in boxes[p]]
    m = 8
    x0, y0 = max(0, x - m), max(0, y - m)
    win = sheet.crop((x0, y0, min(sheet.width, x + w + m), min(sheet.height, y + h + m)))
    a = alpha_mask(win, 24)
    lab, n = label_components(dilate(a, 3))
    cm = np.zeros(a.shape, dtype=bool)
    cm[y - y0:y - y0 + h, x - x0:x - x0 + w] = True
    keep = np.zeros(a.shape, dtype=bool)
    sizes = [int(((lab == i) & a).sum()) for i in range(1, n + 1)]
    biggest = max(sizes) if sizes else 1
    for i in range(1, n + 1):
        comp = (lab == i) & a
        inside = int((comp & cm).sum())
        total = sizes[i - 1]
        if inside >= 20 and inside >= 0.6 * total and total >= 0.15 * biggest:
            keep |= comp
    arr = np.array(win)
    arr[~keep, 3] = 0
    return clean_alpha(Image.fromarray(arr, 'RGBA'))


def store_actor(reg, aid, kind, display, dh, frames, quality, facing, provenance, notes=None, fallback=None, portrait=None,
                provisional=None):
    notes = notes or {}
    battle = {}
    for st, im in frames.items():
        q = quality
        n = notes.get(st, '')
        if isinstance(q, dict):
            q = q.get(st, 'derived')
        battle[st] = save_frame(im, f'enemies/{aid}/battle/{st}.png', q, facing, n, trim=True)
    por = None
    if portrait is not None:
        por = save_frame(portrait, f'enemies/{aid}/portrait.png', quality if isinstance(quality, str) else 'derived', 'front',
                         notes.get('portrait', ''), trim=True)
    entry = dict(id=aid, kind=kind, displayName=display, facing=facing, displayHeight=dh, battle=battle,
                 approved=False, provisional=(quality != 'genuine') if provisional is None else provisional, provenance=provenance)
    if por:
        entry['portrait'] = por
    if fallback:
        entry['fallbackReason'] = fallback
    reg['actors'][aid] = entry
    return entry


def build_enemies(reg, log):
    frames_by_actor = {}
    for aid, (stem, display, dh, picks) in SPEC.items():
        sheet = clean_alpha(Image.open(ENEMY_SHEETS / f'{stem}.png'))
        boxes = components(sheet, dil=2)
        fr = {}
        portrait = None
        notes = {}
        for st, p in picks.items():
            im = pick_image(sheet, boxes, p)
            if st == 'portrait':
                portrait = im
                continue
            fr[st] = im
        # explicit aliasing notes: states that reuse another pose
        if picks.get('special') == picks.get('beam'):
            notes['special'] = 'alias of beam pose'
        notes['idle'] = f'sheet={stem}.png frames hand-assigned (see tools/art_enemies.py SPEC); sprite is front/3-4 view (flip freely)'
        store_actor(reg, aid, 'enemy', display, dh, fr, 'genuine', 'front',
                    f'bundle 03-enemies/source-sheets/{stem}.png (hand-assigned frames)', notes, portrait=portrait)
        frames_by_actor[aid] = (fr, portrait)
        log(f'[enemy] {aid}: {len(fr)} states from {stem}')
    build_cell_derived(reg, frames_by_actor, log)
    import art_procedural
    art_procedural.build_minions(reg, log)


def grade(im, hue_to=None, sat=1.0, val=1.0, lo=60, hi=170):
    a = np.array(im.convert('RGBA'))
    h, s, v = rgb_to_hsv(a)
    m = (a[..., 3] > 0)
    if hue_to is not None:
        sel = m & (h >= lo) & (h <= hi) & (s > 0.15)
        h = np.where(sel, hue_to + (h - (lo + hi) / 2) * 0.25, h)
    s = np.clip(s * sat, 0, 1)
    v = np.clip(v * val, 0, 1)
    rgb = hsv_to_rgb(h, s, v)
    a[..., :3] = np.where(m[..., None], rgb, a[..., :3])
    return Image.fromarray(a, 'RGBA')


def half(im):
    """2:1 nearest-neighbour reduction (integer factor, no smoothing)."""
    return im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.NEAREST)


def build_cell_derived(reg, frames_by_actor, log):
    perfect, ppor = frames_by_actor['cell-perfect']
    # ---- Super Perfect Cell: boosted/golden-tinted Perfect Cell with gold aura rim and baked lightning
    seed = [0]

    def sup(im):
        seed[0] += 1
        g = grade(im, hue_to=70, sat=1.25, val=1.1, lo=60, hi=170)
        g = glow_outline(g, (255, 215, 60), 4, 190)
        return lightning(g, 500 + seed[0], count=14, color=(255, 255, 200))
    fr = {st: sup(im) for st, im in perfect.items()}
    store_actor(reg, 'cell-super-perfect', 'enemy', 'Super Perfect Cell', 268, fr, 'derived', 'front',
                'derived from cell-perfect: yellow-shifted/boosted colour, gold aura rim, baked lightning arcs',
                {'idle': 'derived: no Super Perfect Cell sheet exists in the bundle; visually distinct from cell-perfect but not redrawn art'},
                fallback='missing-art: super-perfect-cell (derived from Perfect Cell with aura/lightning, documented)',
                portrait=lightning(grade(ppor, hue_to=70, sat=1.2, val=1.1), 9, 6), provisional=True)
    # ---- Cell Junior: blue-shifted, half-scale Perfect Cell (integer 2:1 NEAREST)
    def jr(im):
        return half(grade(im, hue_to=205, sat=1.15, val=1.05, lo=60, hi=170))
    fr = {st: jr(im) for st, im in perfect.items()}
    store_actor(reg, 'cell-junior', 'enemy', 'Cell Junior', 120, fr, 'derived', 'front',
                'derived from cell-perfect: hue-shifted to blue, 2:1 nearest-neighbour reduction',
                {'idle': 'derived small blue Cell; real Cell Junior art (distinct anatomy/proportions) missing'},
                fallback='missing-art: cell-junior (blue half-scale Perfect Cell)', portrait=jr(ppor), provisional=True)
