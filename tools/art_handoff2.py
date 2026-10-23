"""ART-HANDOFF2: remaining handoff sheets (NPCs, regular enemies, villains/bosses, extra hero forms) -> registry actors, plus the
facing audit.  Reuses the per-sheet component tables of art_handoff.py (verified on contact sheets in docs/art-evidence/h2-*.png).
Usage: python tools/art_handoff2.py [--scratch]   (scratch: write into tests/tmp/h2 + a scratch registry for review only)"""
from __future__ import annotations
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import art_lib
import art_handoff as H1
from art_lib import ROOT, label_components, dilate

# actors this module may (re)build. Order matters only for log readability.
VILLAINS = None   # all of H1.VILLAIN_SPECS unless filtered below
REGULAR = None
NPCS = None
EXTRA_FORMS = []  # filled by review (goku-ssj, trunks-ssj, piccolo-kami, gohan-wounded ...)

# truthful per-actor battle facing of the STORED frames (set by visual audit; 'right' => engine flips for enemies)
FACING: dict[str, str] = {}   # filled in build() for every enemy actor (default 'right': all handoff enemy sheets look to the right)
FACING_OVERRIDE: dict[str, str] = {}


def _fade_pick(rel, spec):
    """('fade', x, y, w, h, px): crop a rect whose right end is a beam cut by the sheet layout; alpha fades out over the last px columns."""
    im, _ = H1.sheet(rel)
    _, x, y, w, h, px = spec
    c = np.array(im.crop((x, y, x + w, y + h)))
    ramp = np.clip((np.arange(w)[None, :] - (w - px)) / px, 0, 1)
    c[..., 3] = (c[..., 3] * (1 - ramp)).astype(np.uint8)
    return H1.only_main(Image.fromarray(c, 'RGBA'))


_orig_pick = H1.pick


def _drop_border_specks(img, frac=0.05):
    """remove tiny pieces that touch the crop border (slivers of neighbouring frames / aura rows) but keep everything inside"""
    a = np.array(img)
    m = a[..., 3] > 24
    lab, n = label_components(m)
    if n < 2:
        return img
    sizes = np.array([int(((lab == i) & m).sum()) for i in range(1, n + 1)])
    big = sizes.max()
    keep = np.zeros(m.shape, bool)
    for i in range(1, n + 1):
        comp = (lab == i)
        touches = comp[0].any() or comp[-1].any() or comp[:, 0].any() or comp[:, -1].any()
        if sizes[i - 1] >= frac * big or not touches:
            keep |= comp & m
    a[~keep, 3] = 0
    return Image.fromarray(a, 'RGBA')


def _pick(rel, spec):
    return _drop_border_specks(_pick0(rel, spec))


def _pick0(rel, spec):
    if isinstance(spec, tuple) and spec and spec[0] == 'seam':
        _, x, y, w, h, k, n = spec
        im, _b = H1.sheet(rel)
        return H1.only_main(seam_split(im.crop((x, y, x + w, y + h)), n)[k])
    if isinstance(spec, tuple) and spec and spec[0] == 'fade':
        return _fade_pick(rel, spec)
    return _orig_pick(rel, spec)


# corrected specs (found by the cut audit: docs/art-evidence/h2-suspect-cuts.png)
SPEC_FIXES = {
    ('king-cold', 'hurt'): ('seam', 414, 646, 420, 205, 0, 2),
    ('cell-semi-perfect', 'special'): ('fade', 664, 606, 250, 215, 36),
    ('armored-sentinel', 'special'): ('fade', 622, 264, 262, 170, 80),
    ('training-sentinel', 'special'): ('fade', 620, 775, 262, 150, 46),
    ('chamber-guardian', 'attack'): ('rect', 842, 432, 180, 168),
    ('chamber-guardian', 'charge'): ('rect', 712, 602, 168, 150),
    ('chamber-guardian', 'special'): ('rect', 1030, 430, 410, 170),
}


def _apply_fixes():
    H1.pick = _pick
    H1.valley_split = seam_split
    for S in (H1.VILLAIN_SPECS, H1.REGULAR_SPECS):
        for sp in S:
            for (aid, st), v in SPEC_FIXES.items():
                if sp['aid'] == aid:
                    sp['battle'][st] = v


def build(reg, log, only=None):
    _apply_fixes()
    H1.build_handoff_villains(reg, log, only)
    H1.build_handoff_regular(reg, log, only)
    build_npcs(reg, log, only)
    build_gohan_wounded(reg, log, only)
    for aid, a in reg['actors'].items():
        if a['kind'] != 'enemy':
            continue
        fac = FACING_OVERRIDE.get(aid, 'right')
        a['facing'] = fac
        for f in a['battle'].values():
            f['facing'] = fac
    return reg


def _main():
    scratch = '--scratch' in sys.argv
    reg_path = ROOT / 'src' / 'data' / 'artRegistry.generated.json'
    reg = json.loads(reg_path.read_text(encoding='utf8'))
    if scratch:
        art_lib.OUT = ROOT / 'tests' / 'tmp' / 'h2' / 'assets'
        art_lib.OUT.mkdir(parents=True, exist_ok=True)
    build(reg, print)
    ens = [k for k, v in reg['actors'].items() if v['kind'] == 'enemy']
    heroes = [k for k, v in reg['actors'].items() if v['kind'] == 'hero']
    root = art_lib.OUT.parent if scratch else ROOT / 'public'
    onscreen_audit(reg, ens, root, 'h2-enemy-facing.png', 'enemy')
    onscreen_audit(reg, heroes, root, 'h2-hero-facing.png', 'ally')
    (ROOT / 'tests' / 'tmp' / 'h2-reg.json').write_text(json.dumps(reg), encoding='utf8')


# ------------------------------------------------------------------ review sheets (docs/art-evidence/h2-*.png)
def _img(root, ref):
    from PIL import Image
    p = root / ref['path']
    if not p.exists():
        p = ROOT / 'public' / ref['path']
    return Image.open(p).convert('RGBA')


def review(reg, ids, root, name, cell=(150, 170)):
    from PIL import Image
    from art_lib import contact_sheet
    rows = []
    for aid in ids:
        a = reg['actors'][aid]
        items = [(f'{aid}:{s[:5]}', _img(root, f)) for s, f in a['battle'].items()]
        rows.append(contact_sheet(items, cols=len(items), cell=cell))
        if a.get('overworld'):
            its = []
            for d, v in a['overworld'].items():
                its += [(f'{d[:2]} idle', _img(root, v['idle']))] + [(f'{d[:2]} w{k+1}', _img(root, w)) for k, w in enumerate(v['walk'])]
            rows.append(contact_sheet(its, cols=len(its), cell=(86, 110), scale_up=False))
        if a.get('portrait'):
            rows.append(contact_sheet([(aid + ' portrait', _img(root, a['portrait']))], cols=1, cell=(160, 130)))
    W = max(r.width for r in rows)
    out = Image.new('RGBA', (W, sum(r.height for r in rows)), (66, 70, 100, 255))
    y = 0
    for r in rows:
        out.alpha_composite(r, (0, y)); y += r.height
    out.save(ROOT / 'docs' / 'art-evidence' / name)


def onscreen_audit(reg, ids, root, name, side):
    """each idle exactly as the engine will draw it (flip rule of src/engine/assets.ts needsFlip), side='enemy' -> must face LEFT"""
    from PIL import Image, ImageDraw
    cell = (170, 230)
    cols = 8
    sheet = Image.new('RGBA', (cols * cell[0], ((len(ids) + cols - 1) // cols) * cell[1]), (66, 70, 100, 255))
    d = ImageDraw.Draw(sheet)
    for i, aid in enumerate(ids):
        a = reg['actors'][aid]
        f = a['battle']['idle']
        im = _img(root, f)
        want = 'right' if side == 'ally' else 'left'
        flip = f['facing'] in ('left', 'right') and f['facing'] != want
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        s = (a['displayHeight'] * 0.8) / a['battle']['idle']['bbox'][3]
        s = min(s, 190 / im.height, 160 / im.width)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
        cx, cy = (i % cols) * cell[0], (i // cols) * cell[1]
        sheet.alpha_composite(im, (cx + (cell[0] - im.width) // 2, cy + cell[1] - 10 - im.height))
        d.text((cx + 3, cy + 3), f'{aid} [{f["facing"]}{" FLIP" if flip else ""}]', fill=(255, 255, 160, 255))
        d.text((cx + 3, cy + 14), '<- should face LEFT' if side == 'enemy' else 'should face RIGHT ->', fill=(200, 255, 200, 255))
    sheet.save(ROOT / 'docs' / 'art-evidence' / name)


# ------------------------------------------------------------------ robust NPC walk-row segmentation
import numpy as np
from PIL import Image


def seam_split(img, n):
    """Split n touching/overlapping frames: cut points start at the deepest alpha-projection valleys, then each cut is refined to a
    minimum-cost top-to-bottom seam (cost = opaque pixels crossed) so hair/arms overlapping a neighbour are separated along the contact line
    instead of being sliced by a straight vertical cut."""
    a = np.array(img.convert('RGBA'))
    op = a[..., 3] > 40
    h, w = op.shape
    proj = np.convolve(op.sum(0).astype(float), np.ones(5) / 5, 'same')
    cuts = []
    for k in range(1, n):
        lo, hi = int(w * k / n - 0.3 * w / n), int(w * k / n + 0.3 * w / n)
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    seams = []
    r = max(6, int(0.28 * w / n))
    for c in cuts:
        x0, x1 = max(1, c - r), min(w - 1, c + r)
        W = x1 - x0
        cost = op[:, x0:x1].astype(float)
        dp = np.zeros((h, W)); bp = np.zeros((h, W), int)
        dp[0] = cost[0] + 0.02 * np.abs(np.arange(W) - (c - x0))
        for y in range(1, h):
            prev = np.full((3, W), 1e9)
            prev[0, 1:] = dp[y - 1, :-1]; prev[1] = dp[y - 1]; prev[2, :-1] = dp[y - 1, 1:]
            prev[0] += 0.03; prev[2] += 0.03
            j = prev.argmin(0)
            dp[y] = cost[y] + prev[j, np.arange(W)] + 0.002 * np.abs(np.arange(W) - (c - x0))
            bp[y] = np.arange(W) + (j - 1) * -1 * -1 - 0  # placeholder replaced below
            bp[y] = np.arange(W) + np.array([-1, 0, 1])[j]
        x = int(dp[-1].argmin()); xs = [0] * h
        for y in range(h - 1, -1, -1):
            xs[y] = x0 + x
            x = int(bp[y, x]) if y > 0 else x
        seams.append(np.array(xs))
    bounds = [np.full(h, 0)] + seams + [np.full(h, w)]
    out = []
    X = np.arange(w)[None, :]
    for k in range(n):
        m = (X >= bounds[k][:, None]) & (X < bounds[k + 1][:, None])
        b = a.copy(); b[~m, 3] = 0
        out.append(Image.fromarray(b, 'RGBA'))
    return out


def row_frames(rel, total=12):
    """Return the 12-13 walk frames of an NPC sheet (row 1) in reading order: gap-separated segments, merged segments are split by
    the number of frames estimated from the typical single-frame width at the deepest projection valleys."""
    im, boxes = H1.sheet(rel)
    row1 = [b for b in boxes if b[1] + b[3] / 2 < 330 and b[3] < 330]
    x0 = min(b[0] for b in row1); x1 = max(b[0] + b[2] for b in row1)
    y0 = min(b[1] for b in row1); y1 = max(b[1] + b[3] for b in row1)
    strip = im.crop((x0 - 3, y0 - 3, x1 + 3, y1 + 3))
    a = np.array(strip)[..., 3] > 40
    col = a.sum(0)
    segs, st = [], None
    for x, v in enumerate(col > 0):
        if v and st is None:
            st = x
        if not v and st is not None:
            segs.append([st, x]); st = None
    if st is not None:
        segs.append([st, len(col)])
    segs = [s for s in segs if s[1] - s[0] > 12]
    ws = [s_[1] - s_[0] for s_ in segs]
    best = None
    for p in np.arange(55, 220, 1.0):
        ns = [max(1, int(round(w / p))) for w in ws]
        if sum(ns) == total:
            score = abs(p - 100)
            if best is None or score < best[0]:
                best = (score, ns)
    if best is None:  # fall back to the median-of-small-segments estimate
        ws_sorted = sorted(ws)
        pitch = float(np.median(ws_sorted[: max(1, (len(ws_sorted) + 1) // 2)]))
        best = (0, [max(1, int(round(w / (pitch * 1.05)))) for w in ws])
    out = []
    for s_, n in zip(segs, best[1]):
        piece = strip.crop((s_[0] - 1, 0, s_[1] + 1, strip.height))
        out += seam_split(piece, n) if n > 1 else [piece]
    return [H1.only_main(p) for p in out]




# ------------------------------------------------------------------ NPCs (row1 = walk frames, row2 = poses, row3 = portraits)
NPC_COUNTS = {'king-kai': [3, 4, 3, 3]}   # frames per direction (down, left, right, up) when the sheet is not 3/3/3/3
NPC_NOTES = {
    'king-kai': 'left walk has 4 frames on the sheet (kept 4: idle + 3 walk, 4th dropped)',
}


def build_npcs(reg, log, only=None):
    from art_heroes import DIR_FACING
    from art_lib import save_frame
    for aid, rel, display in H1.NPC_SPECS:
        if only and aid not in only:
            continue
        counts = NPC_COUNTS.get(aid, [3, 3, 3, 3])
        frames = row_frames(rel, sum(counts))
        assert len(frames) == sum(counts), (aid, len(frames))
        im, boxes = H1.sheet(rel)
        i = 0
        owr = {}
        for d, n in zip(H1.DIRS, counts):
            fr_ = frames[i:i + n]; i += n
            idle_im = fr_[0]
            walk = fr_[1:4] if n >= 4 else fr_[1:] + fr_[:1]
            refs = [save_frame(f, f'npcs/{aid}/overworld/{d}/walk-0{k + 1}.png', 'genuine', DIR_FACING[d], '', trim=True) for k, f in enumerate(walk)]
            idle = save_frame(idle_im, f'npcs/{aid}/overworld/{d}/idle.png', 'genuine', DIR_FACING[d], 'first of the sheet walk frames (no separate idle on the sheet)', trim=True)
            owr[d] = {'idle': idle, 'walk': refs}
        row2 = [k for k, b in enumerate(boxes) if 330 <= b[1] + b[3] / 2 < 760 and b[3] > 150]
        row3 = [k for k, b in enumerate(boxes) if b[1] + b[3] / 2 >= 760 and b[3] > 150]
        stand = H1.only_main(H1.crop_box(im, boxes[min(row2, key=lambda k: boxes[k][0])]))
        battle = {'idle': save_frame(stand, f'npcs/{aid}/battle/idle.png', 'genuine', 'front', f'art/handoff/{rel}; standing pose (NPCs have no battle art)', trim=True)}
        por = save_frame(H1.only_main(H1.crop_box(im, boxes[min(row3, key=lambda k: boxes[k][0])])), f'npcs/{aid}/portrait.png', 'genuine', 'front',
                         'first (neutral) expression of the sheet; other expressions not exposed by the registry', trim=True)
        reg['actors'][aid] = dict(id=aid, kind='npc', displayName=display, facing='front', displayHeight=100, battle=battle, overworld=owr, portrait=por,
                                  approved=False, provisional=False,
                                  provenance=f'art/handoff/{rel} (hand-checked contact sheets docs/art-evidence/h2-review-npc*.png); no sprite mirrored' + (f'; {NPC_NOTES[aid]}' if aid in NPC_NOTES else ''))
        log(f'[h2] npc {aid} <- {rel} frames/dir={counts}')


if __name__ == '__main__':
    _main()


# ------------------------------------------------------------------ Gohan wounded (finale): SSJ2 poses from the wounded-arm story sheet
WOUNDED_REL = 'heroes/story_variants/gohan_wounded_arm_story_variant.png'
WOUNDED = dict(
    idle=('rect', 55, 520, 180, 215), guard=('rect', 298, 522, 172, 208), charge=('rect', 515, 520, 260, 215),
    attack=('rect', 775, 545, 305, 175), special=('fade', 1075, 545, 330, 185, 70),
    hurt=('rect', 370, 735, 175, 150), victory=('rect', 885, 722, 200, 165), ko=('rect', 1100, 805, 290, 90),
)
WOUNDED_PORTRAIT = ('rect', 738, 895, 172, 172)


def build_gohan_wounded(reg, log, only=None):
    from art_lib import save_frame
    if only and 'gohan-wounded' not in only:
        return
    old = reg['actors'].get('gohan-wounded')
    battle = {}
    for st in H1.BATTLE:
        im = H1.pick(WOUNDED_REL, WOUNDED[st])
        battle[st] = save_frame(im, f'heroes/gohan-wounded/battle/{st}.png', 'genuine', 'right', f'art/handoff/{WOUNDED_REL} (SSJ2, torn gi, wounds)' if st == 'idle' else '', trim=True)
    por = save_frame(H1.pick(WOUNDED_REL, WOUNDED_PORTRAIT), 'heroes/gohan-wounded/portrait.png', 'genuine', 'front', 'SSJ2 portrait from the wounded-arm sheet', trim=True)
    ent = dict(id='gohan-wounded', kind='hero', displayName='Gohan (wounded, SSJ2)', facing='right', displayHeight=172, battle=battle, portrait=por,
               approved=False, provisional=True,
               provenance=f'art/handoff/{WOUNDED_REL}; battle poses are the wounded SSJ2 set of the sheet; overworld reused from gohan-base (the sheet has only the unwounded black-haired walk strip)',
               fallbackReason='overworld frames are the plain gohan-base walk cycle (no wounded walk art exists)')
    if old and old.get('overworld'):
        ent['overworld'] = old['overworld']
    reg['actors']['gohan-wounded'] = ent
    log('[h2] gohan-wounded <- ' + WOUNDED_REL)
