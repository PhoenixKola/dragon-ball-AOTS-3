"""Install curated native-generated world, interaction and battle-stage artwork."""
from pathlib import Path
import shutil
import numpy as np
from PIL import Image
from art_lib import ROOT, OUT, frame_meta, save_frame, trim_pad

TILE = 32

GROUND_TEXTURES = [
    ('capsule_corp', 'capsule-corp-grass-source.png', 'floor'),
    ('capsule_corp', 'capsule-corp-courtyard-source.png', 'path'),
    ('rocky_outskirts', 'rocky-outskirts-soil-source.png', 'floor'),
    ('mountain_lab', 'mountain-lab-ground-source.png', 'floor2'),
    ('lab_inner', 'lab-interior-floor-source.png', 'path'),
    ('android_island', 'android-island-grass-source.png', 'floor'),
    ('lookout', 'lookout-marble-floor-source.png', 'water'),
    ('time_chamber', 'time-chamber-ground-source.png', 'floor'),
    ('cell_games_arena', 'cell-games-arena-stone-source.png', 'floor'),
]

# These map glyphs describe the same continuous substrate. Sharing one family
# keeps deterministic speckles from reading as disconnected checkerboard patches.
GROUND_FAMILIES = {
    'capsule_corp': ('path',),
    'rocky_outskirts': ('floor', 'floor2'),
    'mountain_lab': ('floor', 'floor2'),
    'time_chamber': ('floor', 'floor2', 'path'),
    'cell_games_arena': ('floor', 'floor2'),
}


def install_generated_ground(reg: dict, log):
    for map_id, filename, tile_class in GROUND_TEXTURES:
        source = ROOT / 'art' / 'production' / 'worlds' / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        with Image.open(source) as raw:
            raw.verify()
        world = reg['worlds'][map_id]
        match_to_base = (map_id, tile_class) not in {
            ('time_chamber', 'floor'),
            ('rocky_outskirts', 'floor'),
            ('capsule_corp', 'path'),
        }
        target_mean = None
        if match_to_base:
            base_path = OUT / world['tiles'][tile_class].removeprefix('assets/')
            with Image.open(base_path) as base:
                target_mean = np.asarray(base.convert('RGB'), dtype=np.float32).mean(axis=(0, 1))
        with Image.open(source) as raw:
            im = raw.convert('RGB')
            # Four overlapping crops preserve different authored ground details
            # while keeping all variants at the exact runtime tile size.
            side = min(im.width, im.height) * 3 // 4
            offsets = [
                (0, 0),
                (im.width - side, 0),
                (0, im.height - side),
                (im.width - side, im.height - side),
            ]
            paths = []
            for i, (x, y) in enumerate(offsets):
                crop = im.crop((x, y, x + side, y + side))
                tile_rgb = crop.resize((TILE, TILE), Image.Resampling.LANCZOS)
                if target_mean is not None:
                    pixels = np.asarray(tile_rgb, dtype=np.float32)
                    # Keep authored/generated variants inside the existing
                    # region palette so deterministic picks never form a
                    # checkerboard against the handoff base tile.
                    shift = target_mean - pixels.mean(axis=(0, 1))
                    pixels = np.clip(pixels + shift, 0, 255).astype(np.uint8)
                    tile_rgb = Image.fromarray(pixels, 'RGB')
                tile = tile_rgb.convert('RGBA')
                ref = save_frame(
                    tile,
                    f'worlds/{map_id}/tiles/native-{tile_class}-{i}.png',
                    'genuine',
                    'front',
                    f'native Codex image-generation source art/production/worlds/{filename}; crop {i + 1}/4, reduced to {TILE}px runtime tile; candidate pending human art review',
                )
                paths.append(ref['path'])
        generated_prefix = f'assets/worlds/{map_id}/tiles/native-'
        if map_id in GROUND_FAMILIES:
            # The floors/grounds are one connected material. Replace old
            # glyph-specific surfaces with the shared art family so speckled
            # map geometry does not create a harsh patchwork.
            for cls in GROUND_FAMILIES[map_id]:
                world['tiles'][cls] = paths[0]
                world.setdefault('tileVariants', {})[cls] = paths[1:]
        elif map_id == 'lab_inner':
            # The laboratory map uses three walkable glyphs for its corridor
            # and room floors. They are the same metal surface; keeping all
            # three on this generated family avoids checkerboard jumps between
            # the old dark path and the old bright room tiles.
            for cls in ('floor', 'floor2', 'path'):
                world['tiles'][cls] = paths[0]
                world.setdefault('tileVariants', {})[cls] = paths[1:]
        else:
            existing = world.setdefault('tileVariants', {}).get(tile_class, [])
            existing = [p for p in existing if not p.startswith(generated_prefix)]
            world['tileVariants'][tile_class] = [*existing, *paths]
        note = f' Native-generated {tile_class} ground variations integrated; source is pending human review.'
        world['note'] = world['note'].replace(note, '').rstrip() + note
        log(f'[world extra] {map_id}: four native {tile_class} ground variations')


def install_generated_objects(reg: dict, log):
    objects = reg.setdefault('objects', {})
    for key, filename, display_height, note in [
        ('sign', 'navigation-sign-source.png', 48, 'native Codex-generated overworld guidance sign; replaces geometric sign stand-ins; pending human art review'),
        ('flyer', 'capsule-flyer-source.png', 62, 'native Codex-generated Capsule Flyer; replaces missing purple travel marker; pending human art review'),
    ]:
        source = ROOT / 'art' / 'production' / 'worlds' / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        with Image.open(source) as raw:
            raw.verify()
        with Image.open(source) as raw:
            im = trim_pad(raw.convert('RGBA'), pad=12)
            # The hand-painted art is displayed at a small, fixed overworld
            # scale. Store it close to its final display resolution to avoid
            # inflating the browser download with oversized source pixels.
            target_h = display_height * 3
            target_w = max(1, round(im.width * target_h / im.height))
            im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        ref = save_frame(im, f'objects/{key}.png', 'genuine', 'front', note)
        ref['displayHeight'] = display_height
        objects[key] = ref
        log(f'[world extra] installed {key}: {ref["w"]}x{ref["h"]}')


def build(reg: dict, log):
    install_generated_ground(reg, log)
    install_generated_objects(reg, log)
    source = ROOT / 'art' / 'production' / 'worlds' / 'gingertown-battle.png'
    target = OUT / 'worlds' / 'gingertown' / 'backdrop-battle.png'
    if not source.is_file():
        raise FileNotFoundError(source)
    with Image.open(source) as im:
        im.verify()
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    with Image.open(target) as im:
        meta = frame_meta(im.convert('RGBA'))
        ref = {
            'path': 'assets/worlds/gingertown/backdrop-battle.png', 'w': im.width, 'h': im.height,
            **meta, 'quality': 'genuine', 'facing': 'front',
            'note': 'native Codex image generation; Ginger Town battle-stage candidate; pending human art review',
        }
    world = reg['worlds']['gingertown']
    if world.get('backdrops'):
        world['backdrops'][0] = ref
    else:
        world['backdrops'] = [ref]
    log(f'[world extra] gingertown battle backdrop: {ref["w"]}x{ref["h"]}')
