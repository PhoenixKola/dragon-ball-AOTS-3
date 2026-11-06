# Final acceptance matrix — Batch G technical review

Updated 6 November 2026. `PASS` means the listed automated evidence ran; it does not imply human acceptance. The current detailed run ledger is `QA_REPORT.md` and `POLISH_RELEASE_REPORT.md`.

| Gate | Status | Evidence / scope |
|---|---|---|
| Existing AOTS3 engine, story, saves, 7 heroes, 84 skills, 12 maps and 29 story fights preserved | PASS | Source, story/skill/map matrices, regression suite; no AOTS2/Namek edits. |
| Baseline audit, art spec, provenance and before/after index | PASS | `POLISH_BASELINE_AUDIT.md`, `ART_STYLE_AND_ANIMATION_SPEC.md`, `ASSET_COVERAGE_AND_PROVENANCE.md`, visual evidence index. |
| Ginger Town + Gohan/Cell playable pilot | PASS | Real game captures and route evidence; playable cellar rescue, escort and evacuation. |
| Combat presentation, battle UI, inputs and balance update | PASS (automated) | 84 skill presentation map, control/browser checks, combat/integration suite, guard/offense policy matrix. Human play-feel pending. |
| All 12 maps and regional battle stages | PASS (technical visual review) | 12 real Phaser map captures, collision/reachability tests and runtime/art audits. Human approval pending. |
| Transformation flow and 15 camera definitions | PASS (implementation and route captures) | Release-beat form swap, behind-actor aura/ring/lightning; authored cameras and all 15 story IDs captured at natural triggers. Six P02 transformation captures also preserved. |
| Fresh Normal New Game-to-postgame route | PASS (automated) | 30/30 beats, 29 story battles plus six random encounters, 35 wins, 0 defeats, 1,013 movement steps; 0 page errors/external requests. Actual postgame hub capture preserved. |
| All three postgame simulations | PASS (automated) | SIM_JUNIORS, SIM_PERFECT, SIM_SUPER cleared using the earned beat-30 save through the game console/battle engine. |
| Unit/integration suite | PASS | `npm test`: 591 tests in 12 files. |
| Browser build, lint, asset/runtime integrity | PASS | Build and lint pass; 1,071 art frames/50 actors/12 worlds/42 VFX; 1,682 runtime paths; zero audit errors/warnings/missing/orphans. Two Vite mixed-import warnings remain. |
| Save recovery, settings, 3 viewports, software-GL FPS samples | PASS (automated) | `checks.mjs` 15/15; no horizontal overflow; 53/52/51 sampled FPS. Not hardware performance certification. |
| Windows Electron app folder | PASS (automated smoke) | `pack:win`; 13/13 Electron smoke, offline and security defaults, relaunch save persistence. Clean-PC/manual extraction remains pending. |
| Release ZIP integrity/contents | PASS | Four 6 November 2026 archives pass CRC checks; source has no logs/UI-only images/node_modules, player and Electron executables are present, and art-source has its checksum manifest. |
| Every skill/loadout individually inspected; all optional quests manually played | NOT CLAIMED | Broad automated matrices and quest regression checks exist, but this integration pass did not individually inspect every skill/loadout or play every optional quest by hand. |
| Human art, gameplay, audio, physical controller, clean-PC and modest-PC review | HUMAN / PENDING | See `KNOWN_LIMITATIONS.md` for the exact owner checklist. |

**Verdict:** Batches A–G have completed their implementation and automated technical exit evidence and have been pushed. Human acceptance is still required before calling the game human-approved or release-final.
