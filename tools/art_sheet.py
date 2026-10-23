"""Sheet analysis for the 1448x1086 handoff character sheets: reading-order component list grouped in rows."""
import numpy as np
from PIL import Image
from art_lib import components, alpha_mask


def analyse(path, dil=5, min_area=500, thr=90):
    im = Image.open(path).convert('RGBA')
    if im.mode == 'RGB':
        pass
    bs = [tuple(int(v) for v in b) for b in components(im, dil=dil, min_area=min_area, thr=thr)]
    # row clustering by centre-y
    items = sorted(bs, key=lambda b: b[1] + b[3] / 2)
    rows, cur = [], []
    for b in items:
        cy = b[1] + b[3] / 2
        if cur and cy - np.mean([c[1] + c[3] / 2 for c in cur]) > 70:
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    return im, [sorted(r, key=lambda b: b[0]) for r in rows]


def key_background(im: Image.Image, thr: int = 13) -> Image.Image:
    """Opaque sheets with a flat near-black ground: flood-fill from the border over pixels darker than thr (keeps dark outlines
    that are enclosed by artwork)."""
    from collections import deque
    a = np.array(im.convert('RGBA'))
    dark = a[..., :3].max(-1) < thr
    h, w = dark.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    a[seen, 3] = 0
    return Image.fromarray(a, 'RGBA')


def load_sheet(path):
    im = Image.open(path)
    if im.mode == 'RGB' or (np.array(im.convert('RGBA'))[..., 3] > 250).mean() > 0.9:
        return key_background(im)
    return im.convert('RGBA')


def overview(path, out, dil=5, min_area=500, thr=90):
    from PIL import ImageDraw
    im = load_sheet(path)
    bs = [tuple(int(v) for v in b) for b in components(im, dil=dil, min_area=min_area, thr=thr)]
    bg = Image.new('RGBA', im.size, (60, 64, 90, 255)); bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    for i, (x, y, w, h) in enumerate(bs):
        d.rectangle([x, y, x + w, y + h], outline=(255, 40, 40, 255))
        d.rectangle([x, y, x + 30, y + 13], fill=(0, 0, 0, 255))
        d.text((x + 2, y + 1), str(i), fill=(255, 255, 0, 255))
    bg.save(out)
    return im, bs


def _segs(v, gap, minlen=1):
    out, s, last = [], None, None
    for i, x in enumerate(v):
        if x:
            if s is None:
                s = i
            last = i
        elif s is not None and i - last > gap:
            out.append((s, last)); s = None
    if s is not None:
        out.append((s, last))
    return [(a, b) for a, b in out if b - a + 1 >= minlen]


def bands(im, ygap=5, xgap=3, thr=90, min_h=30, min_w=14):
    """Projection-based segmentation: rows = y-bands separated by empty gaps, cells = x-segments inside each band.
    Returns rows -> list of (x, y, w, h) tight boxes. Frames whose art overlaps neighbours need manual rects."""
    a = np.array(im)[..., 3] > thr
    rows = []
    for (y0, y1) in _segs(a.any(1), ygap, min_h):
        band = a[y0:y1 + 1]
        cells = []
        for (x0, x1) in _segs(band.any(0), xgap, min_w):
            sub = band[:, x0:x1 + 1]
            ys = np.nonzero(sub.any(1))[0]
            cells.append((x0, y0 + int(ys.min()), x1 - x0 + 1, int(ys.max() - ys.min() + 1)))
        rows.append(cells)
    return rows


def overview_bands(path, out, **kw):
    from PIL import ImageDraw
    im = load_sheet(path)
    rows = bands(im, **kw)
    bg = Image.new('RGBA', im.size, (60, 64, 90, 255)); bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    for r, cells in enumerate(rows):
        for k, (x, y, w, h) in enumerate(cells):
            d.rectangle([x, y, x + w, y + h], outline=(255, 40, 40, 255))
            d.rectangle([x, y, x + 36, y + 13], fill=(0, 0, 0, 255))
            d.text((x + 2, y + 1), f'{r}.{k}', fill=(255, 255, 0, 255))
    bg.save(out)
    return im, rows
