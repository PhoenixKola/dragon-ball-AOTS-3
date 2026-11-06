# AOTS3 overhaul execution checklist

This is the working source of truth for completing `aots3-cell-saga-codex-complete-gameplay-visual-experience-overhaul.md`. It separates the already playable RC baseline from the requested game-feel/art overhaul. Update a checkbox only when its evidence exists; human-only checks remain pending until a person does them.

**Status key:** `DONE` = batch implementation and exit evidence complete; `ACTIVE` = current batch; `NEXT` = next batch; `QUEUED` = later batch; human-only approvals are tracked separately as `HUMAN / PENDING`.

**Current overall status:** Batches A through G have completed their implementation and recorded automated exit evidence. Human art, play-feel, listening, physical controller, clean-PC install and modest-hardware profiling gates remain **HUMAN / PENDING**. Batch G captured all 15 story sequences through natural browser triggers; individual human inspection of all 84 skills remains unclaimed. Do not translate test count, feature coverage, or package availability into an overhaul-completion percentage.

## Batch sequence

| Batch | Milestone | Status | Exit evidence |
|---|---|---|---|
| A. Baseline audit and art bible | M0 | DONE | Unified before/after set is indexed; the 30-beat Normal route completed with 34 wins, 0 defeats, 12 map captures, seven actual keyframe triggers, no browser errors and no external requests. Complete source/registry audits and the full rebuild pass. Human art approval is listed separately as pending. |
| B. Ginger Town + Gohan vs Perfect Cell pilot | M1 | DONE | Native-generated evacuation shuttle, playable cellar rescue/follower/evacuation, atlas ground variation, coherent Cell Husk stage floor, captured/inspected quest flow and battle actions, and normal plus reduced-motion compact G05 views. |
| C. Combat feel and battle UI | M2 | DONE | All 84 core techniques, Rage Arts and combos resolve through the combat presentation map; event timing, outcome feedback, generated signature effects, HUD costs/restrictions/targets and viewport/input regressions pass. Human play-feel/art approval remains a separate pending sign-off. |
| D. Twelve-region exploration and battle stages | M3 | DONE | All 12 regional maps and battle backgrounds are rendered and reviewed. Native-generated ground refinements now cover Capsule Corp courtyard, Rocky Outskirts, Mountain Lab, Lab Interior, Android Island, Lookout, Time Chamber and Cell Games Arena; missing sign/flyer art and generic point markers are replaced with registered art. The fresh Normal route reached beat 23 and captured all 12 maps after movement (27 wins, 1 retry defeat, 0 page errors, 0 external requests); targeted terrain fixtures refreshed the final changed maps. Clean asset/runtime audits report 0 missing files, 0 invalid PNGs and 0 orphan PNGs. Existing layouts, collision, exits, quests and story triggers remain unchanged. |
| E. Battle & transformation spectacle and story transitions | M2/M3 | DONE | Transformation charge/release/reveal now uses a retained generated ring, matching form aura, restrained camera, behind-actor energy layers, localized accents, unique audio cues and a reveal portrait. All 15 cutscene definitions receive authored, clamped camera framing; form changes reveal on the release beat. The real P02 Normal route captured six story/battle stages with 0 browser errors and 0 external requests. Typecheck, lint, build, runtime and art audits pass. |
| F. Audio, pacing, difficulty and QoL | M4 | DONE | Stable original four-bar motifs cover all 22 music keys; seven offline region beds route across the 12 maps and stop/crossfade at battles, cutscenes and map changes. Transformation cues align to charge/release/impact. Audio unit checks pass 10/10; the six-seed Normal/Easy policy matrix and guard/offense review are documented. By-ear approval remains HUMAN / PENDING. |
| G. Performance, release, campaign QA and sign-off | M5 | DONE (technical) | Fresh 30/30 Normal route with 15 natural cutscene captures, all three postgame simulations, current browser/Windows builds, 13/13 Electron smoke, 15/15 browser checks, four verified ZIPs, and updated QA/limitations docs. Human sign-offs and individual visual review of every skill remain pending. |

## Acceptance ledger

### M0 â€” Baseline, source, and art bible

- [x] Inspect the AOTS3 working tree, baseline docs, runtime registry, real game screenshots and usable source art; keep Namek read-only.
- [x] Record baseline defects and preserve existing deterministic combat, story, save namespace, map geometry and strong title/actor assets.
- [x] Create the baseline audit, art-style specification, provenance ledger, reproducible artwork tooling and source-art archive.
- [x] Finish a single well-indexed before/after capture set for title, dialogue, target selection, battle states, transformation, credits and postgame. Credits and postgame include the existing UI/device limitation note.
- [x] Verify every current generation/refinement against installed AOTS3 identity references in-game; reject style/alpha/clipping defects. The pavilion v1 fringe was rejected and replaced by the captured v2; final registry/build audits are clean.
- [x] Maintain candidate vs derived vs human-approved labels. **Human art approval remains separately HUMAN / PENDING.**

### M1 â€” Real pilot slice: Ginger Town + Gohan vs Perfect Cell

- [x] Keep both slices in the actual game, real maps/encounters, real cutscenes and real battle engine.
- [x] Add a native-generated Ginger Town battle panorama and drifting mist; retain generated sources and reproducible installation.
- [x] Improve the two major Cell Games moments with native-generated candidate keyframes and in-engine finale staging.
- [x] Capture/inspect the complete pilot set: ordinary melee, multi-hit, charged beam, hit reaction, missed hit, guard result, target move, victory, exploration, dialogue, NPC interaction and relevant cutscene. Evidence is indexed in `docs/OVERHAUL_VISUAL_EVIDENCE_INDEX.md`.
- [x] Refine Ginger Town's repetitive terrain/house composition and review Gohan vs Cell at the normal 1280x720 view and a reduced-motion 1024x600 compact view. Dialogue and escort captures show the text fully typed and the follower separated from the player at the shuttle.

### M2 - Systemwide combat and interaction

- [x] Keep deterministic hit timing, target following, scene-clock cleanup, reduced motion and battle-speed behavior in the existing systems. Damage numbers and authored hit sounds wait for authoritative contact; ranged projectiles resolve on arrival, and misses visibly overshoot.
- [x] Map all 84 core techniques, seven Rage Arts and seven team combos to registered VFX and resolved action families. The generated map records each technique cue, hit/charge/target/cost data, phase timing at 1x and the temporal or one-shot status of the frame source.
- [x] Keep action timing tied to battle speed and event phases: melee approach, ranged cue/travel/contact, serialized multi-hit beats, recovery and the 880ms Active Guard lead at 1x are documented in `docs/COMBAT_PRESENTATION_MAP.md`. Reduced-motion and skip paths do not alter deterministic outcomes.
- [x] Add or retain distinct presentation for melee, ki, beams, sword/discs, counters, transformations, Rage, Sparking, status effects, heals, revives, regeneration, guards, enemy telegraphs, misses/evades, critical/heavy contacts, absorption and resisted status effects. Enemy telegraphs mark the threatened target while keeping its guard timestamp.
- [x] Replace misleading variant cycling for important cues with truthful temporal effects: native-generated contact burst, Piccolo spiral projectile, Spirit Bomb growth, Telekinetic Pin closure, Cell absorption drain and hex barrier formation/impact/break. Hellzone Grenade and Neo Tri-Beam have distinct generated projectile heads. Other single-frame variants stay pulses or travel/rotation effects; they are not presented as authored frame animations.
- [x] Finish the compact command dock: attack/guard Ki gain, technique/item/combo costs, charge turns, limited-use counts, per-partner combo cost, Rage costs, target HP and disabled reasons are explicit. The current skill model has limited uses and restrictions but no cooldown field, so no fictitious cooldown is shown.
- [x] Verify mouse and keyboard battle commands/targeting, narrow-window dock placement, and all UI-harness scenes at 900x600, 1024x600, 1280x720 and 1920x1080. The 148-check viewport sweep reports zero clipping, overflow, central fight-lane obstruction, browser errors or external requests. Physical controller hardware review remains HUMAN / PENDING.
- [x] Regress dialogue click/typewriter double dispatch, one-click completion versus second-click advance, rapid double clicks, skip, target selection, skill/item/back buttons and guard timing. Dialogue E2E reports all interaction cases passed; battle controls passed.
- [x] Capture real outcomes: evasion and melee recovery; guard grades; Hellzone Grenade in flight before target HP changes; Android 19 absorbing Galick Gun at A04 with unchanged 446 HP; and beam/contact/pilot beats. Unit/integration checks cover determinism, criticals, counters, healing, status application/resistance and full skill data.
- [x] Preserve scene lifecycle cleanup and existing seven story keyframes; all registered paths and generated sequence frames pass runtime and asset audits.

Batch C technical checkpoint: **41 VFX families, 1,070 registered frames, 50 actors, 12 world regions and 1,653 valid runtime paths**; zero asset-audit warnings/errors and zero orphan runtime PNGs. Native-generated absorption and barrier source art is retained under `art/production/vfx/`, indexed in the provenance ledger and reproducibly sliced by `tools/art_vfx.py`. Typecheck, lint, all 591 unit/integration tests, controls, dialogue E2E, clean production build, viewport sweep, runtime-path audit and natural A04 absorption capture pass. Human art approval, controller hardware review and player feel acceptance remain HUMAN / PENDING, not automated passes.

### M3 â€” All maps, props and story cinematics

- [x] Keep all 12 map collision/layout/quest/story trigger contracts intact; Ginger Town now has atlas-derived grass, damaged-lot and curb tiles, a calm seamless asphalt fill, atmosphere, nonblocking prop variety and full battle-stage art. Its latest production capture is `tests/logs/screens/polish/gingertown-after.png` (browser errors: 0; external requests: 0).
- [x] Refresh and inspect all 12 regional maps in Phaser, including ground continuity, paths, depth, prominent interactions and replacement coverage. The 12-image set is `docs/overhaul-evidence/after/world-maps/`; six updated terrain maps were re-rendered from an earned-save visual fixture, while the complete twelve-region set was also captured during fresh Normal progression. The fixture changes only the saved map/position for art review, not release data or progression evidence. All 12 regions retain collision, exits, story and quest triggers. Generated paving/soil/rock/floor treatments, landmarks, atmospheric map art and regional battle backgrounds are documented in `docs/ART_USAGE_MANIFEST.md` and `docs/ASSET_COVERAGE_AND_PROVENANCE.md`.
- [x] Integrate regional battle backgrounds across all 12 maps, with opaque scenic images and deterministic stage-ID variant selection where a region has multiple scenes. Handoff artwork is now integrated for Ginger Town, Future Landing (4 weather/time variants), Rocky Outskirts (6 variants), South City (intact/ruined), Capsule Corp, Android Island (2 variants), both Cell Games regions, Gero Mountain (2 views), Gero Lab, Kami's Lookout, and the Time Chamber. Human scene/contrast review remains pending.
- [x] Review save/heal/shop/chest art sizing and resolution in the regional map set. Chest-open state remains persisted through the existing `opened` save field; this batch made no save schema or chest interaction changes.
- [x] Integrate candidate stills for Trunks defeating Frieza, Android 17/18 absorptions, Android 16 destruction, SSJ2 awakening, Goku sacrifice and Father-Son finale.
- [x] Add a distinct, authored establishing camera shot to each of the 15 cutscene definitions. The shared renderer clamps every camera move to the stage, uses letterbox framing and restores the camera after replay; skip and reduced-motion paths apply the same final form/story state.
- [x] Direct the Trunks SSJ story reveal on the energy-release beat, use his matching SSJ portrait for the reveal line, layer aura and ring behind the actor, and retain distinct absorption effects for Cell/Piccolo form changes. Candidate story art remains HUMAN / PENDING approval.
- [x] Capture all 15 stories and major transitions in their real triggered story flow, not by injected campaign flags. The final route sweep is indexed in `docs/OVERHAUL_VISUAL_EVIDENCE_INDEX.md`; targeted P02 transformation captures are in `docs/overhaul-evidence/after/transformations/`.

### M4 â€” Audio, balance, pacing and QoL

- [x] Retain offline synthesized audio, gesture unlock, saved sliders and music crossfades; existing automated checks pass.
- [x] Reduce guard repetition: one successful timing input covers a full enemy multi-hit move against one hero, and selected bosses no longer receive a second full action every round.
- [x] Balance offense against the defensive Guard action: basic attacks now restore 6 Ki (up from 3), while Guard restores 6 (down from 8); both choices fund techniques equally, and the attack also deals damage. Unit coverage verifies the tradeoff; campaign policy runs still clear all six no-guard Normal seeds with two retries each.
- [x] Fix G05's threshold to match its stated 50% objective. Normal policy test: a route with 10% perfect, 25% good and 65% missed guards clears all six deterministic seeds (five with 0 defeats, one with 4); ordinary average and attentive routes also clear. No-guard Easy clears six seeds.
- [x] Improve no-guard Normal viability without flattening the full challenge: routine untelegraphed hits no longer force a timing prompt, missed/omitted guards get a modest passive brace, and charged/telegraphed/multi-hit/heavy attacks retain Active Guard. Six no-guard Normal natural-progression campaign seeds now reach credits (two retries each); attentive, average, occasional-guard and no-guard Easy policies also clear all six seeds.
- [x] Review encounter spacing, quest rewards, loadout/skill choices, healing/shop economy, formations, status/counter clarity and guard pressure against the deterministic campaign policy matrix. All three postgame scenarios cleared in Batch G; full travel/read-time and balance acceptance remain HUMAN / PENDING.
- [x] Preserve accessible climax controls: Father–Son Kamehameha remains a direct command rather than a mandatory single-frame QTE; existing skip, battle speed and reduced-motion assists remain available.
- [x] Add stable original themes, map-specific offline ambience, transformation sound phases and signal/routing checks. Preserve sliders, mute, unlock and pause behavior. **Listening/mastering sign-off remains HUMAN / PENDING.**

### M5 â€” Release, verification, and delivery

- [x] Final production browser build, lint, 591-test unit/integration suite, art/runtime audits, and route QA pass. Vite emits two mixed-import warnings; build succeeds.
- [x] Refresh the Windows Electron app folder and source/player/art-source/Electron archives. All four ZIPs pass CRC integrity checks; source ZIP excludes local logs, UI-only screenshots, and `node_modules`; art ZIP carries 567 source checksums.
- [x] Current Electron smoke passes 13/13, including save persistence after relaunch in isolated app data.
- [x] Fresh normal-progression route: 30/30 beats, 34 wins, zero defeats, no browser errors/external requests; then all three postgame simulations clear on the earned save. This is automated policy evidence, not a human playtest.
- [x] Confirm 12 world captures, viewport/save recovery checks (15/15), battle controls, and zero external requests. Existing data/regression matrices cover combat, skills, maps, quests and story contracts.
- [x] Trigger and capture all 15 distinct cutscene sequences in natural browser story flow. Individual human inspection of all 84 skills/loadouts remains **HUMAN / PENDING**.
- [x] Record software-GL FPS samples at three desktop viewports. Modest Windows hardware, memory, frame spikes, decode and load profiling were unavailable; documented as not run rather than implied complete.
- [x] Update the current QA report, acceptance matrix, known limitations, final pass notes, visual evidence index and release report to remove stale RC1/RC2 claims.
- [ ] Obtain human gameplay, art, audio, physical controller, and clean-PC Windows sign-off. Until then mark these gates **HUMAN / PENDING**, never automated PASS.

## Batch publishing rule

Per the owner's latest instruction, commit and push only after a batch's implementation and stated verification have passed. Keep each commit scoped to that batch, preserve existing source/generated PNG provenance, and do not deploy or publish a release. If a batch fails its exit checks, fix it before committing/pushing. Human review items above are still pending and are not represented as technical passes.
