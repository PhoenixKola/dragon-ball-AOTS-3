"""Final content-stage overrides backed by native-generated, retained source art."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

from art_lib import ROOT, save_frame


def build(reg, log):
    """Install generated character and Capsule Corp courtyard finishing art."""
    source = ROOT / 'art' / 'production' / 'characters' / 'kami-overworld-4x4.png'
    if not source.exists():
        log('[finalcontent] Kami source missing; kept existing fallback')
        return

    atlas = Image.open(source).convert('RGBA')
    if atlas.width != atlas.height:
        raise ValueError(f'Kami sprite atlas must be square: {atlas.size}')
    cell = atlas.width / 4
    directions = ('down', 'left', 'right', 'up')
    rows = {}
    for row, direction in enumerate(directions):
        frames = []
        for col in range(4):
            box = (round(col * cell), round(row * cell), round((col + 1) * cell), round((row + 1) * cell))
            frame = atlas.crop(box)
            alpha = frame.getchannel('A')
            bbox = alpha.getbbox()
            if not bbox:
                raise ValueError(f'Kami atlas contains an empty cell at row {row}, column {col}')
            frame = frame.crop(bbox)
            # The generated atlas is about twice the density of the installed
            # runtime sprites. Keep its pixel clusters crisp at the established
            # character scale instead of introducing a blurred resize.
            target_h = max(1, round(frame.height * 0.5))
            target_w = max(1, round(frame.width * 0.5))
            frame = frame.resize((target_w, target_h), Image.Resampling.NEAREST)
            frames.append(frame)
        rows[direction] = frames

    old = reg['actors']['kami']
    old['overworld'] = {}
    for direction in directions:
        facing = {'down': 'front', 'left': 'left', 'right': 'right', 'up': 'back'}[direction]
        frames = rows[direction]
        idle = save_frame(frames[0], f'npcs/kami/overworld/{direction}/idle.png', 'genuine', facing,
                          'Native-generated, identity-matched transparent 4x4 sheet; neutral directional pose.', trim=True)
        walk = [save_frame(frame, f'npcs/kami/overworld/{direction}/walk-0{i}.png', 'genuine', facing,
                           'Native-generated neighboring walk pose from the same directional row.', trim=True)
                for i, frame in enumerate(frames[1:], 1)]
        old['overworld'][direction] = {'idle': idle, 'walk': walk}

    down = rows['down'][0]
    old['battle'] = {
        'idle': save_frame(down, 'npcs/kami/battle/idle.png', 'genuine', 'front',
                           'Stable neutral pose reused from the generated front-facing overworld sheet.', trim=True)
    }
    # A cropped, matching head-and-shoulders portrait derived from the new idle.
    alpha_box = down.getchannel('A').getbbox()
    if alpha_box:
        x0, y0, x1, y1 = alpha_box
        head = down.crop((x0, y0, x1, min(y1, y0 + round((y1 - y0) * 0.56))))
        old['portrait'] = save_frame(head, 'npcs/kami/portrait.png', 'derived', 'front',
                                     'Portrait crop derived from the generated front-facing overworld idle.', trim=True)
    old.update({
        'facing': 'front',
        'approved': False,
        'provisional': False,
        'fallbackReason': None,
        'provenance': 'art/production/characters/kami-overworld-4x4.png; native-generated with installed AOTS3 hero/NPC references; 4x4 rows down/left/right/up, columns idle/walk-01/02/03; sliced by tools/art_final_content.py',
    })
    log('[finalcontent] installed Kami native-generated 4-direction idle and 3-frame walk sheet')

    bulma_source = ROOT / 'art' / 'production' / 'characters' / 'bulma-overworld-4x4.png'
    if bulma_source.exists():
        atlas = Image.open(bulma_source).convert('RGBA')
        cell_w = atlas.width / 4
        cell_h = atlas.height / 4
        rows = {}
        for row, direction in enumerate(('down', 'left', 'right', 'up')):
            frames = []
            for col in range(4):
                box = (round(col * cell_w), round(row * cell_h), round((col + 1) * cell_w), round((row + 1) * cell_h))
                frame = atlas.crop(box)
                if not frame.getchannel('A').getbbox():
                    raise ValueError(f'Bulma atlas contains an empty cell at row {row}, column {col}')
                frame = frame.crop(frame.getchannel('A').getbbox())
                frame = frame.resize((max(1, round(frame.width * 0.5)), max(1, round(frame.height * 0.5))), Image.Resampling.NEAREST)
                frames.append(frame)
            rows[direction] = frames

        old = reg['actors']['bulma']
        old['overworld'] = {}
        for direction in ('down', 'left', 'right', 'up'):
            facing = {'down': 'front', 'left': 'left', 'right': 'right', 'up': 'back'}[direction]
            frames = rows[direction]
            idle = save_frame(frames[0], f'npcs/bulma/overworld/{direction}/idle.png', 'genuine', facing,
                              'Native-generated identity-matched transparent 4x4 sheet; neutral directional pose.', trim=True)
            walk = [save_frame(frame, f'npcs/bulma/overworld/{direction}/walk-0{i}.png', 'genuine', facing,
                               'Native-generated neighboring walk pose from the same directional row.', trim=True)
                    for i, frame in enumerate(frames[1:], 1)]
            old['overworld'][direction] = {'idle': idle, 'walk': walk}
        down = rows['down'][0]
        old['battle'] = {'idle': save_frame(down, 'npcs/bulma/battle/idle.png', 'genuine', 'front',
                                             'Stable neutral pose reused from the generated front-facing overworld sheet.', trim=True)}
        box = down.getchannel('A').getbbox()
        if box:
            x0, y0, x1, y1 = box
            old['portrait'] = save_frame(down.crop((x0, y0, x1, min(y1, y0 + round((y1 - y0) * 0.56)))),
                                         'npcs/bulma/portrait.png', 'derived', 'front',
                                         'Portrait crop derived from the generated front-facing overworld idle.', trim=True)
        old.update({
            'facing': 'front', 'approved': False, 'provisional': False, 'fallbackReason': None,
            'provenance': 'art/production/characters/bulma-overworld-4x4.png; native-generated with installed Bulma NPC reference; 4x4 rows down/left/right/up, columns idle/walk-01/02/03; sliced by tools/art_final_content.py',
        })
        log('[finalcontent] installed Bulma native-generated 4-direction idle and 3-frame walk sheet')
    else:
        log('[finalcontent] Bulma source missing; kept existing character art')

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
