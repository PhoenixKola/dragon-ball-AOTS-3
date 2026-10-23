# Art integration report

Reproducible: `python tools/build_art.py` (heroes ~75s). Inputs: `art/source` (bundle copy). Outputs: `public/assets/**`, `src/data/artRegistry.generated.json` (schema `src/data/artTypes.ts`).

## Method

- **Heroes**: bundle crops located inside their source sheets (`locate_crop`) and re-extracted where the 418/144px cell clipped the sprite (`recover_full`); alpha noise <16 zeroed; PNGs trimmed (+2px pad), feet = bottom-centre of visible pixels. Direction keys checked by skin-position analysis + visual contact sheets: bundle left/right folder names match visible facing.
- **Derived forms** (gohan-ssj/ssj2/wounded/training, goku-weakened, vegeta-ascended, trunks-ultra, piccolo-kami portrait, super-perfect cell, cell-junior): recolour/aura/lightning/NEAREST stretch of source art; flagged `derived`, `provisional`.
- **Enemies**: 10 sheets sliced with dilated-alpha component analysis, frames hand-assigned per actor (`SPEC` in tools/art_enemies.py), neighbour fragments removed.
- **NPCs / minions**: tool-drawn pixel art (`procedural_fallback`); 05-story/REVIEW-ONLY never used.
- **Worlds**: opaque backdrop strips cropped; 32px tiles = cross-blended patches (derived); props = discrete components at 1/2 scale (NEAREST). See docs/art-evidence/MAP_ART_INDEX.md.
- **VFX**: 35 ids bound to hand-picked components; sheets are variant collections, so most ids are `variants_not_sequence`.
- **UI**: 84 skill icons (ids like `goku_0`), 37 item ids, 5 frames.

## Actors

| actor | kind | idle quality | displayHeight | provisional | fallbackReason |
|---|---|---|---|---|---|
| absorbed-shadow | enemy | procedural_fallback | 160 | True | missing-art: absorbed-shadow (no source sheet; procedural silhouette) |
| android-16 | enemy | genuine | 255 | False |  |
| android-17 | enemy | genuine | 190 | False |  |
| android-18 | enemy | genuine | 185 | False |  |
| android-19 | enemy | genuine | 190 | False |  |
| android-20 | enemy | genuine | 185 | False |  |
| armored-sentinel | enemy | procedural_fallback | 175 | True | missing-art: armored-sentinel (no source sheet; procedural silhouette) |
| bulma | npc | procedural_fallback | 100 | True | missing-art: bulma npc (05-story is REVIEW-ONLY; procedural placeholder) |
| cell-husk | enemy | procedural_fallback | 160 | True | missing-art: cell-husk (no source sheet; procedural silhouette) |
| cell-imperfect | enemy | genuine | 225 | False |  |
| cell-junior | enemy | genuine | 120 | False |  |
| cell-perfect | enemy | genuine | 258 | False |  |
| cell-probe | enemy | procedural_fallback | 105 | True | missing-art: cell-probe (no source sheet; procedural silhouette) |
| cell-semi-perfect | enemy | genuine | 250 | False |  |
| cell-super-perfect | enemy | genuine | 268 | False |  |
| chamber-guardian | enemy | procedural_fallback | 215 | True | missing-art: chamber-guardian (no source sheet; procedural silhouette) |
| chi-chi | npc | procedural_fallback | 100 | True | missing-art: chi-chi npc (05-story is REVIEW-ONLY; procedural placeholder) |
| civilian | npc | procedural_fallback | 100 | True | missing-art: civilian npc (05-story is REVIEW-ONLY; procedural placeholder) |
| drain-drone | enemy | procedural_fallback | 115 | True | missing-art: drain-drone (no source sheet; procedural silhouette) |
| gohan-base | hero | genuine | 190 | False |  |
| gohan-ssj | hero | genuine | 200 | False |  |
| gohan-ssj2 | hero | genuine | 205 | False |  |
| gohan-training | hero | genuine | 190 | False |  |
| gohan-wounded | hero | derived | 190 | True | missing-art: gohan-wounded-arm |
| goku-base | hero | genuine | 175 | False |  |
| goku-ssj | hero | genuine | 190 | False |  |
| goku-weakened | hero | genuine | 175 | False |  |
| kami | npc | procedural_fallback | 100 | True | missing-art: kami npc (05-story is REVIEW-ONLY; procedural placeholder) |
| king-cold | enemy | genuine | 245 | False |  |
| king-kai | npc | procedural_fallback | 100 | True | missing-art: king-kai npc (05-story is REVIEW-ONLY; procedural placeholder) |
| krillin-base | hero | genuine | 140 | False |  |
| landing-security | enemy | procedural_fallback | 150 | True | missing-art: landing-security (no source sheet; procedural silhouette) |
| mecha-frieza | enemy | genuine | 205 | False |  |
| mr-satan | npc | procedural_fallback | 100 | True | missing-art: mr-satan npc (05-story is REVIEW-ONLY; procedural placeholder) |
| piccolo-base | hero | genuine | 215 | False |  |
| piccolo-kami | hero | genuine | 235 | False |  |
| recon-probe | enemy | procedural_fallback | 110 | True | missing-art: recon-probe (no source sheet; procedural silhouette) |
| researcher | npc | procedural_fallback | 100 | True | missing-art: researcher npc (05-story is REVIEW-ONLY; procedural placeholder) |
| security-grid | enemy | procedural_fallback | 165 | True | missing-art: security-grid (no source sheet; procedural silhouette) |
| tien-base | hero | genuine | 200 | False |  |
| training-sentinel | enemy | procedural_fallback | 140 | True | missing-art: training-sentinel (no source sheet; procedural silhouette) |
| trunks-base | hero | genuine | 185 | False |  |
| trunks-ssj | hero | genuine | 200 | False |  |
| trunks-ultra | hero | genuine | 215 | False |  |
| vegeta-ascended | hero | genuine | 205 | False |  |
| vegeta-base | hero | genuine | 170 | False |  |
| vegeta-ssj | hero | genuine | 188 | True | bundle file is named vegeta-ssj-provisional |
| yamcha | npc | procedural_fallback | 100 | True | missing-art: yamcha npc (05-story is REVIEW-ONLY; procedural placeholder) |

## VFX ids

| id | frames | quality | note |
|---|---|---|---|
| absorb | 5 | genuine | variants_not_sequence: green tentacle/slime absorb (Cell tail) |
| aura-ascended | 2 | derived | derived: gold flames hue-shifted orange; variants_not_sequence |
| aura-base | 4 | genuine | variants_not_sequence: blue ground flare |
| aura-rage | 6 | genuine | variants_not_sequence: red-orange flames |
| aura-sparking | 3 | genuine | variants_not_sequence: blue sparkle bursts |
| aura-ssj | 4 | genuine | variants_not_sequence: gold flame flares |
| aura-ssj2 | 5 | genuine | variants_not_sequence: gold flame halo + yellow lightning bolts |
| aura-ultra | 5 | genuine | ordered_growth: magenta aura around dark silhouette (silhouette inside is part of the art) |
| ball-blue | 5 | genuine | ordered_growth: blue energy orb small->large |
| ball-green | 2 | genuine | variants_not_sequence: green orb + green orb with shards |
| ball-purple | 4 | genuine | ordered_growth: dark purple orb small->large |
| ball-red | 3 | derived | derived: ball-yellow hue-shifted to red; ordered_growth |
| ball-yellow | 3 | genuine | ordered_growth: yellow orb small->large |
| barrier | 4 | genuine | variants_not_sequence: blue hex shield / dome |
| beam-blue | 4 | genuine | ordered_growth: head frames small->large; body must be stretched by the runtime |
| beam-final-flash | 4 | genuine | variants_not_sequence: yellow-white beam heads (Final Flash / Galick variants) |
| beam-gold | 3 | genuine | variants_not_sequence (head frames; stretch body) |
| beam-green | 2 | genuine | EO#19 genuine green head; EO#9 two green orbs (variants_not_sequence) |
| beam-purple | 3 | genuine | variants_not_sequence (head frames; stretch body) |
| beam-red | 5 | genuine | ordered_growth: red beam heads small->large |
| beam-white | 3 | derived | derived: beam-blue frames desaturated to white-cyan; variants_not_sequence |
| beam-yellow | 5 | genuine | ordered_growth: yellow beam heads small->large |
| charge | 4 | genuine | ordered_growth: blue ki-charge orb with arcs |
| crescent-purple | 4 | genuine | variants_not_sequence: purple crescent arcs (Dirty Fireworks / Galick sweep) |
| disc | 4 | genuine | variants_not_sequence: gold crescent discs (Destructo Disc); runtime should rotate/scale |
| explosion | 5 | genuine | ordered_growth (approx): fire explosions small->large |
| father-son | 5 | genuine | variants_not_sequence: blue+gold clashing energy (Father-Son Kamehameha stand-in) |
| flare | 3 | genuine | variants_not_sequence: Solar Flare star/glow |
| impact-big | 3 | genuine | variants_not_sequence: blue/gold/purple big bursts |
| impact-hit | 4 | genuine | variants_not_sequence: blue hit-stars |
| lightning | 5 | genuine | variants_not_sequence: yellow lightning bolts |
| regen | 5 | genuine | variants_not_sequence: green heal glows |
| slash | 4 | genuine | ordered_growth: blue sword-slash arcs |
| spiral | 3 | genuine | variants_not_sequence: blue spirals (Special Beam Cannon corkscrew) |
| teleport | 5 | genuine | ordered_growth: purple spike column rising |

## Item icon stand-ins (not exact semantic)

revive_seed, antidote, power_charm, guard_charm, anti_drain_charm, speed_charm, rage_charm, focus_band, gero_record, lab_medicine, relay_part, research_part, medicine_vial, scouter, dragon_radar

## Verification

- `python tools/audit_assets_bundle.py` -> tests/logs/art-audit.log (426 files, 0 errors; integrity only).
- `python tools/audit_assets.py` -> tests/logs/art-runtime-audit.log (955 registry frames: files exist, sizes, visible>0, feet in bbox, no approved flags, 48 required actors, 12 worlds, 84 icons, no orphan PNGs).
- Contact sheets in docs/art-evidence/ were viewed for heroes, enemies, NPCs, all 12 worlds and VFX.

## Known visual issues
- SSJ/Kami hero battle poses touch the PNG edge (source cell clipping) - sprites may look cut at limbs/hair/aura.
- Gohan SSJ hair recolour is heuristic: some dark pixels (eyes/outline) near the hair line may be tinted.
- Cell imperfect `beam` pose includes a pink beam spike from the source art.
- Lookout/time-chamber floor tiles are near-flat white-blue.