"""Install native-generated atmospheric overlays without modifying originals."""
import shutil
from PIL import Image
from art_lib import ROOT, OUT


def build(reg: dict, log):
    source = ROOT / 'art' / 'production' / 'atmosphere' / 'gingertown-mist.png'
    target = OUT / 'worlds' / 'gingertown' / 'mist.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as im:
        im.verify()
    shutil.copyfile(source, target)
    reg['worlds']['gingertown']['weatherOverlay'] = 'assets/worlds/gingertown/mist.png'
    log('[atmosphere] gingertown mist: native-generated transparent overlay')
