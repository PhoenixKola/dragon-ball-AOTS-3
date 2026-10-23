#!/usr/bin/env python3
"""AOTS3 Cell Saga art pipeline.  Usage: python tools/build_art.py [--only heroes,enemies,npcs,worlds,vfx,ui]
Reads art/source (bundle copy), writes public/assets/** and src/data/artRegistry.generated.json."""
from __future__ import annotations
import json, sys, shutil, datetime, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_lib import ROOT, SRC, OUT  # noqa: E402

LOG = ROOT / 'tests' / 'logs' / 'art-build.log'
_lines: list[str] = []


def log(msg: str):
    print(msg)
    _lines.append(msg)


def main():
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    want = lambda k: only is None or k in only  # noqa: E731
    reg_path = ROOT / 'src' / 'data' / 'artRegistry.generated.json'
    if only and reg_path.exists():
        reg = json.loads(reg_path.read_text(encoding='utf8'))
    else:
        reg = dict(version=1, generatedAt='', actors={}, worlds={}, vfx={}, skillIcons={}, itemIcons={}, uiFrames={})
        if OUT.exists() and only is None:
            shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    loaded = None
    if want('heroes'):
        import art_heroes
        loaded = art_heroes.build_heroes(reg, log)
        art_heroes.build_derived_heroes(reg, loaded, log)
        log(f'[heroes] done {time.time()-t0:.1f}s')
    if want('enemies'):
        import art_enemies
        art_enemies.build_enemies(reg, log)
        log(f'[enemies] done {time.time()-t0:.1f}s')
    if want('handoff'):
        import art_handoff
        art_handoff.build_handoff_heroes(reg, log)
        log(f'[handoff] done {time.time()-t0:.1f}s')
    if want('npcs'):
        import art_procedural
        art_procedural.build_npcs(reg, log)
        log(f'[npcs] done {time.time()-t0:.1f}s')
    if want('handoff2'):
        import art_handoff2
        art_handoff2.build(reg, log)
        log(f'[handoff2] done {time.time()-t0:.1f}s')
    if want('troopers'):
        import art_troopers
        art_troopers.build_troopers(reg, log)
    if want('worlds'):
        import art_worlds
        art_worlds.build_worlds(reg, log)
        log(f'[worlds] done {time.time()-t0:.1f}s')
    if want('vfx'):
        import art_vfx
        art_vfx.build_vfx(reg, log)
        log(f'[vfx] done {time.time()-t0:.1f}s')
    if want('ui'):
        import art_ui
        art_ui.build_ui(reg, log)
        log(f'[ui] done {time.time()-t0:.1f}s')
    if want('patch'):
        import art_patch
        art_patch.build_patch(reg, log)
        log(f'[patch] done {time.time()-t0:.1f}s')
    if want('proportions'):
        import art_proportions
        art_proportions.apply(reg, log)
    # prune files no longer referenced by the registry
    used = set()
    def walk(o):
        if isinstance(o, dict):
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
        elif isinstance(o, str) and o.startswith('assets/') and o.endswith('.png'):
            used.add(o)
    walk(reg)
    removed = 0
    for f in list(OUT.rglob('*.png')):
        if 'assets/' + f.relative_to(OUT).as_posix() not in used:
            f.unlink(); removed += 1
    log(f'pruned {removed} unreferenced PNGs')
    reg['generatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    reg_path.parent.mkdir(parents=True, exist_ok=True)
    reg_path.write_text(json.dumps(reg, indent=1, sort_keys=True), encoding='utf8')
    LOG.parent.mkdir(parents=True, exist_ok=True)
    LOG.write_text('\n'.join(_lines) + '\n', encoding='utf8')
    log(f'registry written: {len(reg["actors"])} actors, {len(reg["worlds"])} worlds, {len(reg["vfx"])} vfx, '
        f'{len(reg["skillIcons"])} skill icons, {len(reg["itemIcons"])} item icons')


if __name__ == '__main__':
    main()
