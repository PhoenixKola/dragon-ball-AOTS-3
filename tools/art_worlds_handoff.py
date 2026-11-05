"""Curated regional-world extractions from the illustrated handoff atlases.

The legacy source sheets remain the source for the whole registry. This module
overrides only Ginger Town ground textures, using documented source rectangles
from its supplied regional atlas. Map geometry, objects, triggers and collision
are deliberately outside this stage.
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
    return reg
