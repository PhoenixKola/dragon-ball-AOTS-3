"""Curated regional-world extractions from illustrated and generated handoffs.

The legacy source sheets remain the source for the whole registry. This module
adds documented regional ground tiles, battle panoramas, atlas props and
transparent generated landmark candidates. Map geometry, triggers and
collision are deliberately outside this stage.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from art_lib import ROOT, save_frame


ATLAS = ROOT / 'art' / 'handoff' / 'worlds' / 'ginger_town_tileset.png'
TILE = 32

# Regions are chosen from uninterrupted parts of the painted grass, cracked
# asphalt and curb. 64 source pixels reduce to one 32px runtime map tile.
GINGER_TILES = {
    'floor': (35, 670, 99, 734),       # grass with a little scattered ground detail
    'floor2': (140, 710, 204, 774),   # exposed brown earth in a destroyed garden plot
    'edge': (32, 32, 96, 96),          # sidewalk / curb segment
}

# Scenic panels are curated from the handoff atlases' footer panoramas. These
# retain separate weather/time variants where the source provides them.
HANDOFF_BACKDROPS = {
    'landing_future': (
        'future_landing_site_tileset.png',
        [(11, 776, 362, 130), (383, 776, 344, 130), (734, 776, 354, 130), (1090, 776, 344, 130)],
        ['day', 'late-day', 'storm', 'sunset'],
    ),
    'rocky_outskirts': (
        'rocky_outskirts_tileset.png',
        [(17, 795, 478, 102), (503, 796, 453, 101), (964, 796, 468, 101), (18, 920, 465, 142), (492, 920, 459, 142), (960, 920, 472, 142)],
        ['day', 'day-alt', 'highland', 'sunset', 'storm', 'dusk'],
    ),
    'south_city': (
        'south_city_tileset.png',
        [(17, 822, 707, 235), (735, 822, 697, 235)],
        ['intact', 'ruined'],
    ),
    'capsule_corp': (
        'capsule_corp_tileset.png',
        [(14, 895, 950, 180)],
        ['courtyard'],
    ),
    'android_island': (
        'android_island_tileset.png',
        [(15, 831, 698, 242), (735, 831, 698, 242)],
        ['cove', 'bunker-coast'],
    ),
    'cell_games_approach': (
        'cell_games_approach_and_arena_tileset.png',
        [(14, 880, 684, 188)],
        ['approach'],
    ),
    'cell_games_arena': (
        'cell_games_approach_and_arena_tileset.png',
        [(721, 810, 713, 262)],
        ['arena'],
    ),
    'mountain_lab': (
        'gero_mountain_exterior_tileset.png',
        [(8, 788, 700, 272), (748, 810, 678, 240)],
        ['lab-entrance', 'snow-range'],
    ),
    'lab_inner': (
        'gero_lab_interior_tileset.png',
        [(12, 772, 952, 298)],
        ['research-floor'],
    ),
    'lookout': (
        'lookout_and_time_chamber_tileset.png',
        [(1054, 63, 350, 285)],
        ['kami-palace'],
    ),
    'time_chamber': (
        'lookout_and_time_chamber_tileset.png',
        [(1046, 632, 374, 253)],
        ['white-void'],
    ),
}

FULL_STAGE_BACKDROPS = {'lookout', 'time_chamber'}

# Overworld map ground improvements curated from each region's atlas. Rectangles
# are inset inside their samples to avoid adjacent sprites, painted cell borders
# and transparent gutters.
HANDOFF_GROUND_TILES = {
    'rocky_outskirts': (
        'rocky_outskirts_tileset.png',
        {
            'floor': (272, 16, 336, 80),
            'floor2': (160, 116, 224, 180),
            'path': (24, 636, 88, 700),
        },
    ),
    'capsule_corp': (
        'capsule_corp_tileset.png',
        {
            'floor': (12, 12, 60, 60),
            'floor2': (40, 120, 88, 168),
        },
    ),
    'south_city': (
        'south_city_tileset.png',
        {
            'path': 'asphalt',
        },
    ),
}

GENERATED_WORLD_PROPS = {
    'landing_future': ('future_landing_scout_ship.png', 'ship', 320, 6, 4, True),
    'gingertown': ('gingertown_time_machine.png', 'timemachine', 160, 3, 2, True),
    'android_island': ('android_island_pavilion.png', 'pavilion', 215, 4, 3, False),
}


def asphalt_tile(atlas: Image.Image) -> Image.Image:
    """Build a calm, seamless street fill from Ginger Town's asphalt palette."""
    patch = np.array(atlas.crop((224, 4, 240, 28)).convert('RGBA'))
    colors = patch[(patch[..., 3] > 220) & (patch[..., :3].max(axis=2) < 135), :3]
    base = np.median(colors, axis=0) if len(colors) else np.array((76, 78, 91))
    rng = np.random.default_rng(87031)
    grain = rng.normal(0, 3.2, (TILE, TILE, 1))
    rgb = np.clip(base + grain, 0, 255).astype(np.uint8)
    # Scattered, low-contrast aggregate keeps the surface from reading as flat
    # fill while avoiding the atlas's curb and crack motifs repeating per tile.
    specks = rng.random((TILE, TILE)) < 0.045
    rgb[specks] = np.clip(base + rng.choice((-10, -6, 5, 8), (int(specks.sum()), 1)), 0, 255)
    rgba = np.dstack((rgb, np.full((TILE, TILE), 255, dtype=np.uint8)))
    return Image.fromarray(rgba, 'RGBA')


def sampled_asphalt(atlas: Image.Image, region: tuple[int, int, int, int], seed: int) -> Image.Image:
    """Seamless, low-contrast asphalt fill sampled from a regional road atlas."""
    x0, y0, x1, y1 = region
    patch = np.array(atlas.crop((x0, y0, x1, y1)).convert('RGBA'))
    rgb = patch[..., :3]
    neutral = (patch[..., 3] > 220) & (rgb.max(axis=2) < 150) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 42)
    colors = rgb[neutral]
    base = np.median(colors, axis=0) if len(colors) else np.array((74, 76, 86))
    rng = np.random.default_rng(seed)
    tile_rgb = np.clip(base + rng.normal(0, 3.0, (TILE, TILE, 1)), 0, 255).astype(np.uint8)
    flecks = rng.random((TILE, TILE)) < 0.04
    tile_rgb[flecks] = np.clip(base + rng.choice((-9, -5, 5, 8), (int(flecks.sum()), 1)), 0, 255)
    return Image.fromarray(np.dstack((tile_rgb, np.full((TILE, TILE), 255, dtype=np.uint8))), 'RGBA')


def opaque_ground(crop: Image.Image) -> Image.Image:
    """Fill atlas transparency by propagating fully painted ground pixels."""
    rgba = np.array(crop.convert('RGBA'))
    painted = rgba[..., 3] >= 240
    for _ in range(max(crop.width, crop.height)):
        if painted.all():
            break
        old = painted.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            shifted_mask = np.roll(old, (dy, dx), axis=(0, 1))
            shifted_pixels = np.roll(rgba, (dy, dx), axis=(0, 1))
            take = ~painted & shifted_mask
            rgba[take] = shifted_pixels[take]
            painted |= take
    rgba[..., 3] = 255
    return Image.fromarray(rgba, 'RGBA')


def generated_prop(source: Path, width: int) -> Image.Image:
    """Trim generated transparent padding and size a sprite for its world footprint."""
    im = Image.open(source).convert('RGBA')
    alpha = np.array(im.getchannel('A'))
    # The generator may add faint transparent ambience. Remove only the very
    # soft fringe; preserve anti-aliased object edges and the feet/shadow.
    alpha[alpha < 24] = 0
    im.putalpha(Image.fromarray(alpha, 'L'))
    mask = Image.fromarray(np.where(alpha >= 32, 255, 0).astype(np.uint8), 'L')
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError(f'generated prop has no visible pixels: {source}')
    im = im.crop(bbox)
    height = max(1, round(im.height * width / im.width))
    return im.resize((width, height), Image.Resampling.LANCZOS)


def build(reg: dict, log=print) -> dict:
    atlas = Image.open(ATLAS).convert('RGBA')
    world = reg['worlds']['gingertown']
    street = asphalt_tile(atlas)
    frame = save_frame(
        street,
        'worlds/gingertown/tiles/path.png',
        'derived',
        'front',
        'seamless 32px street texture using sampled asphalt colors from the handoff atlas; subtle seeded grain, with curb and crack motifs omitted',
    )
    world['tiles']['path'] = frame['path']
    for kind, rect in GINGER_TILES.items():
        tile = atlas.crop(rect).resize((TILE, TILE), Image.Resampling.NEAREST)
        # Transparent atlas padding contains arbitrary RGB values. Propagate
        # only fully painted neighboring pixels before making ground opaque,
        # so partially transparent atlas seams cannot become dark map lines.
        rgba = np.array(tile)
        painted = rgba[..., 3] >= 240
        for _ in range(TILE * 2):
            if painted.all():
                break
            old = painted.copy()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                shifted_mask = np.roll(old, (dy, dx), axis=(0, 1))
                shifted_pixels = np.roll(rgba, (dy, dx), axis=(0, 1))
                take = ~painted & shifted_mask
                rgba[take] = shifted_pixels[take]
                painted |= take
        rgba[..., 3] = 255
        tile = Image.fromarray(rgba, 'RGBA')
        frame = save_frame(
            tile,
            f'worlds/gingertown/tiles/{kind}.png',
            'genuine',
            'front',
            f'64px crop {rect} from art/handoff/worlds/ginger_town_tileset.png, reduced 2:1 with nearest-neighbour sampling',
        )
        world['tiles'][kind] = frame['path']
    # Foundation blocks under Ginger Town's house sprites share the same
    # damaged street surface, rather than the legacy vine-covered wall tile.
    world['tiles']['wall'] = world['tiles']['path']
    world['note'] += ' Ground tiles refined from the regional handoff atlas.'
    log('[world handoff] gingertown: 4 regional ground tiles integrated')

    for map_id, (filename, panels, names) in HANDOFF_BACKDROPS.items():
        sheet = Image.open(ROOT / 'art' / 'handoff' / 'worlds' / filename).convert('RGBA')
        refs = []
        for (x, y, w, h), name in zip(panels, names):
            panorama = sheet.crop((x, y, x + w, y + h))
            # Atlas panel gutters can be partially transparent. Extend painted
            # edge colors over those gaps to keep battle backdrops opaque.
            rgba = np.array(panorama)
            painted = rgba[..., 3] >= 240
            for _ in range(max(w, h)):
                if painted.all():
                    break
                old = painted.copy()
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    shifted_mask = np.roll(old, (dy, dx), axis=(0, 1))
                    shifted_pixels = np.roll(rgba, (dy, dx), axis=(0, 1))
                    take = ~painted & shifted_mask
                    rgba[take] = shifted_pixels[take]
                    painted |= take
            rgba[..., 3] = 255
            panorama = Image.fromarray(rgba, 'RGBA')
            # BattleScene keeps scenic strips at native size instead of
            # scaling small textures to the viewport. Enlarge the panorama to
            # a 1440px stage width in integer-preserving nearest-neighbor style.
            stage_width = 1440
            panorama = panorama.resize(
                (stage_width, round(panorama.height * stage_width / panorama.width)),
                Image.Resampling.NEAREST,
            )
            ref = save_frame(
                panorama,
                f'worlds/{map_id}/backdrop-handoff-{name}.png',
                'genuine',
                'front',
                f'{"battle-stage" if map_id in FULL_STAGE_BACKDROPS else "panorama"} crop {x},{y},{w},{h} from art/handoff/worlds/{filename}, nearest-neighbor enlarged to 1440px stage width',
            )
            refs.append(ref)
        reg['worlds'][map_id]['backdrops'] = refs
        reg['worlds'][map_id]['note'] += ' Battle panoramas curated from the regional handoff atlas.'
        log(f'[world handoff] {map_id}: {len(refs)} regional battle backgrounds integrated')

    for map_id, (filename, tiles) in HANDOFF_GROUND_TILES.items():
        sheet = Image.open(ROOT / 'art' / 'handoff' / 'worlds' / filename).convert('RGBA')
        world = reg['worlds'][map_id]
        for kind, region in tiles.items():
            if region == 'asphalt':
                image = sampled_asphalt(sheet, (96, 0, 156, 60), 211 + len(map_id))
                quality = 'derived'
                note = f'seamless low-contrast asphalt sampled from {filename} road palette'
            else:
                x0, y0, x1, y1 = region
                image = sheet.crop((x0, y0, x1, y1)).resize((TILE, TILE), Image.Resampling.NEAREST)
                image = opaque_ground(image)
                quality = 'genuine'
                note = f'inset ground crop {x0},{y0},{x1-x0},{y1-y0} from art/handoff/worlds/{filename}, reduced to 32px'
            frame = save_frame(image, f'worlds/{map_id}/tiles/{kind}.png', quality, 'front', note)
            world['tiles'][kind] = frame['path']
        world['note'] += ' Selected overworld ground tiles curated from its regional handoff atlas.'
        log(f'[world handoff] {map_id}: {len(tiles)} overworld ground tiles integrated')

    # South City's fountain is already designed as a self-contained plaza
    # centerpiece in the regional atlas. Keep its paving/planters with it so
    # the square footprint reads as an intentional landmark on the road map.
    south = Image.open(ROOT / 'art' / 'handoff' / 'worlds' / 'south_city_tileset.png').convert('RGBA')
    fountain = south.crop((872, 236, 1071, 442))
    frame = save_frame(
        fountain,
        'worlds/south_city/props/fountain.png',
        'genuine',
        'front',
        'fountain plaza crop 872,236,199,206 from art/handoff/worlds/south_city_tileset.png',
    )
    reg['worlds']['south_city']['props']['fountain'] = dict(
        path=frame['path'], w=frame['w'], h=frame['h'], footW=3, footH=3, solid=True,
    )
    log('[world handoff] south_city: fountain plaza prop integrated')

    for map_id, (filename, prop, width, foot_w, foot_h, solid) in GENERATED_WORLD_PROPS.items():
        source = ROOT / 'art' / 'handoff' / 'generated_world_props' / filename
        image = generated_prop(source, width)
        frame = save_frame(
            image,
            f'worlds/{map_id}/props/{prop}.png',
            'derived',
            'front',
            f'AI-generated transparent candidate in art/handoff/generated_world_props/{filename}; trimmed and fitted to {width}px width',
        )
        reg['worlds'][map_id]['props'][prop] = dict(
            path=frame['path'], w=frame['w'], h=frame['h'], footW=foot_w, footH=foot_h, solid=solid,
        )
        log(f'[world handoff] {map_id}: generated {prop} landmark integrated')
    return reg
