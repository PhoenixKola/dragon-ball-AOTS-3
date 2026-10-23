#!/usr/bin/env python3
"""Runtime art audit: bundle integrity (audit_assets_bundle.py) + generated registry checks."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
reg = json.loads((ROOT / 'src/data/artRegistry.generated.json').read_text(encoding='utf8'))
errors, warns = [], []
seen_paths = set()


def frames_of(reg):
    for aid, a in reg['actors'].items():
        for k, f in a['battle'].items():
            yield f'actor {aid} battle/{k}', f, True
        for d, v in (a.get('overworld') or {}).items():
            yield f'actor {aid} ow/{d}/idle', v['idle'], True
            for i, w in enumerate(v['walk']):
                yield f'actor {aid} ow/{d}/walk{i+1}', w, True
        if a.get('portrait'):
            yield f'actor {aid} portrait', a['portrait'], False
    for wid, w in reg['worlds'].items():
        for i, f in enumerate(w['backdrops']):
            yield f'world {wid} backdrop{i}', f, False
    for vid, v in reg['vfx'].items():
        for i, f in enumerate(v['frames']):
            yield f'vfx {vid}/{i}', f, False


n = 0
clipped = []
for label, f, actor in frames_of(reg):
    n += 1
    p = PUB / f['path']
    seen_paths.add(f['path'])
    if not p.exists():
        errors.append(f'missing file {label} {f["path"]}'); continue
    im = Image.open(p).convert('RGBA')
    if im.size != (f['w'], f['h']):
        errors.append(f'size mismatch {label}: {im.size} vs {f["w"]}x{f["h"]}')
    a = np.array(im)[..., 3]
    vis = int((a > 0).sum())
    if vis <= 0 or vis != f['visible']:
        errors.append(f'visible mismatch {label}: {vis} vs {f["visible"]}')
    x, y, w, h = f['bbox']
    fx, fy = f['feet']
    if not (x <= fx <= x + w and y <= fy <= y + h):
        errors.append(f'feet outside bbox {label}')
    if f.get('approved'):
        errors.append(f'approved flag on {label}')
    if actor:
        edge = int((a[0] > 24).sum() + (a[-1] > 24).sum() + (a[:, 0] > 24).sum() + (a[:, -1] > 24).sum())
        if edge > 6:
            clipped.append((label, edge))
    if f['quality'] not in ('genuine', 'derived', 'procedural_fallback'):
        errors.append(f'bad quality {label}')
for aid, a in reg['actors'].items():
    if a.get('approved'):
        errors.append(f'actor approved: {aid}')
    if a['provisional'] and not a.get('fallbackReason') and a['battle']['idle']['quality'] != 'genuine':
        warns.append(f'provisional actor without fallbackReason: {aid}')
for wid, w in reg['worlds'].items():
    for cls, pth in w['tiles'].items():
        seen_paths.add(pth)
        if not (PUB / pth).exists(): errors.append(f'missing tile {wid}/{cls}')
    for pn, pr in w['props'].items():
        seen_paths.add(pr['path'])
        if not (PUB / pr['path']).exists(): errors.append(f'missing prop {wid}/{pn}')
for grp in ('skillIcons', 'itemIcons', 'uiFrames', 'uiIcons'):
    for k, pth in reg[grp].items():
        seen_paths.add(pth)
        if not (PUB / pth).exists(): errors.append(f'missing {grp}/{k}')
# ---- icon audit: 64x64, 1px border empty, one dominant component, no secondary >3% touching the border
from collections import deque
def comps(m):
    h, w = m.shape; lab = np.zeros((h, w), int); n = 0; out = []
    for sy in range(h):
        for sx in range(w):
            if m[sy, sx] and not lab[sy, sx]:
                n += 1; q = deque([(sy, sx)]); lab[sy, sx] = n; cells = []
                while q:
                    y, x = q.popleft(); cells.append((y, x))
                    for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                out.append(cells)
    return out
icon_n = 0
# multi-part-by-design icons (verified in docs/art-evidence/skillIcons.png/uiIcons.png): crystal pairs, sparkle clusters, slash shards
MULTIPART_OK = {'piccolo_7', 'trunks_2', 'cmd-sparking', 'cursor-target', 'status-barrier', 'status-sparking', 'status-vulnerable', 'piccolo_8', 'goku_8'}
for grp in ('skillIcons', 'itemIcons', 'uiIcons'):
    for k, pth in reg.get(grp, {}).items():
        im = Image.open(PUB / pth).convert('RGBA'); a = np.array(im)[..., 3]; icon_n += 1
        if im.size != (64, 64): errors.append(f'icon size {grp}/{k} {im.size}'); continue
        m = a > 24
        if not m.any(): errors.append(f'icon empty {grp}/{k}'); continue
        if m[0].any() or m[-1].any() or m[:, 0].any() or m[:, -1].any(): errors.append(f'icon touches border {grp}/{k}')
        cs = comps(m); big = max(len(c) for c in cs)
        for c in cs:
            if len(c) < big and len(c) > 0.03 * big:
                ys = [y for y, x in c]; xs = [x for y, x in c]
                if (min(xs) <= 3 or max(xs) >= 60 or min(ys) <= 3 or max(ys) >= 60) and k not in MULTIPART_OK:
                    errors.append(f'icon secondary component on border {grp}/{k}')
        ys, xs = np.nonzero(m); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        if abs(cx - 31.5) > 4 or abs(cy - 31.5) > 4: errors.append(f'icon off-centre {grp}/{k} ({cx:.0f},{cy:.0f})')
print(f'icons audited: {icon_n}')
# ---- world objects (chest/save/heal/shop): exist, recorded size, transparent, nothing touching the border
for k, o in (reg.get('objects') or {}).items():
    seen_paths.add(o['path'])
    p = PUB / o['path']
    if not p.exists(): errors.append(f'missing object {k}'); continue
    im = Image.open(p).convert('RGBA'); a = np.array(im)[..., 3]
    if im.size != (o['w'], o['h']): errors.append(f'object size {k}')
    if not (a == 0).any(): errors.append(f'object not transparent {k}')
    if (a > 24).sum() == 0: errors.append(f'object empty {k}')
    if (a[0] > 24).sum() + (a[-1] > 24).sum() + (a[:, 0] > 24).sum() + (a[:, -1] > 24).sum() > 0 and k not in ('chest-closed', 'chest-open', 'save', 'heal', 'shop'):
        warns.append(f'object touches border {k}')
    if not (20 <= o['displayHeight'] <= 90): errors.append(f'object displayHeight {k}')
for need in ('chest-closed', 'chest-open', 'save', 'heal', 'shop'):
    if need not in (reg.get('objects') or {}): errors.append(f'missing object key {need}')
# ---- title illustration
t = reg.get('title')
if not t: errors.append('registry.title missing')
else:
    for pth in (t['path'], t.get('small')):
        if pth:
            seen_paths.add(pth)
            if not (PUB / pth).exists(): errors.append(f'missing title file {pth}')
    ti = Image.open(PUB / t['path'])
    if ti.size != (t['w'], t['h']) or ti.size != (1672, 941): errors.append(f'title size {ti.size}')
# ---- red-fringe audit for the three patch-replaced actors: semi/edge pixels that are strongly red but not part of the art
for aid in ('tien-base', 'vegeta-ssj', 'gohan-ssj'):
    a_ = reg['actors'][aid]
    paths = [f['path'] for f in a_['battle'].values()] + [v['idle']['path'] for v in a_['overworld'].values()]
    for pth in paths:
        arr = np.array(Image.open(PUB / pth).convert('RGBA')).astype(int)
        al_ = arr[..., 3]
        if ((al_ > 0) & (al_ < 255)).any(): errors.append(f'semi-transparent pixels (fringe) in {pth}'); continue
        m_ = al_ > 0; p_ = np.pad(m_, 1)
        edge_ = m_ & ~(p_[:-2, 1:-1] & p_[2:, 1:-1] & p_[1:-1, :-2] & p_[1:-1, 2:])
        red_ = edge_ & (arr[..., 0] > arr[..., 1] + 60) & (arr[..., 0] > arr[..., 2] + 60) & (arr[..., 0] > 150)
        # Tien's red sash may touch the silhouette; allow a small count
        if red_.sum() > (40 if aid == 'tien-base' else 6): errors.append(f'red edge fringe ({int(red_.sum())} px) in {pth}')

if len(reg['skillIcons']) != 84: errors.append(f'skill icons {len(reg["skillIcons"])} != 84')
required = ['goku-base','goku-ssj','goku-weakened','gohan-base','gohan-ssj','gohan-ssj2','gohan-wounded','gohan-training','vegeta-base','vegeta-ssj','vegeta-ascended','trunks-base','trunks-ssj','trunks-ultra','piccolo-base','piccolo-kami','krillin-base','tien-base','mecha-frieza','king-cold','android-19','android-20','android-17','android-18','android-16','cell-imperfect','cell-semi-perfect','cell-perfect','cell-super-perfect','cell-junior','landing-security','recon-probe','drain-drone','armored-sentinel','security-grid','cell-husk','absorbed-shadow','cell-probe','training-sentinel','chamber-guardian','bulma','chi-chi','yamcha','kami','king-kai','mr-satan','researcher','civilian']
missing = [r for r in required if r not in reg['actors']]
if missing: errors.append(f'missing actors {missing}')
maps = ['landing_future','capsule_corp','south_city','rocky_outskirts','mountain_lab','lab_inner','gingertown','android_island','lookout','time_chamber','cell_games_approach','cell_games_arena']
if [m for m in maps if m not in reg['worlds']]: errors.append('missing worlds')
on_disk = {p.relative_to(PUB).as_posix() for p in (PUB / 'assets').rglob('*.png')}
orphan = sorted(on_disk - seen_paths)
src_used = {}
for a in reg['actors'].values():
    src_used[a['battle']['idle']['quality']] = src_used.get(a['battle']['idle']['quality'], 0) + 1
print(f'registry frames checked: {n}; actors {len(reg["actors"])}, worlds {len(reg["worlds"])}, vfx {len(reg["vfx"])}')
print('actor idle quality counts:', src_used)
print(f'frames touching their PNG edge (clipped candidates, >6 edge px): {len(clipped)}')
for c in clipped[:60]: print('   clipped?', c)
print(f'orphan PNGs under public/assets not referenced by the registry: {len(orphan)}')
for o in orphan[:20]: print('   orphan', o)
for w in warns: print('WARN', w)
for e in errors[:100]: print('ERROR', e)
print(f'ERRORS: {len(errors)}  WARNINGS: {len(warns)}')
sys.exit(1 if errors else 0)
