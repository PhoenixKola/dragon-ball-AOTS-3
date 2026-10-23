"""Annotated band overviews (row.col ids) of every 1448x1086 handoff sheet -> docs/art-evidence/_ov (review aid)."""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_sheet import overview as overview_bands
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
H = ROOT / 'art' / 'handoff'
out = ROOT / 'docs' / 'art-evidence' / '_ov'
out.mkdir(parents=True, exist_ok=True)
for f in out.glob('*'):
    f.unlink()
tab = {}
for sub in ('heroes/forms', 'heroes/story_variants', 'npcs', 'villains_bosses', 'regular_enemies'):
    for p in sorted((H / sub).glob('*.png')):
        if Image.open(p).size[0] == 1792:
            continue
        key = f'{sub.replace("/", "__")}__{p.name}'
        im, rows = overview_bands(p, out / key); rows = [rows]
        tab[key] = rows
        print(key.split('__', 2)[-1] if False else key, [len(r) for r in rows])
(out / 'boxes.json').write_text(json.dumps(tab))
