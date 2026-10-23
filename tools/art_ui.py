"""UI art: icons come from tools/art_icons.py (handoff atlases); frames are the bundle borders."""
from __future__ import annotations
import shutil
from art_lib import SRC, OUT

UI = SRC / '07-ui'


def build_ui(reg, log):
    import art_icons
    art_icons.build_icons(reg, log)
    reg['uiFrames'] = {}
    for p in sorted((UI / 'frames').glob('*.png')):
        color = p.stem.replace('square-border-', '')
        dest = OUT / 'ui' / 'frames' / p.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, dest)
        reg['uiFrames'][color] = f'assets/ui/frames/{p.name}'
    log(f'[ui] {len(reg["uiFrames"])} frames copied')
