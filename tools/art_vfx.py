"""VFX bindings: hand-picked component indices (components(sheet, dil=3, min_area=250, thr=60)) -> effect ids.
Frames are stored trimmed and alpha-cleaned; sheets are not temporal sequences, so most ids are 'variants_not_sequence'
unless the picked frames visibly grow/animate in order (those are marked 'ordered_growth')."""
from __future__ import annotations
import numpy as np
from PIL import Image
from art_lib import ROOT, SRC, clean_alpha, components, frame_meta, save_frame, trim_pad
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
add('special-beam-cannon', 'beam', [], fps=30, loop=False, quality='derived', note='temporal_sequence: native-generated candidate Special Beam Cannon spiral head rotated through eight real angular frames; human art review pending')
add('spirit-bomb', 'ball', [], fps=14, loop=False, quality='derived', note='temporal_growth: native-generated candidate Spirit Bomb sphere growing to launch scale; human art review pending')
add('telekinetic-pin', 'status', [], fps=12, loop=False, quality='derived', note='temporal_sequence: native-generated candidate restraint rings close and settle around the pinned target; human art review pending')
add('hellzone-grenade', 'ball', [], fps=14, loop=False, quality='derived', note='single_generated_sprite: emerald ki grenade with orbiting sparks; human art review pending')
add('beam-neo-tri', 'beam', [], fps=14, loop=False, quality='derived', note='single_generated_sprite: three-pronged lime-gold beam tip for Neo Tri-Beam; human art review pending')
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
add('burst', 'impact', [('AS', 80), ('AS', 81), ('AS', 79), ('AS', 78), ('AS', 68)], fps=12, note='ordered_growth (approx): shared fire-burst sequence for wide-area Ki techniques')
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
        if id_ == 'special-beam-cannon':
            # A distinct generated green spiral head for Piccolo's signature
            # technique. Crop the actual transparent bounds, normalize once
            # with nearest-neighbour sampling, then make a true rotational
            # sequence rather than cycling unrelated sheet variants.
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'special-beam-cannon-source.png'
            source = Image.open(source_path).convert('RGBA')
            bbox = source.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if not bbox:
                raise ValueError(f'{source_path} has no visible pixels')
            sprite = source.crop(bbox)
            scale = min(96 / sprite.width, 96 / sprite.height, 1)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.NEAREST)
            centered = Image.new('RGBA', (128, 128))
            centered.alpha_composite(sprite, ((128 - sprite.width) // 2, (128 - sprite.height) // 2))
            for n in range(8):
                rotated = centered.rotate(-45 * n, resample=Image.Resampling.NEAREST, expand=False)
                frames.append(save_frame(
                    rotated,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'right',
                    f'native-generated source art/production/vfx/special-beam-cannon-source.png; transparent-bound crop, nearest-neighbour 96px fit, centered, {n * 45} degree rotation',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=30, loop=False, family='beam', quality='derived',
                note='temporal_sequence: eight real angular frames from one native-generated green spiral projectile head; generated candidate; human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated rotational frames')
            continue
        if id_ == 'spirit-bomb':
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'spirit-bomb-source.png'
            source = Image.open(source_path).convert('RGBA')
            bbox = source.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if not bbox:
                raise ValueError(f'{source_path} has no visible pixels')
            sprite = source.crop(bbox)
            scale = min(108 / sprite.width, 108 / sprite.height, 1)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.NEAREST)
            for n, (growth, opacity) in enumerate(((0.62, 135), (0.72, 175), (0.82, 215), (0.92, 255), (1.0, 255), (1.06, 255))):
                canvas = Image.new('RGBA', (128, 128))
                grown = sprite.resize((max(1, round(sprite.width * growth)), max(1, round(sprite.height * growth))), Image.Resampling.NEAREST)
                grown.putalpha(grown.getchannel('A').point(lambda a, o=opacity: a * o // 255))
                canvas.alpha_composite(grown, ((128 - grown.width) // 2, (128 - grown.height) // 2))
                frames.append(save_frame(
                    canvas,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'front',
                    f'native-generated source art/production/vfx/spirit-bomb-source.png; alpha-cropped, nearest-neighbour fit and {growth:.0%} scale/opacity charge growth',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=14, loop=False, family='ball', quality='derived',
                note='temporal_growth: six real scale/opacity stages of the native-generated Spirit Bomb; generated candidate; human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated growth frames')
            continue
        if id_ == 'telekinetic-pin':
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'telekinetic-pin-source.png'
            source = Image.open(source_path).convert('RGBA')
            bbox = source.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if not bbox:
                raise ValueError(f'{source_path} has no visible pixels')
            sprite = source.crop(bbox)
            scale = min(112 / sprite.width, 112 / sprite.height, 1)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.NEAREST)
            for n, (growth, opacity) in enumerate(((1.08, 145), (1.0, 210), (0.94, 255), (0.98, 240), (1.02, 190))):
                canvas = Image.new('RGBA', (128, 128))
                glyph = sprite.resize((max(1, round(sprite.width * growth)), max(1, round(sprite.height * growth))), Image.Resampling.NEAREST)
                glyph.putalpha(glyph.getchannel('A').point(lambda a, o=opacity: a * o // 255))
                canvas.alpha_composite(glyph, ((128 - glyph.width) // 2, (128 - glyph.height) // 2))
                frames.append(save_frame(
                    canvas,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'front',
                    f'native-generated source art/production/vfx/telekinetic-pin-source.png; alpha-cropped, nearest-neighbour fit and restraint-ring closure stage {n + 1}',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=12, loop=False, family='status', quality='derived',
                note='temporal_sequence: five restraint-ring closure/settle stages from the native-generated Telekinetic Pin glyph; generated candidate; human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated restraint frames')
            continue
        if id_ == 'impact-hit':
            # This native-generated four-stage contact burst is a real temporal
            # sequence. Each frame comes from its own transparent atlas cell;
            # align the content to a common center and downscale with nearest.
            source_path = ROOT / 'art' / 'handoff' / 'generated_vfx' / 'impact-blue-contact-4f.png'
            source = Image.open(source_path).convert('RGBA')
            if source.width % 4:
                raise ValueError(f'{source_path} must contain four equal horizontal frames')
            cell_w = source.width // 4
            for n, label in enumerate(('contact flash', 'expanding star', 'breaking sparks', 'fading sparks')):
                cell = source.crop((n * cell_w, 0, (n + 1) * cell_w, source.height))
                bbox = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
                if not bbox:
                    raise ValueError(f'empty generated impact frame {n}')
                x0, y0, x1, y1 = bbox
                margin = 3
                cell = cell.crop((max(0, x0 - margin), max(0, y0 - margin), min(cell.width, x1 + margin), min(cell.height, y1 + margin)))
                scale = min(120 / cell.width, 120 / cell.height, 1)
                size = (max(1, round(cell.width * scale)), max(1, round(cell.height * scale)))
                cell = cell.resize(size, Image.Resampling.NEAREST)
                canvas = Image.new('RGBA', (128, 128))
                canvas.alpha_composite(cell, ((128 - cell.width) // 2, (128 - cell.height) // 2))
                frames.append(save_frame(
                    canvas,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'front',
                    f'native-generated candidate; {label}; equal-cell crop from art/handoff/generated_vfx/impact-blue-contact-4f.png, nearest-neighbour downscale, centered',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=14, loop=False, family='impact', quality='derived',
                note='temporal_sequence: four native-generated contact stages (flash, expansion, break, fade); human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated temporal frames')
            continue
        if id_ == 'hellzone-grenade':
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'hellzone-grenade-source.png'
            source = Image.open(source_path).convert('RGBA')
            alpha = source.getchannel('A')
            bbox = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
            if not bbox:
                raise ValueError(f'{source_path} has no visible pixels')
            sprite = source.crop(bbox)
            scale = min(116 / sprite.width, 116 / sprite.height, 1)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.NEAREST)
            centered = Image.new('RGBA', (128, 128))
            centered.alpha_composite(sprite, ((128 - sprite.width) // 2, (128 - sprite.height) // 2))
            frames.append(save_frame(
                centered,
                f'vfx/{id_}/0.png',
                'derived',
                'right',
                'native-generated source art/production/vfx/hellzone-grenade-source.png; alpha-cropped and nearest-neighbour fit to 116px inside centered 128px canvas',
                trim=False,
            ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=14, loop=False, family='ball', quality='derived',
                note='single_generated_sprite: emerald ki grenade orb with orbiting sparks; human art review pending',
            )
            log(f'[vfx] {id_}: one native-generated projectile frame')
            continue
        if id_ == 'beam-neo-tri':
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'neo-tri-beam-source.png'
            source = Image.open(source_path).convert('RGBA')
            bbox = source.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if not bbox:
                raise ValueError(f'{source_path} has no visible pixels')
            sprite = source.crop(bbox)
            scale = min(116 / sprite.width, 116 / sprite.height, 1)
            sprite = sprite.resize((max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))), Image.Resampling.NEAREST)
            centered = Image.new('RGBA', (128, 128))
            centered.alpha_composite(sprite, ((128 - sprite.width) // 2, (128 - sprite.height) // 2))
            frames.append(save_frame(
                centered,
                f'vfx/{id_}/0.png',
                'derived',
                'right',
                'native-generated source art/production/vfx/neo-tri-beam-source.png; alpha-cropped and nearest-neighbour fit to 116px inside centered 128px canvas',
                trim=False,
            ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=14, loop=False, family='beam', quality='derived',
                note='single_generated_sprite: three-pronged lime-gold Neo Tri-Beam head; human art review pending',
            )
            log(f'[vfx] {id_}: one native-generated signature beam frame')
            continue
        if id_ == 'barrier':
            # Keep shield direction and motif coherent across time; each frame
            # is an authored native-generated phase, not an unrelated variant.
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'barrier-formation-source.png'
            source = Image.open(source_path).convert('RGBA')
            if source.width % 4:
                raise ValueError(f'{source_path} must contain four equal horizontal frames')
            cell_w = source.width // 4
            for n, phase in enumerate(('forming rim', 'closed shield', 'impact pulse', 'fractured hex sparks')):
                cell = source.crop((n * cell_w, 0, (n + 1) * cell_w, source.height))
                bbox = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
                if not bbox:
                    raise ValueError(f'empty generated barrier frame {n}')
                cell = cell.crop(bbox)
                scale = min(116 / cell.width, 116 / cell.height, 1)
                cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.NEAREST)
                canvas = Image.new('RGBA', (128, 128))
                canvas.alpha_composite(cell, ((128 - cell.width) // 2, (128 - cell.height) // 2))
                frames.append(save_frame(
                    canvas,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'front',
                    f'native-generated source art/production/vfx/barrier-formation-source.png; transparent cell crop, nearest-neighbour fit, {phase} phase',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=14, loop=False, family='status', quality='derived',
                note='temporal_sequence: four native-generated hex-shield formation, impact and break stages; human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated barrier frames')
            continue
        if id_ == 'absorb':
            # Cell's energy absorption now uses four authored temporal cells,
            # not five unrelated examples of legacy tail art. Preserve each
            # generated phase as-is apart from transparent-bound cropping and
            # nearest-neighbour normalization to a shared 128px canvas.
            source_path = ROOT / 'art' / 'production' / 'vfx' / 'absorb-drain-source.png'
            source = Image.open(source_path).convert('RGBA')
            if source.width % 4:
                raise ValueError(f'{source_path} must contain four equal horizontal frames')
            cell_w = source.width // 4
            for n, phase in enumerate(('loose sparks', 'inward curl', 'tight spiral', 'contract and fade')):
                cell = source.crop((n * cell_w, 0, (n + 1) * cell_w, source.height))
                bbox = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
                if not bbox:
                    raise ValueError(f'empty generated absorption frame {n}')
                cell = cell.crop(bbox)
                scale = min(112 / cell.width, 112 / cell.height, 1)
                cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.NEAREST)
                canvas = Image.new('RGBA', (128, 128))
                canvas.alpha_composite(cell, ((128 - cell.width) // 2, (128 - cell.height) // 2))
                frames.append(save_frame(
                    canvas,
                    f'vfx/{id_}/{n}.png',
                    'derived',
                    'front',
                    f'native-generated source art/production/vfx/absorb-drain-source.png; transparent cell crop, nearest-neighbour fit, {phase} phase',
                    trim=False,
                ))
            reg['vfx'][id_] = dict(
                id=id_, frames=frames, fps=12, loop=False, family='absorb', quality='derived',
                note='temporal_sequence: four native-generated green drain-vortex phases; human art review pending',
            )
            log(f'[vfx] {id_}: {len(frames)} native-generated absorption frames')
            continue
        if id_ == 'regen':
            # Animate the installed healing glyph itself instead of presenting
            # unrelated source-sheet variants as motion. Keep a fixed pivot.
            source = grab('MC', 60).convert('RGBA')
            canvas = (120, 144)
            for n, (scale, opacity) in enumerate(((0.55, 120), (0.7, 190), (0.85, 240), (1, 255), (1.08, 145), (1.15, 0))):
                im = Image.new('RGBA', canvas)
                glyph = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.NEAREST)
                glyph.putalpha(glyph.getchannel('A').point(lambda a: a * opacity // 255))
                im.alpha_composite(glyph, ((canvas[0] - glyph.width) // 2, canvas[1] - glyph.height - 2))
                if opacity:
                    frames.append(save_frame(im, f'vfx/{id_}/{n}.png', 'derived', 'right', 'healing glyph MC#60; scaled/faded temporal frame', trim=False))
            reg['vfx'][id_] = dict(id=id_, frames=frames, fps=14, loop=False, family='status', quality='derived', note='temporal_growth: derived from existing healing glyph')
            log(f'[vfx] {id_}: {len(frames)} derived temporal frames')
            continue
        for n, (k, i) in enumerate(spec['picks']):
            im = grab(k, i)
            if spec['fx']:
                im = spec['fx'](im)
            frames.append(save_frame(im, f'vfx/{id_}/{n}.png', spec['quality'], 'right', f'{S[k]}.png comp#{i}', trim=False))
        reg['vfx'][id_] = dict(id=id_, frames=frames, fps=spec['fps'], loop=spec['loop'], family=spec['family'], quality=spec['quality'], note=spec['note'])
        log(f'[vfx] {id_}: {len(frames)} frames ({spec["quality"]})')
