"""Final content-stage overrides backed by native-generated, retained source art."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

from art_lib import ROOT, save_frame


def install_actor(reg, log, actor_id, source_name, display_name):
    source = ROOT / 'art' / 'production' / 'characters' / source_name
    if not source.exists():
        log(f'[finalcontent] {display_name} source missing; kept existing character art')
        return
    atlas = Image.open(source).convert('RGBA')
    cell_w, cell_h = atlas.width / 4, atlas.height / 4
    directions = ('down', 'left', 'right', 'up')
    rows = {}
    for row, direction in enumerate(directions):
        frames = []
        for col in range(4):
            box = (round(col * cell_w), round(row * cell_h), round((col + 1) * cell_w), round((row + 1) * cell_h))
            frame = atlas.crop(box)
            bbox = frame.getchannel('A').getbbox()
            if not bbox:
                raise ValueError(f'{display_name} atlas contains an empty cell at row {row}, column {col}')
            frame = frame.crop(bbox)
            # Retain crisp pixel clusters at the established runtime character scale.
            frame = frame.resize((max(1, round(frame.width * 0.5)), max(1, round(frame.height * 0.5))), Image.Resampling.NEAREST)
            frames.append(frame)
        rows[direction] = frames

    old = reg['actors'][actor_id]
    old['overworld'] = {}
    for direction in directions:
        facing = {'down': 'front', 'left': 'left', 'right': 'right', 'up': 'back'}[direction]
        frames = rows[direction]
        idle = save_frame(frames[0], f'npcs/{actor_id}/overworld/{direction}/idle.png', 'genuine', facing,
                          f'Native-generated identity-matched transparent 4x4 sheet; neutral {direction}-facing pose.', trim=True)
        walk = [save_frame(frame, f'npcs/{actor_id}/overworld/{direction}/walk-0{i}.png', 'genuine', facing,
                           'Native-generated neighboring walk pose from the same directional row.', trim=True)
                for i, frame in enumerate(frames[1:], 1)]
        old['overworld'][direction] = {'idle': idle, 'walk': walk}
    down = rows['down'][0]
    old['battle'] = {'idle': save_frame(down, f'npcs/{actor_id}/battle/idle.png', 'genuine', 'front',
                                         'Stable neutral pose reused from the generated front-facing overworld sheet.', trim=True)}
    x0, y0, x1, y1 = down.getchannel('A').getbbox()
    head = down.crop((x0, y0, x1, min(y1, y0 + round((y1 - y0) * 0.56))))
    old['portrait'] = save_frame(head, f'npcs/{actor_id}/portrait.png', 'derived', 'front',
                                 'Portrait crop derived from the generated front-facing overworld idle.', trim=True)
    old.update({
        'facing': 'front', 'approved': False, 'provisional': False, 'fallbackReason': None,
        'provenance': f'art/production/characters/{source_name}; native-generated, 4x4 rows down/left/right/up, columns idle/walk-01/02/03; sliced by tools/art_final_content.py',
    })
    log(f'[finalcontent] installed {display_name} native-generated 4-direction idle and 3-frame walk sheet')


def build(reg, log):
    """Install generated character and Capsule Corp courtyard finishing art."""
    for actor_id, source_name, display_name in (
        ('kami', 'kami-overworld-4x4.png', 'Kami'),
        ('bulma', 'bulma-overworld-4x4.png', 'Bulma'),
        ('chi-chi', 'chi-chi-overworld-4x4.png', 'Chi-Chi'),
        ('mr-satan', 'mr-satan-overworld-4x4.png', 'Mr. Satan'),
        ('king-kai', 'king-kai-overworld-4x4.png', 'King Kai'),
    ):
        install_actor(reg, log, actor_id, source_name, display_name)

    # A Capsule Corporation planter set makes the service plaza feel tended and
    # lived in, while leaving the central route and all interaction tiles clear.
    planter_source = ROOT / 'art' / 'production' / 'worlds' / 'capsule-corp-plaza-planter.png'
    if planter_source.exists():
        planter = Image.open(planter_source).convert('RGBA')
        bbox = planter.getchannel('A').getbbox()
        if not bbox:
            raise ValueError('Capsule Corp planter has no visible pixels')
        planter = planter.crop(bbox)
        planter.thumbnail((112, 80), Image.Resampling.NEAREST)
        world = reg['worlds']['capsule_corp']
        props = world.setdefault('props', {})
        for name, frame in (('plaza_planter', planter), ('plaza_planter_b', planter.transpose(Image.Transpose.FLIP_LEFT_RIGHT))):
            props[name] = {
                **save_frame(frame, f'worlds/capsule_corp/props/{name}.png', 'genuine', 'front',
                             'Native-generated transparent Capsule Corp plaza planter; mirrored foliage variation for natural placement.'),
                'footW': 3, 'footH': 1, 'solid': False,
            }
        log('[finalcontent] installed generated Capsule Corp plaza planter prop')
    else:
        log('[finalcontent] Capsule Corp planter source missing; kept existing plaza layout')
