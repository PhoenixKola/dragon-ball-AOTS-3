"""Builds release/AOTS3-Cell-Saga-RC1-full.zip (source+dist+tests+docs) and ...-player.zip (dist + launcher + node runtime).
Usage: python tools/package_release.py [--no-runtime]"""
import os, shutil, sys, zipfile, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REL = os.path.join(ROOT, 'release')
os.makedirs(REL, exist_ok=True)
NAME = 'AOTS3-Cell-Saga-RC1'
SKIP_DIRS = {'node_modules', '.git', 'release', 'legacy', 'dist-test', '__pycache__', 'AOTS3-CELL-SAGA-ART-INTEGRATION-BUNDLE', '.vite'}
def add_tree(z, src, arc_root, skip_names=()):
    for d, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            if f in skip_names or f.endswith('.pyc'): continue
            p = os.path.join(d, f)
            z.write(p, os.path.join(arc_root, os.path.relpath(p, ROOT)))
full = os.path.join(REL, f'{NAME}-full-source.zip')
with zipfile.ZipFile(full, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for top in ['src', 'public', 'tests', 'tools', 'docs', 'art', 'dist']:
        if os.path.isdir(os.path.join(ROOT, top)): add_tree(z, os.path.join(ROOT, top), NAME)
    for f in ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'eslint.config.js', 'index.html', 'ui-harness.html', 'START_GAME.bat', 'README.md', 'CLAUDE.md']:
        if os.path.exists(os.path.join(ROOT, f)): z.write(os.path.join(ROOT, f), f'{NAME}/{f}')
print('full', os.path.getsize(full) // 1048576, 'MB')
player = os.path.join(REL, f'{NAME}-player-windows.zip')
with zipfile.ZipFile(player, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    add_tree(z, os.path.join(ROOT, 'dist'), NAME + '-player')
    for t in ['serve-dist.mjs', 'launch.mjs']: z.write(os.path.join(ROOT, 'tools', t), f'{NAME}-player/tools/{t}')
    z.write(os.path.join(ROOT, 'START_GAME.bat'), f'{NAME}-player/START_GAME.bat')
    if os.path.exists(os.path.join(ROOT, 'docs', 'PLAYER_README.txt')): z.write(os.path.join(ROOT, 'docs', 'PLAYER_README.txt'), f'{NAME}-player/README.txt')
    if '--no-runtime' not in sys.argv:
        node = shutil.which('node')
        if node: z.write(node, f'{NAME}-player/runtime/node.exe')
print('player', os.path.getsize(player) // 1048576, 'MB')
