# AOTS3 overhaul execution checklist

This is the working source of truth for completing `aots3-cell-saga-codex-complete-gameplay-visual-experience-overhaul.md`. It separates the already playable RC baseline from the requested game-feel/art overhaul. Update a checkbox only when its evidence exists; human-only checks remain pending until a person does them.

**Status key:** `DONE` = batch implementation and exit evidence complete; `ACTIVE` = current batch; `NEXT` = next batch; `QUEUED` = later batch; human-only approvals are tracked separately as `HUMAN / PENDING`.

**Current overall status:** Batches A, B, C and D are complete with technical evidence. Batch E is next: smoother battle flow, a spectacular transformation sequence, and the remaining story cinematics/transitions. Batches F and G cover audio/balance/QoL and final release/campaign QA. The complete overhaul is not finished; human art, play-feel, listening, controller and clean-PC gates remain. Do not translate test count, game feature coverage, or package availability into an overhaul-completion percentage.

## Batch sequence

| Batch | Milestone | Status | Exit evidence |
|---|---|---|---|
| A. Baseline audit and art bible | M0 | DONE | Unified before/after set is indexed; the 30-beat Normal route completed with 34 wins, 0 defeats, 12 map captures, seven actual keyframe triggers, no browser errors and no external requests. Complete source/registry audits and the full rebuild pass. Human art approval is listed separately as pending. |
| B. Ginger Town + Gohan vs Perfect Cell pilot | M1 | DONE | Native-generated evacuation shuttle, playable cellar rescue/follower/evacuation, atlas ground variation, coherent Cell Husk stage floor, captured/inspected quest flow and battle actions, and normal plus reduced-motion compact G05 views. |
| C. Combat feel and battle UI | M2 | DONE | All 84 core techniques, Rage Arts and combos resolve through the combat presentation map; event timing, outcome feedback, generated signature effects, HUD costs/restrictions/targets and viewport/input regressions pass. Human play-feel/art approval remains a separate pending sign-off. |
| D. Twelve-region exploration and battle stages | M3 | DONE | All 12 regional maps and battle backgrounds are rendered and reviewed. Native-generated ground refinements now cover Capsule Corp courtyard, Rocky Outskirts, Mountain Lab, Lab Interior, Android Island, Lookout, Time Chamber and Cell Games Arena; missing sign/flyer art and generic point markers are replaced with registered art. The fresh Normal route reached beat 23 and captured all 12 maps after movement (27 wins, 1 retry defeat, 0 page errors, 0 external requests); targeted terrain fixtures refreshed the final changed maps. Clean asset/runtime audits report 0 missing files, 0 invalid PNGs and 0 orphan PNGs. Existing layouts, collision, exits, quests and story triggers remain unchanged. |
| E. Battle & transformation spectacle and story transitions | M2/M3 | NEXT | Add smoother anticipation-to-impact-to-recovery flow and a high-impact, readable transformation sequence with authored VFX that match the installed art style; then continue direction across the remaining cutscenes/transitions. Preserve timing, deterministic outcomes, skip and reduced-motion behavior. |
| F. Audio, pacing, difficulty and QoL | M4 | QUEUED | Guard-light, no-guard and Easy balance routes have simulation evidence; offense now competes with guarding for Ki value. Original arrangement/mix work, listening approval, pacing and QoL are queued. |
| G. Performance, release, campaign QA and sign-off | M5 | QUEUED | Browser build, Windows app folder and preview ZIPs are refreshed; Electron smoke passed 13/13; late routes have reached credits. Full release verification and human sign-offs are queued. |

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
- [ ] Add deliberate camera/framing/dialogue-expression/hold/music transitions across the remaining 9 of 15 cutscene definitions; the six scenes that already contain keyframes still need continued direction. Keep canonical form unlock order, scene replay and reduced-motion/skip behavior correct.
- [ ] Continue cinematic direction: the shared renderer now adds letterbox framing to authored scenes and a restrained push across existing candidate keyframes, with reduced-motion and skip paths. Batch E includes the remaining nine cutscenes, transformation spectacle and battle-flow smoothing; seven candidate stills still require human approval.
- [ ] Capture all 15 stories and major transitions in their real triggered story flow, not by injected campaign flags.

### M4 â€” Audio, balance, pacing and QoL

- [x] Retain offline synthesized audio, gesture unlock, saved sliders and music crossfades; existing automated checks pass.
- [x] Reduce guard repetition: one successful timing input covers a full enemy multi-hit move against one hero, and selected bosses no longer receive a second full action every round.
- [x] Balance offense against the defensive Guard action: basic attacks now restore 6 Ki (up from 3), while Guard restores 6 (down from 8); both choices fund techniques equally, and the attack also deals damage. Unit coverage verifies the tradeoff; campaign policy runs still clear all six no-guard Normal seeds with two retries each.
- [x] Fix G05's threshold to match its stated 50% objective. Normal policy test: a route with 10% perfect, 25% good and 65% missed guards clears all six deterministic seeds (five with 0 defeats, one with 4); ordinary average and attentive routes also clear. No-guard Easy clears six seeds.
- [x] Improve no-guard Normal viability without flattening the full challenge: routine untelegraphed hits no longer force a timing prompt, missed/omitted guards get a modest passive brace, and charged/telegraphed/multi-hit/heavy attacks retain Active Guard. Six no-guard Normal natural-progression campaign seeds now reach credits (two retries each); attentive, average, occasional-guard and no-guard Easy policies also clear all six seeds.
- [ ] Audit travel/read time, encounter spacing, quest motivation, skill/equipment viability, healing/shop economy, formations, status/counter clarity and all three postgame simulations.
- [ ] Consider optional accessible climax input and QoL assists, while preserving skip and timing accessibility.
- [ ] Review original theme/effects in the actual app, set measured mix targets, align sound with impacts and preserve offline behavior. **Listening/mastering sign-off is human.**

### M5 â€” Release, verification, and delivery

- [x] Current browser build, typecheck, lint, 580-test unit/integration suite, asset audit, runtime-path audit and late-story browser run pass at this checkpoint.
- [x] Refresh Windows Electron folder, browser/source/art-source archives and checksum manifest; all four ZIPs pass integrity inspection; all 536 archived source checksums verify.
- [x] Current Electron smoke: 13/13, including save persistence after relaunch in an isolated app-data directory.
- [ ] Run a fresh, normal-progression New Game-to-credits browser playthrough on the final build; include an ordinary imperfect-guard Normal policy and a low-skill Easy policy.
- [ ] Verify all 29 battles, 10 quests, 12 maps, 15 cutscenes, all 84 skills/loadouts, save recovery, all postgame simulations and critical accessibility paths on the final build.
- [ ] Capture actual current-game title/UI/map/battle/cinematic/credits/postgame evidence and inspect 3 viewport sizes; resolve baseline browser harness render limitations where possible.
- [ ] Profile texture count, memory, asset decode, load time, sustained FPS and frame spikes on modest Windows hardware or mark unavailable.
- [ ] Verify zero external runtime requests, clean extraction/launcher startup and save location. **Clean-PC and physical controller checks are human-only.**
- [ ] Update every RC1/RC2 report so no historical result reads as current approval; include exact commands, failures and owner review steps.
- [ ] Obtain human gameplay, art, audio, hardware controller and clean-PC sign-off. Until then mark these gates **HUMAN / PENDING**, never automated PASS.

## Batch publishing rule

Per the owner's latest instruction, commit and push only after a batch's implementation and stated verification have passed. Keep each commit scoped to that batch, preserve existing source/generated PNG provenance, and do not deploy or publish a release. If a batch fails its exit checks, fix it before committing/pushing.
