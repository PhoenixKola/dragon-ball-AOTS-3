"""VFX bindings: hand-picked component indices (components(sheet, dil=3, min_area=250, thr=60)) -> effect ids.
Frames are stored trimmed and alpha-cleaned; sheets are not temporal sequences, so most ids are 'variants_not_sequence'
unless the picked frames visibly grow/animate in order (those are marked 'ordered_growth')."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import SRC, clean_alpha, components, frame_meta, save_frame, trim_pad
from art_heroes import rgb_to_hsv, hsv_to_rgb

VFX_SRC = SRC / '06-vfx' / 'source-sheets'
S = {'BP': 'beams-projectiles', 'AS': 'aura-and-status-effects', 'DB': 'dragonball-energy-variants', 'EO': 'energy-overlays',
     'ML': 'melee-hits-explosions', 'MC': 'multicolor-techniques', 'SB': 'special-energy-blasts'}
_c: dict = {}


def sheet(k):
    if k not in _c:
        raw = Image.open(VFX_SRC / f'{S[k]}.png').convert('RGBA')
        _c[k] = (raw, components(raw, dil=3, min_area=250, thr=60))
    return _c[k]


def grab(k, i):
    raw, bs = sheet(k)
    x, y, w, h = [int(v) for v in bs[i]]
    return trim_pad(clean_alpha(raw.crop((x, y, x + w, y + h)), 20), 1)


def hue_to(im, target_hue, sat=1.0, val=1.0, desat=0.0):
    a = np.array(im.convert('RGBA'))
    h, s, v = rgb_to_hsv(a)
    m = a[..., 3] > 0
    h2 = np.where(s > 0.12, target_hue, h)
    s2 = np.clip(s * sat * (1 - desat), 0, 1)
    rgb = hsv_to_rgb(h2, s2, np.clip(v * val, 0, 1))
    a[..., :3] = np.where(m[..., None], rgb, a[..., :3])
    return Image.fromarray(a, 'RGBA')


VFX = {}


def add(id_, family, picks, fps=14, loop=False, note='variants_not_sequence', fx=None, quality='genuine'):
    VFX[id_] = dict(family=family, picks=picks, fps=fps, loop=loop, note=note, fx=fx, quality=quality)


# --- beams / projectiles
add('beam-blue', 'beam', [('BP', 37), ('BP', 39), ('BP', 40), ('BP', 2)], note='ordered_growth: head frames small->large; body must be stretched by the runtime')
add('beam-gold', 'beam', [('BP', 38), ('BP', 41), ('BP', 17)], note='variants_not_sequence (head frames; stretch body)')
add('beam-purple', 'beam', [('BP', 52), ('BP', 53), ('BP', 27)], note='variants_not_sequence (head frames; stretch body)')
add('beam-yellow', 'beam', [('ML', 0), ('ML', 1), ('ML', 2), ('ML', 3), ('ML', 4)], note='ordered_growth: yellow beam heads small->large')
add('beam-green', 'beam', [('EO', 19), ('EO', 9)], note='EO#19 genuine green head; EO#9 two green orbs (variants_not_sequence)')
add('beam-red', 'beam', [('ML', 32), ('ML', 31), ('ML', 30), ('ML', 29), ('ML', 28)], note='ordered_growth: red beam heads small->large')
add('beam-white', 'beam', [('BP', 40), ('BP', 2), ('BP', 39)], quality='derived', note='derived: beam-blue frames desaturated to white-cyan; variants_not_sequence',
    fx=lambda im: hue_to(im, 190, 0.35, 1.25))
add('spiral', 'beam', [('BP', 47), ('BP', 48), ('BP', 49)], fps=16, loop=True, note='variants_not_sequence: blue spirals (Special Beam Cannon corkscrew)')
add('ball-blue', 'ball', [('DB', 28), ('DB', 29), ('DB', 30), ('DB', 31), ('DB', 32)], note='ordered_growth: blue energy orb small->large')
add('ball-yellow', 'ball', [('BP', 13), ('BP', 14), ('BP', 15)], note='ordered_growth: yellow orb small->large')
add('ball-purple', 'ball', [('AS', 17), ('AS', 25), ('AS', 26), ('AS', 27)], note='ordered_growth: dark purple orb small->large')
add('ball-red', 'ball', [('BP', 13), ('BP', 14), ('BP', 15)], quality='derived', note='derived: ball-yellow hue-shifted to red; ordered_growth', fx=lambda im: hue_to(im, 2, 1.1, 0.95))
add('ball-green', 'ball', [('EO', 10), ('EO', 11)], note='variants_not_sequence: green orb + green orb with shards')
add('disc', 'ball', [('BP', 57), ('BP', 59), ('BP', 61), ('BP', 62)], fps=18, loop=True, note='variants_not_sequence: gold crescent discs (Destructo Disc); runtime should rotate/scale')
add('slash', 'slash', [('ML', 54), ('ML', 55), ('ML', 56), ('ML', 57)], note='ordered_growth: blue sword-slash arcs')
add('impact-hit', 'impact', [('ML', 106), ('ML', 107), ('ML', 108), ('ML', 109)], note='variants_not_sequence: blue hit-stars')
add('impact-big', 'impact', [('BP', 6), ('BP', 20), ('BP', 33)], note='variants_not_sequence: blue/gold/purple big bursts')
add('explosion', 'impact', [('AS', 80), ('AS', 81), ('AS', 79), ('AS', 78), ('AS', 68)], fps=12, note='ordered_growth (approx): fire explosions small->large')
# --- auras / status
add('aura-base', 'aura', [('BP', 121), ('BP', 122), ('BP', 119), ('BP', 120)], fps=10, loop=True, note='variants_not_sequence: blue ground flare')
add('aura-ssj', 'aura', [('DB', 11), ('DB', 0), ('DB', 1), ('DB', 2)], fps=10, loop=True, note='variants_not_sequence: gold flame flares')
add('aura-ssj2', 'aura', [('DB', 16), ('DB', 3), ('DB', 5), ('DB', 6), ('DB', 8)], fps=14, loop=True, note='variants_not_sequence: gold flame halo + yellow lightning bolts')
add('aura-ascended', 'aura', [('DB', 12), ('DB', 16)], fps=10, loop=True, quality='derived', note='derived: gold flames hue-shifted orange; variants_not_sequence', fx=lambda im: hue_to(im, 24, 1.1, 1.0))
add('aura-ultra', 'aura', [('EO', 70), ('EO', 71), ('EO', 72), ('EO', 73), ('EO', 74)], fps=10, loop=True, note='ordered_growth: magenta aura around dark silhouette (silhouette inside is part of the art)')
add('aura-rage', 'aura', [('AS', 53), ('AS', 54), ('AS', 55), ('AS', 56), ('AS', 57), ('AS', 58)], fps=12, loop=True, note='variants_not_sequence: red-orange flames')
add('aura-sparking', 'aura', [('DB', 51), ('DB', 53), ('DB', 48)], fps=12, loop=True, note='variants_not_sequence: blue sparkle bursts')
add('absorb', 'absorb', [('EO', 84), ('EO', 85), ('EO', 86), ('EO', 87), ('EO', 88)], fps=10, note='variants_not_sequence: green tentacle/slime absorb (Cell tail)')
add('teleport', 'teleport', [('EO', 27), ('EO', 28), ('EO', 29), ('EO', 30), ('EO', 31)], fps=14, note='ordered_growth: purple spike column rising')
add('regen', 'status', [('MC', 60), ('MC', 61), ('MC', 62), ('MC', 70), ('MC', 71)], fps=10, note='variants_not_sequence: green heal glows')
add('barrier', 'status', [('MC', 12), ('MC', 13), ('MC', 17), ('MC', 18)], fps=8, note='variants_not_sequence: blue hex shield / dome')
add('flare', 'status', [('MC', 27), ('MC', 25), ('DB', 25)], fps=16, note='variants_not_sequence: Solar Flare star/glow')
add('lightning', 'status', [('DB', 3), ('DB', 5), ('DB', 6), ('DB', 8), ('DB', 13)], fps=18, loop=True, note='variants_not_sequence: yellow lightning bolts')
add('charge', 'aura', [('DB', 31), ('DB', 32), ('DB', 33), ('DB', 34)], fps=12, loop=True, note='ordered_growth: blue ki-charge orb with arcs')
add('father-son', 'beam', [('SB', 70), ('SB', 73), ('SB', 74), ('SB', 75), ('SB', 76)], fps=10, note='variants_not_sequence: blue+gold clashing energy (Father-Son Kamehameha stand-in)')
# alternates used by skills with specific looks
add('beam-final-flash', 'beam', [('SB', 31), ('SB', 34), ('SB', 35), ('SB', 25)], note='variants_not_sequence: yellow-white beam heads (Final Flash / Galick variants)')
add('crescent-purple', 'slash', [('ML', 95), ('ML', 96), ('ML', 99), ('ML', 119)], note='variants_not_sequence: purple crescent arcs (Dirty Fireworks / Galick sweep)')


def build_vfx(reg, log):
    for id_, spec in VFX.items():
        frames = []
        for n, (k, i) in enumerate(spec['picks']):
            im = grab(k, i)
            if spec['fx']:
                im = spec['fx'](im)
            frames.append(save_frame(im, f'vfx/{id_}/{n}.png', spec['quality'], 'right', f'{S[k]}.png comp#{i}', trim=False))
        reg['vfx'][id_] = dict(id=id_, frames=frames, fps=spec['fps'], loop=spec['loop'], family=spec['family'], quality=spec['quality'], note=spec['note'])
        log(f'[vfx] {id_}: {len(frames)} frames ({spec["quality"]})')
