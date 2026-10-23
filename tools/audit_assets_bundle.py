#!/usr/bin/env python3
import json,hashlib,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'art'/'source'
m=json.loads((root/'manifest/asset-manifest.json').read_text(encoding='utf8'))
errors=[]
for a in m['assets']:
 p=root/a['path']
 if not p.exists(): errors.append('missing '+a['path']); continue
 if hashlib.sha256(p.read_bytes()).hexdigest()!=a['sha256']:errors.append('hash '+a['path'])
 with Image.open(p) as i:
  if i.size!=(a['width'],a['height']):errors.append('size '+a['path'])
  if a['role'] in ('hero-battle-pose','hero-overworld-frame','hero-portrait') and i.mode!='RGBA':errors.append('alpha-mode '+a['path'])
print(f"Checked {len(m['assets'])} art files; errors: {len(errors)}")
if errors:print('\n'.join(errors[:50]))
sys.exit(bool(errors))
