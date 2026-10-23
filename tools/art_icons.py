"""Grid-sliced icons. skill_status_icon_atlas and item_icon_atlas are regular 12x8 grids (user-confirmed): every icon is
cut by UNIFORM CELL (never by connected component), all pixels of the cell are kept (glows included), trimmed to the cell's
alpha bbox and centred on a fixed 64x64 canvas (NEAREST, one scale factor per icon). Writes
public/assets/ui/skills|items|icons and fills reg skillIcons / itemIcons / uiIcons."""
from __future__ import annotations
import re
import numpy as np
from PIL import Image
from art_lib import ROOT, OUT, clean_alpha, flip, frame_meta, trim_pad, alpha_mask

H = ROOT / 'art' / 'handoff' / 'ui_and_icons'
COLS, ROWS, SIZE, FIT = 12, 8, 64, 60
_atlas: dict = {}


def atlas(name):
    if name not in _atlas:
        _atlas[name] = Image.open(H / f'{name}.png').convert('RGBA')
    return _atlas[name]


MARGIN = 16
# measured row boundaries (zero-alpha gaps) of the two atlases; columns are uniform (width/12)
ROW_EDGES = {
    'skill_status_icon_atlas': [0, 164, 294, 434, 592, 722, 844, 956, 1086],
    'item_icon_atlas': [0, 143, 292, 418, 567, 704, 834, 962, 1086],
}


_cols: dict = {}


def col_edges(name, r):
    """Column boundaries of one row band: the 11 deepest separated valleys of the alpha projection (columns are not perfectly uniform)."""
    key = (name, r)
    if key in _cols:
        return _cols[key]
    im = atlas(name)
    y0, y1 = ROW_EDGES[name][r], ROW_EDGES[name][r + 1]
    proj = (np.array(im)[y0:y1, :, 3] > 40).sum(0).astype(float)
    p = np.convolve(proj, np.ones(5) / 5, 'same')
    uni = im.width / COLS
    edges = [0]
    for c in range(1, COLS):
        lo, hi = int(c * uni - 0.42 * uni), int(c * uni + 0.42 * uni)
        edges.append(lo + int(np.argmin(p[lo:hi])))
    edges.append(im.width)
    _cols[key] = edges
    return edges


def cell(name, idx, cols=COLS, rows=ROWS):
    """One grid cell (row bands = measured zero-alpha gaps, column bands = projection valleys). Everything inside the cell is kept
    (all pieces, glows included); tiny fragments whose centroid is outside the cell are dropped as neighbour bleed."""
    from art_lib import label_components
    im = atlas(name)
    r, c = divmod(idx, cols)
    y0, y1 = ROW_EDGES[name][r], ROW_EDGES[name][r + 1]
    ce = col_edges(name, r)
    x0, x1 = ce[c], ce[c + 1]
    win = np.array(im.crop((x0 - 20 if x0 > 20 else 0, y0, min(im.width, x1 + 20), y1)))
    ox = x0 - 20 if x0 > 20 else 0
    m = win[..., 3] > 40
    lab, n = label_components(m)
    keep = np.zeros(m.shape, bool)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 12:
            continue
        cx = xs.mean() + ox
        if x0 <= cx < x1:
            keep |= lab == i
    # hard clip to the cell rectangle (glow of neighbours merged into this piece is cut at the valley)
    clip = np.zeros(m.shape, bool)
    clip[:, max(0, x0 - ox):x1 - ox] = True
    win[~(keep & clip), 3] = 0
    return Image.fromarray(win, 'RGBA')


def drop_border_slivers(im: Image.Image) -> Image.Image:
    """remove pieces smaller than 3% of the main piece whose bbox touches the image border (neighbour bleed)"""
    from art_lib import label_components
    a = np.array(im)
    m = a[..., 3] > 24
    lab, n = label_components(m)
    if n < 2:
        return im
    sizes = [int((lab == i).sum()) for i in range(1, n + 1)]
    big = max(sizes)
    ys0, xs0 = np.nonzero(m)
    x0, x1, y0, y1 = xs0.min(), xs0.max(), ys0.min(), ys0.max()
    for i in range(1, n + 1):
        if sizes[i - 1] >= 0.03 * big:
            continue
        ys, xs = np.nonzero(lab == i)
        if xs.min() <= x0 + 1 or xs.max() >= x1 - 1 or ys.min() <= y0 + 1 or ys.max() >= y1 - 1:
            a[lab == i, 3] = 0
    return Image.fromarray(a, 'RGBA')


def to_icon(im: Image.Image, fit: int = FIT, size: int = SIZE) -> Image.Image:
    im = trim_pad(drop_border_slivers(clean_alpha(im, 24)), 0)
    s = min(fit / im.width, fit / im.height)
    nw, nh = max(1, round(im.width * s)), max(1, round(im.height * s))
    if s >= 1:
        k = int(s)
        nw, nh = im.width * k, im.height * k
    im = im.resize((nw, nh), Image.NEAREST)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - nw) // 2, (size - nh) // 2))
    return out


def save(im, rel):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p, optimize=True)
    return 'assets/' + rel


# ------------------------------------------------------------------ skill mapping (cell index = row*12+col)
SKILL_CELL = {
    'goku_0': 9, 'goku_1': 13, 'goku_2': 19, 'goku_3': 14, 'goku_4': 3, 'goku_5': 4, 'goku_6': 54, 'goku_7': 7, 'goku_8': 58,
    'goku_9': 8, 'goku_10': 35, 'goku_11': 36,
    'gohan_0': 1, 'gohan_1': 17, 'gohan_2': 0, 'gohan_3': 61, 'gohan_4': 26, 'gohan_5': 15, 'gohan_6': 6, 'gohan_7': 33,
    'gohan_8': 44, 'gohan_9': 52, 'gohan_10': 46, 'gohan_11': 47,
    'vegeta_0': 84, 'vegeta_1': 87, 'vegeta_2': 92, 'vegeta_3': 10, 'vegeta_4': 5, 'vegeta_5': 55, 'vegeta_6': 69, 'vegeta_7': 60,
    'vegeta_8': 86, 'vegeta_9': 29, 'vegeta_10': 94, 'vegeta_11': 95,
    'piccolo_0': 88, 'piccolo_1': 34, 'piccolo_2': 85, 'piccolo_3': 78, 'piccolo_4': 48, 'piccolo_5': 66, 'piccolo_6': 16,
    'piccolo_7': 89, 'piccolo_8': 90, 'piccolo_9': 79, 'piccolo_10': 63, 'piccolo_11': 51,
    'krillin_0': 71, 'krillin_1': 2, 'krillin_2': 23, 'krillin_3': 76, 'krillin_4': 83, 'krillin_5': 68, 'krillin_6': 64,
    'krillin_7': 57, 'krillin_8': 73, 'krillin_9': 91, 'krillin_10': 49, 'krillin_11': 72,
    'tien_0': 30, 'tien_1': 31, 'tien_2': 32, 'tien_3': 25, 'tien_4': 77, 'tien_5': 56, 'tien_6': 67, 'tien_7': 81,
    'tien_8': 50, 'tien_9': 82, 'tien_10': 43, 'tien_11': 45,
    # trunks: sword/slash/fire themed cells
    'trunks_0': 11, 'trunks_1': 24, 'trunks_2': 80, 'trunks_3': 12, 'trunks_4': 22, 'trunks_5': 27, 'trunks_6': 70,
    'trunks_7': 28, 'trunks_8': 74, 'trunks_9': 21, 'trunks_10': 59, 'trunks_11': 53,
}
# item atlas is NOT a uniform 12-column grid in practice (rows hold 9-12 icons of different widths/spacing); icons are cut per
# natural horizontal segment of the row band. ITEM_SEG_COUNTS = icons per segment (merged/touching icons are split at projection valleys).
ITEM_SEG_COUNTS = {0: [4, 1, 1, 1, 1, 1, 1, 1, 1], 1: [1] * 12, 2: [1] * 10, 3: [1] * 11, 4: [1] * 11, 5: [1] * 12, 6: [1] * 12,
                   7: [1, 1, 1, 3, 1, 1, 1, 1, 2]}
ITEM_CELL = {  # item id -> (row, index within row)
    'senzu_small': (3, 7), 'senzu_large': (0, 4), 'ki_capsule': (1, 1), 'ki_capsule_large': (1, 5), 'revive_seed': (3, 8),
    'antidote': (3, 0), 'supply_pack': (4, 3), 'power_charm': (7, 7), 'guard_charm': (7, 8), 'anti_drain_charm': (7, 9),
    'speed_charm': (2, 0), 'rage_charm': (2, 8), 'focus_band': (2, 2), 'gero_record': (5, 10), 'lab_medicine': (3, 1),
    'relay_part': (7, 6), 'research_part': (3, 6), 'medicine_vial': (3, 2), 'scouter': (2, 4), 'dragon_radar': (5, 7),
    'meal': (6, 2), 'meat_ration': (6, 3), 'food_ration': (0, 5), 'dragon_ball': (5, 0), 'capsule_blue': (0, 1),
    'capsule_gold': (0, 7), 'capsule_purple': (0, 8), 'capsule_key': (7, 4), 'energy_orb': (6, 0), 'energy_crystal': (4, 8),
    'healing_capsule': (0, 2), 'healing_fruit': (3, 10), 'power_capsule': (0, 3), 'supply_bottle': (3, 0), 'supply_box': (4, 0),
    'travel_supply': (4, 3), 'ki_capsule_raw': (1, 1),
}
_items: dict = {}


def item_icons_raw():
    """{(row, k): RGBA image} for the item atlas."""
    if _items:
        return _items
    im = atlas('item_icon_atlas')
    arr = np.array(im)
    E = ROW_EDGES['item_icon_atlas']
    for r in range(8):
        y0, y1 = E[r], E[r + 1]
        strong = (arr[y0:y1, :, 3] > 120).any(0)
        segs, st, last = [], None, None
        for x, v in enumerate(strong):
            if v:
                st = x if st is None else st
                last = x
            elif st is not None and x - last > 1:
                segs.append((st, last)); st = None
        if st is not None:
            segs.append((st, last))
        assert len(segs) == len(ITEM_SEG_COUNTS[r]), (r, len(segs))
        pieces = []
        for (xa, xb), n in zip(segs, ITEM_SEG_COUNTS[r]):
            if n == 1:
                pieces.append((xa, xb)); continue
            proj = np.convolve((arr[y0:y1, xa:xb + 1, 3] > 40).sum(0).astype(float), np.ones(5) / 5, 'same')
            cuts, w = [], (xb - xa + 1) / n
            for k in range(1, n):
                lo, hi = int(k * w - 0.3 * w), int(k * w + 0.3 * w)
                cuts.append(xa + lo + int(np.argmin(proj[lo:hi])))
            ed = [xa] + cuts + [xb + 1]
            pieces += [(ed[i], ed[i + 1] - 1) for i in range(n)]
        for k, (xa, xb) in enumerate(pieces):
            pad = 4
            win = arr[y0:y1, max(0, xa - pad):xb + 1 + pad].copy()
            ox = max(0, xa - pad)
            clip = np.zeros(win.shape[:2], bool)
            clip[:, (xa - ox):(xb - ox + 1)] = True
            clip[:, :] |= (win[..., 3] > 0) & np.zeros_like(clip)
            win[~clip, 3] = 0
            _items[(r, k)] = Image.fromarray(win, 'RGBA')
    return _items


# status glyphs (cells of the skill/status atlas); '+down' means a derived red down-arrow badge is added
STATUS_CELL = {
    'stun': 70, 'blind': 2, 'seal': None, 'atkUp': 55, 'atkDown': ('flipv', 55), 'defUp': 61, 'defDown': ('down', 54),
    'spdUp': 62, 'spdDown': ('down', 53), 'regen': 48, 'evade': 68, 'counter': 67, 'reflect': 71, 'cover': 64,
    'heavyGuard': 54, 'barrier': 89, 'sparking': 58, 'mine': 83, 'marked': 57, 'endure': 52, 'focus': 51, 'accUp': 56,
    'critUp': 60, 'multiform': 77, 'drain': 85, 'absorbLock': 87, 'adapted': 76, 'virus': 95, 'vulnerable': 80,
    'storedBeam': 9, 'absorbing': 91, 'shielded': 81, 'exposed': 43,
}
CMD_CELL = {  # skill atlas cells (cmd-attack/skills/rage/items come from the compact atlas, see below)
    'cmd-defend': 54, 'cmd-combo': 64, 'cmd-sparking': 58, 'cmd-form': 36, 'cmd-flee': 53, 'cmd-finisher': 47, 'cmd-attack': 12,
}


def badge_down(im: Image.Image) -> Image.Image:
    a = np.array(im)
    # red down-arrow badge, bottom-right 18x18, dark outline
    for y in range(40, 62):
        t = (y - 40) / 21
        half = int(9 * (1 - t)) if t > 0.45 else 4
        xc = 52
        for x in range(xc - 9, xc + 10):
            if y < 50 and abs(x - xc) <= 3:
                a[y, x] = (214, 40, 40, 255)
            elif y >= 50 and abs(x - xc) <= (61 - y) * 0.9:
                a[y, x] = (214, 40, 40, 255)
    out = Image.fromarray(a, 'RGBA')
    return out


def seal_glyph() -> Image.Image:
    """lock glyph cut from the targeting atlas (red lock) if found, else drawn."""
    return None


def key_black(im: Image.Image, thr: int = 28) -> Image.Image:
    """compact_combat_ui_atlas has an opaque black ground: key by luminance (glyph crops only; outlines are bright)."""
    a = np.array(im.convert('RGBA')).astype(int)
    lum = a[..., :3].max(-1)
    alpha = np.clip((lum - thr) * 6, 0, 255)
    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def rect_icon(name, rect, keyed=False, fit=FIT):
    x, y, w, h = rect
    im = atlas(name).crop((x, y, x + w, y + h))
    if keyed:
        im = key_black(im)
    return to_icon(im, fit)


# rects in compact_combat_ui_atlas (opaque black): glyph interiors of the command slots / cursor sheets
COMPACT_RECTS = {
    'cmd-skills': (50, 152, 56, 56),
    'cmd-rage': (50, 262, 56, 56),
    'cmd-items': (50, 366, 56, 56),
    'cursor-ring': (36, 462, 124, 124),
    'cursor-arrow': (885, 18, 62, 52),
    'cursor-target': (818, 238, 214, 214),
}


def lock_from_targeting():
    im = atlas('targeting_ui_atlas')
    return im.crop((1205, 385, 1285, 450))


def build_icons(reg, log):
    import shutil
    for d in ('skills', 'items', 'icons', 'frames'):
        shutil.rmtree(OUT / 'ui' / d, ignore_errors=True)
    reg['skillIcons'], reg['itemIcons'], reg['uiIcons'] = {}, {}, {}
    ids = []
    for hero in ('goku', 'gohan', 'vegeta', 'piccolo', 'trunks', 'krillin', 'tien'):
        ids += [f'{hero}_{i}' for i in range(12)]
    assert sorted(ids) == sorted(SKILL_CELL), 'skill id set mismatch'
    assert len(set(SKILL_CELL.values())) == 84, 'skill cells must be unique'
    for sid, c in SKILL_CELL.items():
        reg['skillIcons'][sid] = save(to_icon(cell('skill_status_icon_atlas', c)), f'ui/skills/{sid}.png')
    for iid, c in ITEM_CELL.items():
        reg['itemIcons'][iid] = save(to_icon(item_icons_raw()[c]), f'ui/items/{iid}.png')
    for k, spec in STATUS_CELL.items():
        if spec is None:
            ic = to_icon(lock_from_targeting())
        elif isinstance(spec, tuple):
            kind, c = spec
            base = to_icon(cell('skill_status_icon_atlas', c))
            ic = base.transpose(Image.FLIP_TOP_BOTTOM) if kind == 'flipv' else badge_down(base)
        else:
            ic = to_icon(cell('skill_status_icon_atlas', spec))
        reg['uiIcons'][f'status-{k}'] = save(ic, f'ui/icons/status-{k}.png')
    for k, c in CMD_CELL.items():
        reg['uiIcons'][k] = save(to_icon(cell('skill_status_icon_atlas', c)), f'ui/icons/{k}.png')
    for k, r in COMPACT_RECTS.items():
        reg['uiIcons'][k] = save(rect_icon('compact_combat_ui_atlas', r, keyed=True), f'ui/icons/{k}.png')
    log(f'[icons] {len(reg["skillIcons"])} skills, {len(reg["itemIcons"])} items, {len(reg["uiIcons"])} uiIcons')
