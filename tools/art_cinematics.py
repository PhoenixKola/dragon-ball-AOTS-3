"""Install original, approved-for-runtime candidate story keyframes.

The untouched generation output lives in art/production/cinematics.  Runtime
copies are kept separate so the art build can be repeated without a service.
"""
from pathlib import Path
import shutil
from PIL import Image
from art_lib import ROOT, OUT

KEYFRAMES = {
    'trunks_arrival': 'trunks-defeats-frieza.png',
    'cell_absorbs_17': 'cell-absorbs-android17.png',
    'cell_absorbs_18': 'cell-absorbs-android18.png',
    'gohan_ssj2_awakening': 'gohan-ssj2-awakening.png',
    'goku_sacrifice': 'goku-sacrifice-choice.png',
    'father_son_finale': 'father-son-kamehameha.png',
    'android16_destruction': 'android16-destruction.png',
}


def build(reg: dict, log):
    folder = OUT / 'cinematics'
    folder.mkdir(parents=True, exist_ok=True)
    entries = {}
    for story_id, filename in KEYFRAMES.items():
        source = ROOT / 'art' / 'production' / 'cinematics' / filename
        target = folder / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        with Image.open(source) as im:
            im.verify()
        shutil.copyfile(source, target)
        with Image.open(target) as im:
            w, h = im.size
        entries[story_id] = {
            'path': f'assets/cinematics/{filename}', 'w': w, 'h': h,
            'quality': 'genuine', 'approved': False,
            'provenance': f'art/production/cinematics/{filename}; native Codex image generation; candidate pending human review',
        }
        log(f'[cinematics] {story_id}: {w}x{h}')
    reg['cinematics'] = entries
