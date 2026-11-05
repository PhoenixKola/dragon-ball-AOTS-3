"""Install curated native-generated stage artwork over the source-sheet backdrop for a pilot map."""
from pathlib import Path
import shutil
from PIL import Image
from art_lib import ROOT, OUT, frame_meta


def build(reg: dict, log):
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
