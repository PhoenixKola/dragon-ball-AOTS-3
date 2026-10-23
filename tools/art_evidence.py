"""Contact sheets for human review (docs/art-evidence). Reads the generated registry + public/assets."""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_lib import ROOT, OUT, contact_sheet  # noqa: E402

EV = ROOT / 'docs' / 'art-evidence'
BG = (66, 70, 100, 255)


def load(ref):
    return Image.open(ROOT / 'public' / ref['path']).convert('RGBA')


def scaled(ref, target_h, ref_h):
    im = load(ref)
    s = target_h / ref_h
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)


def lineup(reg, ids, name, state='idle', cols=8, cell=(190, 260)):
    """Equal-scale lineup: each actor scaled so its idle bbox height == displayHeight*0.9."""
    sheet = Image.new('RGBA', (cols * cell[0], ((len(ids) + cols - 1) // cols) * cell[1]), BG)
    d = ImageDraw.Draw(sheet)
    for i, aid in enumerate(ids):
        a = reg['actors'][aid]
        ref = a['battle'].get(state) or a['battle']['idle']
        idle = a['battle']['idle']
        s = (a['displayHeight'] * 0.9) / idle['bbox'][3]
        im = load(ref)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
        cx, cy = (i % cols) * cell[0], (i // cols) * cell[1]
        fx, fy = round(ref['feet'][0] * s), round(ref['feet'][1] * s)
        ox = cx + cell[0] // 2 - fx
        oy = cy + cell[1] - 24 - fy
        sheet.alpha_composite(im, (max(cx, ox), max(cy, oy))) if im.width < cell[0] and im.height < cell[1] - 24 else sheet.alpha_composite(im.crop((0, 0, min(im.width, cell[0]), min(im.height, cell[1] - 24))), (cx, cy))
        d.text((cx + 3, cy + 3), f'{aid} {a["displayHeight"]}px {a["battle"]["idle"]["quality"][:3]}', fill=(255, 255, 160, 255))
        d.line([(cx, cy + cell[1] - 24), (cx + cell[0], cy + cell[1] - 24)], fill=(255, 255, 255, 60))
    sheet.save(EV / name)


def pose_sheet(reg, aid, name=None):
    a = reg['actors'][aid]
    items = []
    for s, ref in a['battle'].items():
        items.append((f'{s} [{ref["quality"][:3]}]', load(ref)))
    sh1 = contact_sheet(items, cols=min(8, len(items)), cell=(170, 190))
    rows = []
    if 'overworld' in a:
        its = []
        for dname, v in a['overworld'].items():
            its.append((f'{dname} idle [{v["idle"]["quality"][:3]}]', load(v['idle'])))
            for j, w in enumerate(v['walk']):
                its.append((f'{dname} w{j+1} [{w["quality"][:3]}]', load(w)))
        rows.append(contact_sheet(its, cols=8, cell=(125, 135)))
    if a.get('portrait'):
        rows.append(contact_sheet([('portrait', load(a['portrait']))], cols=1, cell=(200, 190)))
    h = sh1.height + sum(r.height for r in rows)
    w = max([sh1.width] + [r.width for r in rows])
    out = Image.new('RGBA', (w, h), BG)
    out.alpha_composite(sh1, (0, 0))
    y = sh1.height
    for r in rows:
        out.alpha_composite(r, (0, y)); y += r.height
    out.save(EV / (name or f'actor-{aid}.png'))


def main(which):
    reg = json.loads((ROOT / 'src' / 'data' / 'artRegistry.generated.json').read_text(encoding='utf8'))
    EV.mkdir(parents=True, exist_ok=True)
    heroes = [k for k, v in reg['actors'].items() if v['kind'] == 'hero']
    enemies = [k for k, v in reg['actors'].items() if v['kind'] == 'enemy']
    npcs = [k for k, v in reg['actors'].items() if v['kind'] == 'npc']
    if 'heroes' in which:
        lineup(reg, heroes, 'lineup-heroes-idle.png')
        for st in ('attack', 'special', 'ko'):
            lineup(reg, heroes, f'lineup-heroes-{st}.png', st)
        for h in heroes:
            pose_sheet(reg, h)
    if 'enemies' in which:
        lineup(reg, enemies, 'lineup-enemies-idle.png', cols=8)
        for e in enemies:
            pose_sheet(reg, e)
    if 'npcs' in which:
        for n in npcs:
            pose_sheet(reg, n)


if __name__ == '__main__':
    main(sys.argv[1].split(',') if len(sys.argv) > 1 else ['heroes', 'enemies', 'npcs'])


def world_sheet(reg, mid):
    w = reg['worlds'][mid]
    # tile strip: each tile shown as 4x4 repetition to check seams
    cols = []
    for cls, p in w['tiles'].items():
        t = Image.open(ROOT / 'public' / p).convert('RGBA')
        rep = Image.new('RGBA', (t.width * 4, t.height * 4))
        for i in range(4):
            for j in range(4):
                rep.paste(t, (i * t.width, j * t.height))
        cols.append((cls, rep))
    tiles = contact_sheet(cols, cols=10, cell=(150, 150), scale_up=False)
    props = []
    for name, pr in w['props'].items():
        props.append((f'{name} {pr["w"]}x{pr["h"]} f{pr["footW"]}x{pr["footH"]}{"" if pr["solid"] else " ns"}', Image.open(ROOT / 'public' / pr['path']).convert('RGBA')))
    cw, ch = 150, 150
    psheet = contact_sheet(props, cols=10, cell=(cw, ch), scale_up=False)
    bds = []
    for i, b in enumerate(w['backdrops']):
        im = Image.open(ROOT / 'public' / b['path']).convert('RGBA')
        bds.append((f'backdrop {i} {im.width}x{im.height}', im))
    bsheet = contact_sheet(bds, cols=min(3, len(bds)), cell=(480, 250), scale_up=False)
    W_ = max(tiles.width, psheet.width, bsheet.width)
    out = Image.new('RGBA', (W_, tiles.height + psheet.height + bsheet.height), BG)
    out.alpha_composite(tiles, (0, 0)); out.alpha_composite(bsheet, (0, tiles.height)); out.alpha_composite(psheet, (0, tiles.height + bsheet.height))
    out.save(EV / f'world-{mid}.png')


def worlds_main():
    reg = json.loads((ROOT / 'src' / 'data' / 'artRegistry.generated.json').read_text(encoding='utf8'))
    for mid in reg['worlds']:
        world_sheet(reg, mid)
