# AOTS3 overhaul execution checklist

This is the working source of truth for completing `aots3-cell-saga-codex-complete-gameplay-visual-experience-overhaul.md`. It separates the already playable RC baseline from the requested game-feel/art overhaul. Update a checkbox only when its evidence exists; human-only checks remain pending until a person does them.

**Status key:** `DONE` = implemented and verified; `PARTIAL` = useful work exists but exit criteria remain; `NEXT` = next batch; `OPEN` = not completed; `HUMAN` = cannot be truthfully completed by automation.

**Current overall status:** the campaign and core systems are already playable, but the complete visual/gameplay overhaul is not finished. Overhaul completion is still **below half**: the art, combat animation, all-region refresh, audio, accessibility/balance and human finish-quality criteria are substantially open. Do not translate test count, game feature coverage, or package availability into an overhaul-completion percentage.

## Batch sequence

| Batch | Milestone | Status | Exit evidence |
|---|---|---|---|
| A. Baseline audit and art bible | M0 | PARTIAL | Baseline screenshot/audit, art spec and provenance ledger exist. Complete the unified before/after set, inspect all new generations in-game and obtain human review. |
| B. Ginger Town + Gohan vs Perfect Cell pilot | M1 | PARTIAL | Ginger Town mist/props/battle panorama and Cell Games presentation work exist; finish the full pilot capture matrix and resolve remaining terrain repetition. |
| C. Combat feel and battle UI | M2 | PARTIAL | Battle presentation handles registered VFX, action-specific effect families, hit timing, lifecycle cleanup, beams and finale staging. Active Guard prompts are now reserved for charged, telegraphed, multi-hit and heavy attacks; routine hits are passive-braced. Normal supports both 35%-success and no-guard policies across six full-campaign simulated seeds. Expand accurate action clips across all 84 skills, finish special effects and refine the combat UI. |
| D. Twelve-region exploration and battle stages | M3 | PARTIAL | All maps remain reachable; Ginger Town has a new mist layer, varied abandoned props and a full battle panorama. Refresh the other 11 regions and remaining battle backdrops, inspect each in motion with interactions visible, and preserve collision/trigger geometry. |
| E. Cinematics and story transitions | M3 | PARTIAL | Seven candidate keyframes are integrated at their story beats and four late-game frames have real-browser captures. Direct the remaining nine cutscenes plus transitions; capture Trunks and Android absorption images in-game. |
| F. Audio, pacing, difficulty and QoL | M4 | PARTIAL | The guard-light 35%-success Normal profile completes six sim seeds and a late real-browser route with zero defeats. The updated no-guard Normal profile completes six full-campaign seeds, with two retry defeats per run. Audio structure is tested, but original arrangement/mix work and listening approval remain. Continue pacing, viability, assist and postgame checks. |
| G. Performance, release, campaign QA and sign-off | M5 | PARTIAL | Browser build, Windows app folder and four preview ZIPs are refreshed; ZIPs are intact; Electron smoke passed 13/13. Attentive and guard-light late browser routes reach credits. Complete fresh-start, UI/device, all-map/skill/postgame, performance and human sign-offs before calling this done. |

## Acceptance ledger

### M0 — Baseline, source, and art bible

- [x] Inspect the AOTS3 working tree, baseline docs, runtime registry, real game screenshots and usable source art; keep Namek read-only.
- [x] Record baseline defects and preserve existing deterministic combat, story, save namespace, map geometry and strong title/actor assets.
- [x] Create the baseline audit, art-style specification, provenance ledger, reproducible artwork tooling and source-art archive.
- [ ] Finish a single well-indexed before/after capture set for title, dialogue, target selection, battle states, transformation, credits and postgame.
- [ ] Verify every new generation/refinement against installed AOTS3 identity references in-game; reject style/alpha/clipping defects.
- [ ] Maintain candidate vs derived vs human-approved labels. **Human art approval remains pending.**

### M1 — Real pilot slice: Ginger Town + Gohan vs Perfect Cell

- [x] Keep both slices in the actual game, real maps/encounters, real cutscenes and real battle engine.
- [x] Add a native-generated Ginger Town battle panorama and drifting mist; retain generated sources and reproducible installation.
- [x] Improve the two major Cell Games moments with native-generated candidate keyframes and in-engine finale staging.
- [ ] Capture/inspect the complete pilot set: ordinary melee, multi-hit, charged beam, hit reaction, missed hit, guard result, target move, victory, exploration, dialogue, NPC interaction and relevant cutscene.
- [ ] Refine Ginger Town's repetitive terrain/house composition and review the full Gohan vs Cell battle at normal, reduced-motion and alternate viewport settings.

### M2 — Systemwide combat and interaction

- [x] Keep hit timing, deterministic outcomes, target following, scene-clock cleanup, reduced motion and battle-speed behavior in the existing systems.
- [x] Use the selected skill VFX family, typed registered VFX, beam travel and bespoke Father-Son staging; verify all 84 skill/combo/rage VFX registry references.
- [x] Make a multi-hit enemy move one guard timing input per defender for its whole hit string; only charged, telegraphed, multi-hit or heavy attacks trigger Active Guard; routine hits receive a modest passive brace; reduce enemy double-turn frequency for Android 17, Android 18 and Perfect Cell.
- [ ] Map all 84 skills to accurate action family and distinct signature cues; record phase timings and verify no damage/sound precedes contact.
- [ ] Complete melee anticipation, lane-aware approach, swing/contact, recoil, recovery and return; verify misses, immunity, criticals, counters, absorption, guard, heals, buffs and telegraphs.
- [ ] Add truthful temporal clips for important variant-only VFX. Never treat unrelated variants as a sequence.
- [ ] Refine battle command dock, statuses, costs, cooldown/disabled explanations and targeting affordances for keyboard, mouse and controller.
- [ ] Exercise title, settings, party, inventory, skills, journal, shops, save/load, rewards, defeat/retry, help and postgame UI at 1024x600, 1280x720, 1920x1080 and a narrow desktop size.
- [ ] Regress dialogue click/typewriter double-dispatch, menus, focus, hit timing, guard cue windows and scene teardown.

### M3 — All maps, props and story cinematics

- [x] Keep all 12 map collision/layout/quest/story trigger contracts intact; Ginger Town now has atlas-derived grass, damaged-lot and curb tiles, a calm seamless asphalt fill, atmosphere, nonblocking prop variety and full battle-stage art. Its latest production capture is `tests/logs/screens/polish/gingertown-after.png` (browser errors: 0; external requests: 0).
- [ ] Generate/refine and integrate coherent per-region layered art for the other 11 maps; verify seams, depth, feet anchors, paths, lighting, weather and NPC prompts in Phaser. Follow-up ground pass now covers Capsule Corp ground variants and South City asphalt plus its previously missing fountain plaza; region-wide geometry, props and depth still need review.
- [x] Integrate regional battle backgrounds across all 12 maps, with opaque scenic images and deterministic stage-ID variant selection where a region has multiple scenes. Handoff artwork is now integrated for Ginger Town, Future Landing (4 weather/time variants), Rocky Outskirts (6 variants), South City (intact/ruined), Capsule Corp, Android Island (2 variants), both Cell Games regions, Gero Mountain (2 views), Gero Lab, Kami's Lookout, and the Time Chamber. Human scene/contrast review remains pending.
- [ ] Review save/heal/shop/chest state and sizing in all contexts, including chest persistence after save/load.
- [x] Integrate candidate stills for Trunks defeating Frieza, Android 17/18 absorptions, Android 16 destruction, SSJ2 awakening, Goku sacrifice and Father-Son finale.
- [ ] Add deliberate camera/framing/dialogue-expression/hold/music transitions across the remaining 9 of 15 cutscene definitions; the six scenes that already contain keyframes still need continued direction. Keep canonical form unlock order, scene replay and reduced-motion/skip behavior correct.
- [ ] Capture all 15 stories and major transitions in their real triggered story flow, not by injected campaign flags.

### M4 — Audio, balance, pacing and QoL

- [x] Retain offline synthesized audio, gesture unlock, saved sliders and music crossfades; existing automated checks pass.
- [x] Reduce guard repetition: one successful timing input covers a full enemy multi-hit move against one hero, and selected bosses no longer receive a second full action every round.
- [x] Fix G05's threshold to match its stated 50% objective. Normal policy test: a route with 10% perfect, 25% good and 65% missed guards clears all six deterministic seeds (five with 0 defeats, one with 4); ordinary average and attentive routes also clear. No-guard Easy clears six seeds.
- [x] Improve no-guard Normal viability without flattening the full challenge: routine untelegraphed hits no longer force a timing prompt, missed/omitted guards get a modest passive brace, and charged/telegraphed/multi-hit/heavy attacks retain Active Guard. Six no-guard Normal natural-progression campaign seeds now reach credits (two retries each); attentive, average, occasional-guard and no-guard Easy policies also clear all six seeds.
- [ ] Audit travel/read time, encounter spacing, quest motivation, skill/equipment viability, healing/shop economy, formations, status/counter clarity and all three postgame simulations.
- [ ] Consider optional accessible climax input and QoL assists, while preserving skip and timing accessibility.
- [ ] Review original theme/effects in the actual app, set measured mix targets, align sound with impacts and preserve offline behavior. **Listening/mastering sign-off is human.**

### M5 — Release, verification, and delivery

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
