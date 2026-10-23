"""Generates docs/ART_INTEGRATION_REPORT.md and docs/MISSING_OR_PROVISIONAL_ART.md from the registry + bundle CSV."""
import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
reg = json.loads((ROOT / 'src/data/artRegistry.generated.json').read_text(encoding='utf8'))
rows = list(csv.DictReader(open(ROOT / 'art/source/manifest/missing-and-provisional.csv', encoding='utf8')))

OUT = {
    ('hero-form', 'gohan-ssj'): ('resolved-derived', 'actor `gohan-ssj`: gohan-base with recoloured gold hair + yellow aura rim (hair-region heuristic; not redrawn)'),
    ('hero-form', 'gohan-ssj2'): ('resolved-derived', 'actor `gohan-ssj2`: gold hair + wider aura + baked procedural lightning; real SSJ2 hair/pose art still missing'),
    ('hero-form', 'vegeta-ascended'): ('resolved-derived', 'actor `vegeta-ascended`: vegeta-ssj stretched 1.3x (NEAREST) + orange aura; no real expanded musculature'),
    ('hero-form', 'trunks-ultra-grade3'): ('resolved-derived', 'actor `trunks-ultra`: trunks-ssj stretched 1.4x + red aura + sparks; no real Grade 3 art'),
    ('hero-story', 'goku-virus-weakened'): ('provisional-fallback', 'actor `goku-weakened`: desaturated/green tint of goku-base only; no ill/slumped poses'),
    ('hero-story', 'gohan-wounded-arm'): ('provisional-fallback', 'actor `gohan-wounded`: heuristic bandage/blood overlay on gohan-base; not a real one-armed pose'),
    ('hero-story', 'gohan-alternate-clothing'): ('provisional-fallback', 'actor `gohan-training`: purple gi hue-shifted to green (recolour only)'),
    ('enemy', 'super-perfect-cell'): ('provisional-fallback', 'actor `cell-super-perfect`: Perfect Cell yellow-shifted + gold aura rim + baked lightning; distinct but derived'),
    ('enemy', 'cell-junior'): ('provisional-fallback', 'actor `cell-junior`: Perfect Cell hue-shifted blue, 2:1 NEAREST reduction'),
    ('enemy', 'landing-security'): ('provisional-fallback', 'procedural trooper'),
    ('enemy', 'recon-probe'): ('provisional-fallback', 'procedural probe'),
    ('enemy', 'drain-drone'): ('provisional-fallback', 'procedural drone'),
    ('enemy', 'android-19-scout'): ('resolved-derived', 'no separate scout art: runtime should reuse `android-19` (genuine sheet) or `recon-probe`; no new file'),
    ('enemy', 'armored-sentinel'): ('provisional-fallback', 'procedural sentinel'),
    ('enemy', 'security-grid'): ('provisional-fallback', 'procedural grid panel'),
    ('enemy', 'cell-husk'): ('provisional-fallback', 'procedural husk'),
    ('enemy', 'absorbed-shadow'): ('provisional-fallback', 'procedural shadow silhouette'),
    ('enemy', 'cell-probe'): ('provisional-fallback', 'procedural probe'),
    ('enemy', 'training-sentinel'): ('provisional-fallback', 'procedural sentinel'),
    ('enemy', 'chamber-guardian'): ('provisional-fallback', 'procedural guardian'),
    ('story', None): ('missing', 'no painted cutscene frames exist. Runtime must stage these with in-engine choreography (actors + vfx ids `absorb`, `teleport`, `aura-ssj2`, `father-son`, `lightning`, `explosion`); 05-story/REVIEW-ONLY was NOT used'),
    ('vfx', 'character-specific-markers'): ('missing', 'hit markers/clip timing are engine data (not art); 35 VFX ids registered, frames mostly `variants_not_sequence`'),
    ('map', 'collision-maps'): ('missing', 'art side supplies tiles/props/backdrops + MAP_ART_INDEX.md; collision/triggers are authored in src/data/maps by the engine'),
    ('audio', 'music-and-sfx'): ('missing', 'out of scope for the art pipeline; runtime synthesizes audio'),
}
for n in ['bulma', 'chi-chi', 'yamcha', 'kami', 'king-kai', 'mr-satan', 'researchers', 'civilians']:
    OUT[('npc', n)] = ('provisional-fallback', f'procedural NPC `{n.rstrip("s") if n in ("researchers","civilians") else n}`: 4-way idle+3-step walk chibi + single-expression portrait (tool-drawn)')

md = ['# Missing or provisional art', '',
      'Nothing in this project is human-approved (`approved=false` everywhere). Outcomes: **resolved-derived** (usable derived art, not authentic), **provisional-fallback** (tool-drawn or tinted stand-in), **missing** (no art produced).', '',
      '| class | id | requirement | outcome | detail |', '|---|---|---|---|---|']
for r in rows:
    k = (r['class'], r['id'])
    o = OUT.get(k) or OUT.get((r['class'], None)) or ('missing', '')
    md.append(f'| {r["class"]} | {r["id"]} | {r["requirement"]} | **{o[0]}** | {o[1]} |')
md += ['', '## 13 exact duplicate-frame slots (art/source/manifest/DUPLICATE-FRAMES-TO-FIX.md)', '',
       'Groups 1-4,8-12 are overworld slots; 5 = piccolo portrait; 6-7 = tien battle. Handling (see `note` fields in the registry):', '',
       '| group | slot | outcome |', '|---|---|---|',
       '| 1-4 | gohan-base overworld down/idle~walk-02, down/walk-01~right/walk-03, left/idle~walk-02, right/idle~walk-02 | walk slots replaced by derived frames (mirrored alternate leg / 2px bob), note `duplicate_slot`; the genuine idle frames stay; **down/idle, left/idle, right/idle remain duplicates of walk frames only in the bundle, not in the registry** |',
       '| 5 | piccolo portrait base == kami-merged | piccolo-kami portrait replaced by a head crop of its own battle idle (derived) |',
       '| 6 | tien battle idle == charge | charge = idle + blue rim (derived) |',
       '| 7 | tien battle attack == special | special = attack + gold rim (derived) |',
       '| 8-12 | tien overworld duplicates | duplicate walk/idle slots replaced by mirrored/bob derived frames; tien down/idle, up/walk-01 kept genuine |',
       '', 'Derived replacements are labelled `derived`, never `genuine`, and are NOT unique animation.',
       '', '## Other provisional/known defects',
       '- 84 skill icons: copied verbatim; every 49x49 crop contains slivers of neighbouring atlas icons (crop bleed) and several icons are cut off by the crop. Semantic match to skills is unverified. No near-duplicate pairs (MAD<6 on 12x12 thumbs).',
       '- 15 item ids use stand-in icons (see itemIcons list in ART_INTEGRATION_REPORT.md).',
       '- SSJ / Kami hero sheets: sprite cells in the bundle clip the character at the 418x418 cell edge (flagged `edge_touch` in frame notes: gohan-base, goku-ssj, trunks-ssj, vegeta-ssj, piccolo-kami, tien-base overworld). Where the source sheet itself continues the sprite the build re-extracts it; otherwise the clipped bundle crop is kept.',
       '- Enemy sheets: frames hand-assigned; most enemy sprites are front/three-quarter views (facing=`front`).',
       '- World tiles: 32px tiles are cross-blended crops (derived); water tiles for 6 maps are procedural fallback.',
       ]
(ROOT / 'docs/MISSING_OR_PROVISIONAL_ART.md').write_text('\n'.join(md), encoding='utf8')

q = lambda a: a['battle']['idle']['quality']
rep = ['# Art integration report', '', 'Reproducible: `python tools/build_art.py` (heroes ~75s). Inputs: `art/source` (bundle copy). Outputs: `public/assets/**`, `src/data/artRegistry.generated.json` (schema `src/data/artTypes.ts`).',
       '', '## Method', '',
       '- **Heroes**: bundle crops located inside their source sheets (`locate_crop`) and re-extracted where the 418/144px cell clipped the sprite (`recover_full`); alpha noise <16 zeroed; PNGs trimmed (+2px pad), feet = bottom-centre of visible pixels. Direction keys checked by skin-position analysis + visual contact sheets: bundle left/right folder names match visible facing.',
       '- **Derived forms** (gohan-ssj/ssj2/wounded/training, goku-weakened, vegeta-ascended, trunks-ultra, piccolo-kami portrait, super-perfect cell, cell-junior): recolour/aura/lightning/NEAREST stretch of source art; flagged `derived`, `provisional`.',
       '- **Enemies**: 10 sheets sliced with dilated-alpha component analysis, frames hand-assigned per actor (`SPEC` in tools/art_enemies.py), neighbour fragments removed.',
       '- **NPCs / minions**: tool-drawn pixel art (`procedural_fallback`); 05-story/REVIEW-ONLY never used.',
       '- **Worlds**: opaque backdrop strips cropped; 32px tiles = cross-blended patches (derived); props = discrete components at 1/2 scale (NEAREST). See docs/art-evidence/MAP_ART_INDEX.md.',
       '- **VFX**: 35 ids bound to hand-picked components; sheets are variant collections, so most ids are `variants_not_sequence`.',
       '- **UI**: 84 skill icons (ids like `goku_0`), 37 item ids, 5 frames.', '',
       '## Actors', '', '| actor | kind | idle quality | displayHeight | provisional | fallbackReason |', '|---|---|---|---|---|---|']
for aid, a in reg['actors'].items():
    rep.append(f'| {aid} | {a["kind"]} | {q(a)} | {a["displayHeight"]} | {a["provisional"]} | {a.get("fallbackReason", "")} |')
rep += ['', '## VFX ids', '', '| id | frames | quality | note |', '|---|---|---|---|']
for vid, v in reg['vfx'].items():
    rep.append(f'| {vid} | {len(v["frames"])} | {v["quality"]} | {v["note"]} |')
rep += ['', '## Item icon stand-ins (not exact semantic)', '', 'revive_seed, antidote, power_charm, guard_charm, anti_drain_charm, speed_charm, rage_charm, focus_band, gero_record, lab_medicine, relay_part, research_part, medicine_vial, scouter, dragon_radar',
        '', '## Verification', '', '- `python tools/audit_assets_bundle.py` -> tests/logs/art-audit.log (426 files, 0 errors; integrity only).',
        '- `python tools/audit_assets.py` -> tests/logs/art-runtime-audit.log (955 registry frames: files exist, sizes, visible>0, feet in bbox, no approved flags, 48 required actors, 12 worlds, 84 icons, no orphan PNGs).',
        '- Contact sheets in docs/art-evidence/ were viewed for heroes, enemies, NPCs, all 12 worlds and VFX.', '',
        '## Known visual issues', '- SSJ/Kami hero battle poses touch the PNG edge (source cell clipping) - sprites may look cut at limbs/hair/aura.',
        '- Gohan SSJ hair recolour is heuristic: some dark pixels (eyes/outline) near the hair line may be tinted.',
        '- Cell imperfect `beam` pose includes a pink beam spike from the source art.', '- Lookout/time-chamber floor tiles are near-flat white-blue.']
(ROOT / 'docs/ART_INTEGRATION_REPORT.md').write_text('\n'.join(rep), encoding='utf8')
print('reports written', len(rows), 'rows')
