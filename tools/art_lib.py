"""Shared helpers for the AOTS3 art pipeline (segmentation, frame metadata, contact sheets)."""
from __future__ import annotations
import numpy as np
from collections import deque
from PIL import Image, ImageDraw

ALPHA_T = 24


def alpha_mask(im: Image.Image, t: int = ALPHA_T) -> np.ndarray:
    return np.array(im.convert('RGBA'))[..., 3] > t


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(r):
        p = np.pad(out, 1)
        out = (p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
    return out


def components(im: Image.Image, dil: int = 6, min_area: int = 200, scale: int = 2, thr: int = ALPHA_T):
    """Return list of (x,y,w,h) bounding boxes of dilated alpha components (full-res coords), sorted top-to-bottom row then left-to-right."""
    m = alpha_mask(im, thr)
    H, W = m.shape
    sm = m[::scale, ::scale]
    sm = dilate(sm, max(1, dil // scale))
    h, w = sm.shape
    lab = np.zeros((h, w), dtype=np.int32)
    boxes = []
    n = 0
    for sy in range(h):
        row = sm[sy]
        for sx in np.flatnonzero(row & (lab[sy] == 0)):
            n += 1
            q = deque([(sy, sx)])
            lab[sy, sx] = n
            x0 = x1 = sx
            y0 = y1 = sy
            cnt = 0
            while q:
                cy, cx = q.popleft()
                cnt += 1
                x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and sm[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = n
                        q.append((ny, nx))
            boxes.append([x0 * scale, y0 * scale, (x1 - x0 + 1) * scale, (y1 - y0 + 1) * scale, cnt])
    # refine to true alpha bbox and filter
    out = []
    for x, y, bw, bh, cnt in boxes:
        sub = m[y:y + bh, x:x + bw]
        if sub.sum() < min_area:
            continue
        ys, xs = np.where(sub)
        out.append((x + int(xs.min()), y + int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    # sort in reading order, grouping by row (centre y)
    out.sort(key=lambda b: (b[1] + b[3] // 2) // 90 * 100000 + b[0])
    return out


def frame_meta(im: Image.Image):
    """bbox (x,y,w,h), feet (x,y), visible pixel count of an RGBA image."""
    m = alpha_mask(im, 0)
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    # feet x = centre of the lowest rows (the character's feet), not of the whole bbox, so wide beams/auras do not shift the anchor
    low = m[max(y0, y1 - 5):y1 + 1]
    lx = np.where(low.any(0))[0]
    fx = round((lx.min() + lx.max() + 1) / 2)
    return dict(bbox=[x0, y0, x1 - x0 + 1, y1 - y0 + 1], feet=[int(fx), y1 + 1], visible=int(m.sum()))


def trim_pad(im: Image.Image, pad: int = 2):
    """Crop to visible bbox plus pad. Returns new image."""
    im = im.convert('RGBA')
    m = alpha_mask(im, 0)
    ys, xs = np.where(m)
    if len(xs) == 0:
        return im
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    out = Image.new('RGBA', (int(x1 - x0 + 1 + 2 * pad), int(y1 - y0 + 1 + 2 * pad)), (0, 0, 0, 0))
    out.paste(im.crop((int(x0), int(y0), int(x1 + 1), int(y1 + 1))), (pad, pad))
    return out


def contact_sheet(items, cols=6, cell=(220, 220), bg=(70, 70, 96, 255), label=True, scale_up=True):
    """items: list of (label, PIL image). Draws nearest-neighbour scaled onto a grid."""
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell[0], rows * cell[1]), bg)
    d = ImageDraw.Draw(sheet)
    for i, (lab, im) in enumerate(items):
        cx, cy = (i % cols) * cell[0], (i // cols) * cell[1]
        im = im.convert('RGBA')
        s = min((cell[0] - 8) / im.width, (cell[1] - 22) / im.height)
        if not scale_up:
            s = min(s, 1)
        s = max(s, 0.05)
        if s >= 1:
            s = int(s)
            r = im.resize((im.width * s, im.height * s), Image.NEAREST)
        else:
            r = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST)
        sheet.alpha_composite(r, (cx + (cell[0] - r.width) // 2, cy + 18 + (cell[1] - 22 - r.height)))
        if label:
            d.text((cx + 3, cy + 3), str(lab), fill=(255, 255, 160, 255))
    return sheet


# ---------------------------------------------------------------------------
# registry / output helpers
# ---------------------------------------------------------------------------
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art' / 'source'
OUT = ROOT / 'public' / 'assets'


def clean_alpha(im: Image.Image, lo: int = 16, hi: int = 0) -> Image.Image:
    """Zero out invisible alpha noise (alpha<lo). If hi>0, alpha>=hi is snapped to 255 (pixel-art binary edge)."""
    a = np.array(im.convert('RGBA'))
    al = a[..., 3]
    al[al < lo] = 0
    if hi:
        al[al >= hi] = 255
    a[..., 3] = al
    a[al == 0, :3] = 0
    return Image.fromarray(a, 'RGBA')


def save_frame(im: Image.Image, rel: str, quality: str, facing: str, note: str = '', trim: bool = False, pad: int = 2):
    """Write PNG under public/assets/<rel>; return FrameRef dict (paths are 'assets/<rel>')."""
    im = im.convert('RGBA')
    if trim:
        im = trim_pad(im, pad)
    meta = frame_meta(im)
    assert meta and meta['visible'] > 0, f'empty frame {rel}'
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, optimize=True)
    d = dict(path='assets/' + rel.replace(chr(92), '/'), w=im.width, h=im.height, bbox=meta['bbox'], feet=meta['feet'],
             quality=quality, facing=facing, visible=meta['visible'])
    if note:
        d['note'] = note
    return d


def flip(im: Image.Image) -> Image.Image:
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def glow_outline(im: Image.Image, color, radius: int = 3, alpha: int = 170, soft: bool = True) -> Image.Image:
    """Derived aura: coloured dilated silhouette behind the sprite (nearest-neighbour style, hard rings)."""
    im = im.convert('RGBA')
    pad = radius * 3 + 4
    canvas = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad, pad))
    m = alpha_mask(canvas, 40)
    out = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layers = []
    for i, r in enumerate((radius * 3, radius * 2, radius)):
        dm = dilate(m, r)
        a = int(alpha * (0.35 + 0.3 * i))
        layer = np.zeros(canvas.size[::-1] + (4,), dtype=np.uint8)
        layer[dm] = (*color, a)
        layers.append(Image.fromarray(layer, 'RGBA'))
    for l in layers:
        out.alpha_composite(l)
    out.alpha_composite(canvas)
    return out


def locate_crop(sheet: Image.Image, crop: Image.Image, tries: int = 6):
    """Find (ox, oy) such that sheet[oy:oy+h, ox:ox+w] == crop on visible pixels. Returns None if not found."""
    S = np.array(sheet.convert('RGBA'))
    C = np.array(crop.convert('RGBA'))
    ys, xs = np.where(C[..., 3] > 200)
    if len(xs) == 0:
        return None
    rng = np.random.default_rng(7)
    idx = rng.choice(len(xs), size=min(len(xs), 400), replace=False)
    sel = [(int(ys[i]), int(xs[i])) for i in idx]
    H, W = S.shape[:2]
    h, w = C.shape[:2]
    # candidates from first pixel
    y0, x0 = sel[0]
    cand = np.argwhere((S[..., :4] == C[y0, x0]).all(-1))
    cand = [(cy - y0, cx - x0) for cy, cx in cand]
    cand = [(oy, ox) for oy, ox in cand if -h < oy < H and -w < ox < W]
    for (py, px) in sel[1:]:
        if len(cand) <= 1:
            break
        keep = []
        for oy, ox in cand:
            yy, xx = oy + py, ox + px
            if 0 <= yy < H and 0 <= xx < W and (S[yy, xx] == C[py, px]).all():
                keep.append((oy, ox))
        cand = keep
    for oy, ox in cand:
        # verify on all visible pixels inside sheet bounds
        ok = True
        for py, px in sel:
            yy, xx = oy + py, ox + px
            if not (0 <= yy < H and 0 <= xx < W and (S[yy, xx] == C[py, px]).all()):
                ok = False
                break
        if ok:
            return ox, oy
    return None


def label_components(mask: np.ndarray):
    """4-connected labelling (full resolution). Returns (labels int32, count)."""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    n = 0
    for sy in range(h):
        for sx in np.flatnonzero(mask[sy] & (lab[sy] == 0)):
            n += 1
            q = deque([(sy, int(sx))])
            lab[sy, sx] = n
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = n
                        q.append((ny, nx))
    return lab, n


def recover_full(sheet: Image.Image, crop: Image.Image, origin, margin: int = 40, dil: int = 0):
    """Re-extract the sprite that a bundle crop (possibly clipped by its cell) came from, using the source sheet.
    Returns (image, status) where status is 'recovered', 'unchanged' or 'fallback:<reason>'."""
    ox, oy = int(origin[0]), int(origin[1])
    w, h = crop.size
    x0, y0 = max(0, ox - margin), max(0, oy - margin)
    x1, y1 = min(sheet.width, ox + w + margin), min(sheet.height, oy + h + margin)
    win = sheet.convert('RGBA').crop((x0, y0, x1, y1))
    m = alpha_mask(win, 24)
    lab, n = label_components(dilate(m, dil) if dil else m)
    cm = np.zeros(m.shape, dtype=bool)
    cx0, cy0 = ox - x0, oy - y0
    cm[max(0, cy0):cy0 + h, max(0, cx0):cx0 + w] = True
    orig = m & cm
    keep = np.zeros(m.shape, dtype=bool)
    for i in range(1, n + 1):
        comp = lab == i
        inside = int((comp & orig).sum())
        outside = int((comp & m & ~cm).sum())
        if inside >= 30 and outside <= inside * 3 + 4000:
            keep |= comp
    if not keep.any():
        return crop, 'fallback:no-component'
    a = np.array(win)
    a[~(keep & m), 3] = 0
    out = Image.fromarray(a, 'RGBA')
    om = frame_meta(crop)
    nm = frame_meta(out)
    grew = nm['visible'] > om['visible'] + 2
    if not grew:
        return crop, 'unchanged'
    # reject if recovered bbox is wildly larger than the crop bbox (neighbour merge)
    if nm['bbox'][2] - om['bbox'][2] > max(10, 0.07 * om['bbox'][2]) or nm['bbox'][3] - om['bbox'][3] > max(10, 0.07 * om['bbox'][3]):
        return crop, 'fallback:merged'
    return trim_pad(out, 2), 'recovered'
