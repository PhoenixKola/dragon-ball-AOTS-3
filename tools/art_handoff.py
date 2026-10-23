"""Handoff (1448x1086) character sheets -> registry actors.  Frames are picked from dilated-alpha components of the keyed sheet
(same call as tools/art_overviews.py, ids visible in docs/art-evidence/_ov) with explicit per-actor tables; merged components are
split at projection valleys ('split' specs).  Overworld strip = 12 frames (down x3, left x3, right x3, up x3) split by valleys."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import ROOT, clean_alpha, components, frame_meta, save_frame, trim_pad, alpha_mask, label_components, dilate
from art_sheet import load_sheet

H = ROOT / 'art' / 'handoff'
_sheets: dict = {}
BATTLE = ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'victory', 'ko']
DIRS = ['down', 'left', 'right', 'up']


def sheet(rel):
    if rel not in _sheets:
        im = clean_alpha(load_sheet(H / rel), 20)
        _sheets[rel] = (im, [tuple(int(v) for v in b) for b in components(im, dil=5, min_area=500, thr=90)])
    return _sheets[rel]


def crop_box(im, box, pad=1):
    x, y, w, h = box
    return im.crop((max(0, x - pad), max(0, y - pad), min(im.width, x + w + pad), min(im.height, y + h + pad)))


def valley_split(img: Image.Image, n: int):
    """Split an image into n pieces at the deepest alpha-projection valleys near the equal-width cut points."""
    a = np.array(img)[..., 3] > 40
    proj = np.convolve(a.sum(0).astype(float), np.ones(5) / 5, 'same')
    w = img.width
    cuts = [0]
    for k in range(1, n):
        lo, hi = int(w * k / n - 0.3 * w / n), int(w * k / n + 0.3 * w / n)
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    cuts.append(w)
    return [img.crop((cuts[i], 0, cuts[i + 1], img.height)) for i in range(n)]


def only_main(img: Image.Image, thr=0.12) -> Image.Image:
    """keep connected pieces >= thr of the biggest (drops neighbour slivers)"""
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


def pick(rel, spec):
    """spec: int comp index | (idx, k, n) valley piece k of n | ('rect', x,y,w,h)"""
    im, boxes = sheet(rel)
    if isinstance(spec, int):
        return only_main(crop_box(im, boxes[spec]))
    if spec[0] == 'rect':
        return only_main(im.crop((spec[1], spec[2], spec[1] + spec[3], spec[2] + spec[4])))
    idx, k, n = spec
    return only_main(valley_split(crop_box(im, boxes[idx]), n)[k])


def ow_strip(rel, ow_ids):
    """ow_ids: list of comp indices forming the overworld strip (any grouping); returns 12 images in reading order"""
    im, boxes = sheet(rel)
    x0 = min(boxes[i][0] for i in ow_ids); x1 = max(boxes[i][0] + boxes[i][2] for i in ow_ids)
    y0 = min(boxes[i][1] for i in ow_ids); y1 = max(boxes[i][1] + boxes[i][3] for i in ow_ids)
    strip = im.crop((x0 - 3, y0 - 3, x1 + 3, y1 + 3))
    a = np.array(strip)[..., 3] > 40
    col = a.any(0)
    groups, st = [], None
    for x, v in enumerate(col):
        if v and st is None:
            st = x
        if not v and st is not None:
            if groups and x - 0 and st - groups[-1][1] < 14:
                groups[-1] = (groups[-1][0], x)
            else:
                groups.append((st, x))
            st = None
    if st is not None:
        groups.append((st, len(col)))
    if len(groups) == 4:
        out = []
        for (ga, gb) in groups:
            out += valley_split(strip.crop((max(0, ga - 2), 0, min(strip.width, gb + 2), strip.height)), 3)
        return [only_main(p) for p in out]
    return [only_main(p) for p in valley_split(strip, 12)]


def facing_of(img: Image.Image) -> str:
    """Heuristic horizontal facing from skin-tone mass of the head; returns 'left'/'right'/'front'."""
    a = np.array(trim_pad(img, 0)).astype(int)
    if a.shape[0] < 10:
        return 'front'
    sub = a[: int(a.shape[0] * 0.40)]
    op = sub[..., 3] > 40
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    sk = (r > 190) & (g > 120) & (g < 225) & (b > 70) & (b < 190) & (r - b > 40) & op
    if sk.sum() < 8 or not op.any():
        return 'front'
    xs = np.nonzero(op)[1]
    d = (np.nonzero(sk)[1].mean() - (xs.min() + xs.max()) / 2) / max(1, xs.max() - xs.min())
    return 'right' if d > 0.05 else 'left' if d < -0.05 else 'front'


def build_hero_sheet(reg, log, aid, rel, display, dh, ow_ids, battle, portrait, quality='genuine', note='', fallback=None,
                     provenance=None, ow_dirs=('down', 'left', 'right', 'up'), swap_lr=False):
    from art_heroes import DIR_FACING
    ow = ow_strip(rel, ow_ids)
    frames = {}
    for d, i in zip(ow_dirs, range(0, 12, 3)):
        frames[d] = ow[i:i + 3]
    if swap_lr:
        frames['left'], frames['right'] = frames['right'], frames['left']
    battle_f = {}
    for st in BATTLE:
        spec = battle.get(st)
        if spec is None:
            spec = battle['idle']
        im = pick(rel, spec)
        n = f'handoff sheet {rel}' + ('; aliased to idle' if battle.get(st) is None else '')
        battle_f[st] = save_frame(im, f'heroes/{aid}/battle/{st}.png', quality, 'right', n if st == 'idle' else ('alias of idle' if battle.get(st) is None else ''), trim=True)
    owr = {}
    for d in DIRS:
        fr = frames[d]
        fac = DIR_FACING[d]
        refs = [save_frame(f, f'heroes/{aid}/overworld/{d}/{k}.png', quality, fac, '', trim=True) for k, f in zip(['walk-01', 'walk-02', 'walk-03'], fr)]
        idle = save_frame(fr[1] if len(fr) > 1 else fr[0], f'heroes/{aid}/overworld/{d}/idle.png', quality, fac, 'idle = middle walk frame (sheet has no separate idle)', trim=True)
        owr[d] = {'idle': idle, 'walk': refs}
    por = save_frame(pick(rel, portrait), f'heroes/{aid}/portrait.png', quality, 'front', '', trim=True)
    entry = dict(id=aid, kind='hero', displayName=display, facing='right', displayHeight=dh, battle=battle_f, overworld=owr,
                 portrait=por, approved=False, provisional=quality != 'genuine' or bool(fallback),
                 provenance=provenance or f'art/handoff/{rel}; frames hand-picked from component table in tools/art_handoff.py')
    if fallback:
        entry['fallbackReason'] = fallback
    reg['actors'][aid] = entry
    log(f'[handoff] {aid} <- {rel}')
    return entry


# ------------------------------------------------------------------ hero-like sheets (tables verified on docs/art-evidence/_ov/*.png)
HERO_SPECS = [
    dict(aid='gohan-ssj2', rel='heroes/forms/gohan_ssj2.png', display='Gohan (Super Saiyan 2)', dh=205, ow=list(range(12)),
         battle=dict(idle=12, guard=13, charge=14, attack=15, special=16, hurt=22, victory=19, ko=23), portrait=20),
    dict(aid='gohan-ssj', rel='heroes/forms/gohan_ssj.png', display='Gohan (Super Saiyan)', dh=200, ow=list(range(8)),
         battle=dict(idle=8, guard=9, charge=13, attack=(10, 1, 2), special=(11, 0, 2), hurt=12, victory=15, ko=(16, 0, 2)), portrait=(16, 1, 2)),
    dict(aid='gohan-training', rel='heroes/story_variants/gohan_training_variant.png', display='Gohan (training gi)', dh=190, ow=list(range(11)),
         battle=dict(idle=11, guard=12, charge=13, attack=14, special=15, hurt=16, victory=17, ko=18), portrait=19),
    dict(aid='vegeta-ascended', rel='heroes/forms/vegeta_ascended_super_saiyan.png', display='Vegeta (Ascended Super Saiyan)', dh=205, ow=list(range(10)),
         battle=dict(idle=10, guard=11, charge=12, attack=13, special=14, hurt=('rect', 906, 673, 302, 190), victory=16, ko=19),
         portrait=('rect', 906, 865, 302, 208)),
    dict(aid='trunks-ultra', rel='heroes/forms/future_trunks_grade_3.png', display='Future Trunks (Ultra / Grade 3)', dh=215, ow=[0, 1, 2, 3],
         battle=dict(idle=4, guard=('rect', 240, 340, 190, 285), charge=('rect', 430, 282, 290, 356), attack=('rect', 725, 350, 260, 285), special=('rect', 960, 380, 477, 260), hurt=6, victory=7, ko=11), portrait=(9, 1, 2)),
    dict(aid='goku-weakened', rel='heroes/story_variants/goku_weakened.png', display='Goku (heart virus)', dh=175, ow=[0, 1, 2, 3],
         battle=dict(idle=4, guard=5, charge=('rect', 579, 246, 246, 270), attack=6, special=6, hurt=9, victory=10, ko=12), portrait=13),
    dict(aid='cell-junior', rel='heroes/forms/cell_junior.png', display='Cell Junior', dh=120, ow=list(range(10)), kind='enemy',
         battle=dict(idle=10, guard=11, charge=12, attack=13, special=14, hurt=16, victory=17, ko=(19, 1, 2)), portrait=20),
    dict(aid='cell-super-perfect', rel='heroes/forms/super_perfect_cell.png', display='Super Perfect Cell', dh=268, ow=list(range(11)), kind='enemy',
         battle=dict(idle=11, guard=(12, 0, 3), charge=(12, 1, 3), attack=(12, 2, 3), special=13, hurt=15, victory=16, ko=(17, 2, 4)), portrait=(17, 3, 4)),
]


def build_handoff_heroes(reg, log, only=None):
    for s in HERO_SPECS:
        if only and s['aid'] not in only:
            continue
        s = dict(s)
        kind = s.pop('kind', 'hero')
        ent = build_hero_sheet(reg, log, s['aid'], s['rel'], s['display'], s['dh'], s['ow'], s['battle'], s['portrait'])
        ent['kind'] = kind
        if kind == 'enemy':
            ent['facing'] = 'front'
            ent['battle']['beam'] = dict(ent['battle']['special'], note='alias of special')


# ================================================================== generic actor builder (explicit per-sheet tables)
def robust_feet(frames_meta):
    return frames_meta


def build_actor(reg, log, aid, kind, rel, display, dh, battle, portrait=None, ow=None, ow_facing=None, quality='genuine', note='',
                fallback=None, provenance=None, battle_facing='right', actor_facing=None, extra_notes=None):
    """battle: state -> pick spec (missing states alias idle / 'special' for beam). ow: dir -> list of pick specs (>=2 frames),
    idle=first spec, walk=the rest. ow_facing: dir -> truthful facing for the stored frames (default down=front, up=back, left/right as named).
    """
    from art_heroes import DIR_FACING
    extra_notes = extra_notes or {}
    states = ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'victory', 'ko'] + (['beam'] if kind == 'enemy' else [])
    battle_f = {}
    cache = {}
    for st in states:
        spec = battle.get(st)
        alias = None
        if spec is None:
            spec = battle.get('special') if st == 'beam' and battle.get('special') is not None else battle['idle']
            alias = 'special' if st == 'beam' and battle.get('special') is not None else 'idle'
        key = repr(spec)
        im = cache.get(key) or pick(rel, spec)
        cache[key] = im
        n = (f'art/handoff/{rel}' if st == 'idle' else '') + (f' alias of {alias}' if alias else '') + (' ' + extra_notes.get(st, '') if extra_notes.get(st) else '')
        battle_f[st] = save_frame(im, f'{"heroes" if kind == "hero" else "enemies" if kind == "enemy" else "npcs"}/{aid}/battle/{st}.png', quality, battle_facing, n.strip(), trim=True)
    base = {'hero': 'heroes', 'enemy': 'enemies', 'npc': 'npcs'}[kind]
    owr = None
    if ow:
        owr = {}
        ow = dict(ow)
        if 'left' in ow and 'right' in ow:
            fl = [facing_of(pick(rel, sp)) for sp in ow['left']]
            fr = [facing_of(pick(rel, sp)) for sp in ow['right']]
            vote = lambda f: max(('left', 'right'), key=lambda k: f.count(k))
            if f.count('left') + f.count('right') if (f := fl) else 0:
                pass
            if vote(fl) == 'right' and vote(fr) == 'left' and fl.count('right') > fl.count('left') and fr.count('left') > fr.count('right'):
                ow['left'], ow['right'] = ow['right'], ow['left']
                extra_notes = dict(extra_notes, ow_swap='left/right groups swapped: sheet order disagreed with visible facing')
        for d, specs in ow.items():
            fac = (ow_facing or {}).get(d, DIR_FACING[d])
            imgs = [pick(rel, s) for s in specs]
            refs = [save_frame(f, f'{base}/{aid}/overworld/{d}/{k}.png', quality, fac, '', trim=True) for k, f in zip(['walk-01', 'walk-02', 'walk-03', 'walk-04', 'walk-05'], imgs[1:])]
            idle = save_frame(imgs[0], f'{base}/{aid}/overworld/{d}/idle.png', quality, fac, '', trim=True)
            owr[d] = {'idle': idle, 'walk': refs}
    ent = dict(id=aid, kind=kind, displayName=display, facing=actor_facing or battle_facing, displayHeight=dh, battle=battle_f, approved=False,
               provisional=quality != 'genuine' or bool(fallback), provenance=provenance or f'art/handoff/{rel}; frames hand-picked (tools/art_handoff.py tables)')
    if owr:
        ent['overworld'] = owr
    if isinstance(portrait, str) and portrait.startswith('head:'):
        src = pick(rel, battle[portrait[5:]])
        m = frame_meta(src)
        bx, by, bw, bh = m['bbox']
        ent['portrait'] = save_frame(src.crop((bx, by, bx + bw, by + int(bh * 0.5))), f'{base}/{aid}/portrait.png', 'derived', 'front', 'derived: head crop of the battle idle frame (sheet has no clean portrait)', trim=True)
    elif portrait is not None:
        ent['portrait'] = save_frame(pick(rel, portrait), f'{base}/{aid}/portrait.png', quality, 'front', '', trim=True)
    if fallback:
        ent['fallbackReason'] = fallback
    if note:
        battle_f['idle']['note'] = (battle_f['idle'].get('note', '') + ' ' + note).strip()
    reg['actors'][aid] = ent
    log(f'[handoff] {aid} <- {rel}')
    return ent


def ow_groups(rel, groups, n_each):
    """groups: dir -> list of comp ids covering that direction; returns dir -> list of pick specs of n_each frames.
    If one comp holds the whole direction (n frames) it is valley-split."""
    out = {}
    for d, ids in groups.items():
        if len(ids) == 1:
            out[d] = [(ids[0], k, n_each) for k in range(n_each)]
        else:
            out[d] = list(ids)
    return out


def classify(rel, ids):
    """split comp ids into facing buckets using the skin-tone heuristic (frames with no detectable skin go to 'front')"""
    out = {'left': [], 'right': [], 'front': []}
    for i in ids:
        out[facing_of(pick(rel, i))].append(i)
    return out


# ------------------------------------------------------------------ villains / bosses (enemies carry battle + portrait only)
V = 'villains_bosses/'
VILLAIN_SPECS = [
    dict(aid='android-16', rel=V + 'android_16.png', display='Android 16', dh=255,
         battle=dict(idle=('rect', 28, 408, 200, 210), guard=('rect', 253, 408, 200, 210), attack=13, special=14, charge=('rect', 10, 600, 235, 245), hurt=19, victory=18, ko=20),
         portrait=('rect', 10, 848, 310, 226)),
    dict(aid='android-17', rel=V + 'android_17.png', display='Android 17', dh=190,
         battle=dict(idle=36, guard=38, attack=39, special=47, charge=50, hurt=51, victory=37, ko=54), portrait=23),
    dict(aid='android-18', rel=V + 'android_18.png', display='Android 18', dh=185,
         battle=dict(idle=8, attack=9, guard=11, charge=(15, 0, 4), special=14, hurt=22, victory=17, ko=24), portrait=23),
    dict(aid='android-19', rel=V + 'android_19.png', display='Android 19', dh=190,
         battle=dict(idle=18, guard=19, attack=21, special=28, charge=25, hurt=23, victory=26, ko=24), portrait=30),
    dict(aid='android-20', rel=V + 'android_20_dr_gero.png', display='Android 20 (Dr. Gero)', dh=185,
         battle=dict(idle=18, guard=19, attack=(20, 1, 2), charge=(20, 0, 2), special=25, hurt=21, victory=24, ko=26), portrait=22),
    dict(aid='king-cold', rel=V + 'king_cold.png', display='King Cold', dh=245,
         battle=dict(idle=(19, 0, 3), guard=(22, 0, 2), attack=(19, 2, 3), special=(20, 0, 2), charge=26, hurt=('rect', 425, 650, 205, 190), victory=25, ko=29), portrait=15),
    dict(aid='mecha-frieza', rel=V + 'mecha_frieza.png', display='Mecha Frieza', dh=205,
         battle=dict(idle=28, guard=29, attack=30, special=31, charge=37, hurt=34, victory=40, ko=35), portrait=41),
    dict(aid='cell-imperfect', rel=V + 'imperfect_cell.png', display='Imperfect Cell', dh=225,
         battle=dict(idle=7, guard=12, attack=9, special=14, charge=13, hurt=18, victory=10, ko=20), portrait=4),
    dict(aid='cell-semi-perfect', rel=V + 'semi_perfect_cell.png', display='Semi-Perfect Cell', dh=250,
         battle=dict(idle=14, attack=15, guard=16, special=(24, 0, 2), charge=23, hurt=28, victory=17, ko=26), portrait=13),
    dict(aid='cell-perfect', rel=V + 'perfect_cell.png', display='Perfect Cell', dh=258,
         battle=dict(idle=12, guard=13, attack=14, special=22, charge=19, hurt=(17, 0, 2), victory=27, ko=(17, 1, 2)),
         portrait=('rect', 1245, 755, 195, 290)),
]


def build_handoff_villains(reg, log, only=None):
    for s in VILLAIN_SPECS:
        if only and s['aid'] not in only:
            continue
        build_actor(reg, log, s['aid'], 'enemy', s['rel'], s['display'], s['dh'], s['battle'], s.get('portrait'), battle_facing='right')


R = 'regular_enemies/'
REGULAR_SPECS = [
    dict(aid='recon-probe', rel=R + 'recon_probe_drone.png', display='Reconnaissance Probe', dh=110,
         battle=dict(idle=18, guard=19, attack=(22, 0, 4), charge=21, special=(25, 1, 2), hurt=29, victory=24, ko=31), portrait=35),
    dict(aid='drain-drone', rel=R + 'ki_drain_drone_and_security_grid.png', display='Drain Drone', dh=115,
         battle=dict(idle=13, guard=19, attack=12, charge=20, special=18, hurt=15, victory=14, ko=24), portrait=(45, 0, 4)),
    dict(aid='security-grid', rel=R + 'ki_drain_drone_and_security_grid.png', display='Security Grid', dh=165,
         battle=dict(idle=25, guard=36, attack=37, charge=36, special=37, hurt=40, victory=35, ko=42), portrait=(46, 1, 3)),
    dict(aid='armored-sentinel', rel=R + 'armored_android_sentinel.png', display='Armored Sentinel', dh=175,
         battle=dict(idle=6, guard=7, attack=8, charge=9, special=('rect', 622, 264, 290, 170), hurt=('rect', 1020, 290, 118, 145), victory=6, ko=11),
         portrait=('rect', 1000, 46, 143, 174)),
    dict(aid='training-sentinel', rel=R + 'armored_android_sentinel.png', display='Training Sentinel', dh=140,
         battle=dict(idle=23, guard=('rect', 145, 770, 118, 150), attack=25, charge=23, special=('rect', 620, 775, 262, 150),
                     hurt=('rect', 1006, 785, 125, 143), victory=23, ko=28), portrait=(21, 0, 2)),
    dict(aid='cell-husk', rel=R + 'cell_bioform_android.png', display='Cell Husk', dh=160,
         battle=dict(idle=9, guard=10, attack=11, charge=13, special=12, hurt=19, victory=20, ko=22), portrait=25),
    dict(aid='cell-probe', rel=R + 'cell_husk_bio_bug.png', display='Cell Probe', dh=105,
         battle=dict(idle=4, guard=12, attack=7, charge=5, special=8, hurt=13, victory=6, ko=15), portrait=16),
    dict(aid='chamber-guardian', rel=R + 'time_chamber_guardian_and_absorbed_shadow.png', display='Chamber Guardian', dh=215,
         battle=dict(idle=(3, 0, 4), guard=18, attack=('rect', 845, 440, 120, 160), charge=('rect', 715, 605, 150, 150), special=('rect', 1000, 440, 436, 170),
                     hurt=25, victory=(3, 1, 4), ko=26), portrait='head:idle'),
    dict(aid='absorbed-shadow', rel=R + 'time_chamber_guardian_and_absorbed_shadow.png', display='Absorbed Shadow', dh=160,
         battle=dict(idle=(0, 0, 2), guard=16, attack=(17, 0, 3), charge=21, special=(17, 2, 3), hurt=20, victory=(0, 1, 2), ko=22), portrait='head:idle'),
]


def build_handoff_regular(reg, log, only=None):
    for s in REGULAR_SPECS:
        if only and s['aid'] not in only:
            continue
        build_actor(reg, log, s['aid'], 'enemy', s['rel'], s['display'], s['dh'], s['battle'], s.get('portrait'), battle_facing='right')


# ------------------------------------------------------------------ NPC sheets: row1 = 12 walk frames, row2 = standing poses, row3 = portraits
N = 'npcs/'
NPC_SPECS = [
    ('bulma', N + 'bulma.png', 'Bulma'), ('chi-chi', N + 'chi_chi.png', 'Chi-Chi'), ('yamcha', N + 'yamcha.png', 'Yamcha'),
    ('king-kai', N + 'king_kai.png', 'King Kai'), ('mr-satan', N + 'mr_satan.png', 'Mr. Satan'),
    ('researcher', N + 'capsule_corp_scientist.png', 'Capsule Corp Scientist'),
    ('civilian', N + 'civilian_frightened.png', 'Frightened Civilian'),
    ('civilian-apron', N + 'civilian_pink_apron.png', 'Civilian (pink apron)'),
    ('announcer', N + 'cell_games_announcer.png', 'Cell Games Announcer'),
]


def build_handoff_npcs(reg, log, only=None):
    for aid, rel, display in NPC_SPECS:
        if only and aid not in only:
            continue
        im, boxes = sheet(rel)
        row1 = [i for i, b in enumerate(boxes) if b[1] + b[3] / 2 < 330 and b[3] < 260]
        row2 = [i for i, b in enumerate(boxes) if 330 <= b[1] + b[3] / 2 < 760 and b[3] > 150]
        row3 = [i for i, b in enumerate(boxes) if b[1] + b[3] / 2 >= 760 and b[3] > 150]
        strip = ow_strip(rel, row1)
        groups = {d: strip[i:i + 3] for d, i in zip(DIRS, range(0, 12, 3))}
        fl = [facing_of(f) for f in groups['left']]
        fr = [facing_of(f) for f in groups['right']]
        swapped = False
        if fl.count('right') > fl.count('left') and fr.count('left') > fr.count('right'):
            groups['left'], groups['right'] = groups['right'], groups['left']
            swapped = True
        from art_heroes import DIR_FACING
        owr = {}
        for d in DIRS:
            fr_ = groups[d]
            refs = [save_frame(f, f'npcs/{aid}/overworld/{d}/walk-0{k + 1}.png', 'genuine', DIR_FACING[d], '', trim=True) for k, f in enumerate(fr_[1:] + fr_[:1])]
            idle = save_frame(fr_[0], f'npcs/{aid}/overworld/{d}/idle.png', 'genuine', DIR_FACING[d],
                              'first of 3 sheet frames; sheet has no separate idle' + ('; left/right groups swapped to match visible facing' if swapped else ''), trim=True)
            owr[d] = {'idle': idle, 'walk': refs}
        stand_i = min(row2, key=lambda i: boxes[i][0])
        stand = only_main(crop_box(im, boxes[stand_i]))
        battle = {'idle': save_frame(stand, f'npcs/{aid}/battle/idle.png', 'genuine', 'front', f'art/handoff/{rel}; standing pose (NPCs have no battle art)', trim=True)}
        por_i = min(row3, key=lambda i: boxes[i][0])
        por = save_frame(only_main(crop_box(im, boxes[por_i])), f'npcs/{aid}/portrait.png', 'genuine', 'front', 'first (neutral) of the sheet expressions; other expressions not exposed by the registry', trim=True)
        reg['actors'][aid] = dict(id=aid, kind='npc', displayName=display, facing='front', displayHeight=100, battle=battle, overworld=owr, portrait=por,
                                  approved=False, provisional=False, provenance=f'art/handoff/{rel} (hand-checked: row1=12 walk frames, row2=poses, row3=portraits); no sprite mirrored')
        log(f'[handoff] npc {aid} rows={len(row1)}/{len(row2)}/{len(row3)} swapped={swapped}')
