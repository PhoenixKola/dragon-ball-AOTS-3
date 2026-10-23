"""Proportion lineup sheets: docs/art-evidence/proportions-battle.png and proportions-overworld.png (what the game actually draws)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
r = json.loads((ROOT / 'src/data/artRegistry.generated.json').read_text(encoding='utf8'))
A = r['actors']

def sheet(kind, names, out, cell_w, cell_h, scale_fn, frame_fn, grid=False):
    cols = 12
    rows = (len(names) + cols - 1) // cols
    img = Image.new('RGB', (cols * cell_w, rows * cell_h), (40, 44, 56))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        a = A[n]
        f = frame_fn(a)
        if not f: continue
        im = Image.open(ROOT / 'public' / f['path']).convert('RGBA')
        h_ref = (a['battle']['idle'] if kind == 'battle' else (a.get('overworld', {}).get('down', {}).get('idle') or a['battle']['idle']))['bbox'][3]
        sc = scale_fn(a) / h_ref
        im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.NEAREST)
        cx = (i % cols) * cell_w + cell_w // 2
        base = (i // cols) * cell_h + cell_h - 28
        fx, fy = round(f['feet'][0] * sc), round(f['feet'][1] * sc)
        img.paste(im, (cx - fx, base - fy), im)
        d.line([(cx - cell_w // 2 + 4, base), (cx + cell_w // 2 - 4, base)], fill=(90, 96, 112))
        d.text((cx - cell_w // 2 + 4, base + 6), f'{n[:16]} {round(scale_fn(a))}', fill=(255, 255, 255))
    if grid:  # tile reference column at left of the first row: 32px tiles
        pass
    img.save(ROOT / 'docs/art-evidence' / out)

heroes_first = [n for n in A if A[n]['kind'] == 'hero'] + [n for n in A if A[n]['kind'] == 'npc'] + [n for n in A if A[n]['kind'] == 'enemy']
sheet('battle', heroes_first, 'proportions-battle.png', 150, 330, lambda a: a['displayHeight'] * 0.75, lambda a: a['battle'].get('idle'))
OWD = {'hero': 54, 'npc': 52, 'enemy': 70}
def ow_frame(a):
    d = a.get('overworld', {}).get('down')
    return d['idle'] if d else a['battle'].get('idle')
sheet('overworld', heroes_first, 'proportions-overworld.png', 110, 200, lambda a: a.get('owHeight') or OWD[a['kind']], ow_frame)
print('lineups written')
