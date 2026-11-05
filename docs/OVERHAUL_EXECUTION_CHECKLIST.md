# AOTS3 overhaul execution checklist

This is the working source of truth for completing `aots3-cell-saga-codex-complete-gameplay-visual-experience-overhaul.md`. It separates the already playable RC baseline from the requested game-feel/art overhaul. Update a checkbox only when its evidence exists; human-only checks remain pending until a person does them.

**Status key:** `DONE` = batch implementation and exit evidence complete; `ACTIVE` = current batch; `NEXT` = next batch; `QUEUED` = later batch; human-only approvals are tracked separately as `HUMAN / PENDING`.

**Current overall status:** Batches A and B are complete with technical evidence. Batch C (combat feel and battle UI) is next. The complete visual/gameplay overhaul is not finished; art/gameplay/audio and human finish-quality gates remain. Do not translate test count, game feature coverage, or package availability into an overhaul-completion percentage.

## Batch sequence

| Batch | Milestone | Status | Exit evidence |
|---|---|---|---|
| A. Baseline audit and art bible | M0 | DONE | Unified before/after set is indexed; the 30-beat Normal route completed with 34 wins, 0 defeats, 12 map captures, seven actual keyframe triggers, no browser errors and no external requests. Complete source/registry audits and the full rebuild pass. Human art approval is listed separately as pending. |
| B. Ginger Town + Gohan vs Perfect Cell pilot | M1 | DONE | Native-generated evacuation shuttle, playable cellar rescue/follower/evacuation, atlas ground variation, coherent Cell Husk stage floor, captured/inspected quest flow and battle actions, and normal plus reduced-motion compact G05 views. |
| C. Combat feel and battle UI | M2 | QUEUED | Battle presentation handles registered VFX, action-specific effect families, hit timing, lifecycle cleanup, beams and finale staging. More authored attack identity, animation, timing and UI refinement are queued. |
| D. Twelve-region exploration and battle stages | M3 | QUEUED | All 12 regional battle backgrounds are integrated. Ginger Town has mist and varied props; Capsule Corp, Rocky Outskirts and South City have ground refinements; four generated landmark props and natural-path orientation variety are integrated. Region-wide content/depth work is queued. |
| E. Cinematics and story transitions | M3 | QUEUED | Seven candidate keyframes are integrated and captured at their real story beats. Shared framing/push and reduced-motion/skip behavior exist; remaining cutscenes and transition direction are queued. |
| F. Audio, pacing, difficulty and QoL | M4 | QUEUED | Guard-light, no-guard and Easy balance routes have simulation evidence; offense now competes with guarding for Ki value. Original arrangement/mix work, listening approval, pacing and QoL are queued. |
| G. Performance, release, campaign QA and sign-off | M5 | QUEUED | Browser build, Windows app folder and preview ZIPs are refreshed; Electron smoke passed 13/13; late routes have reached credits. Full release verification and human sign-offs are queued. |

## Acceptance ledger

### M0 — Baseline, source, and art bible

- [x] Inspect the AOTS3 working tree, baseline docs, runtime registry, real game screenshots and usable source art; keep Namek read-only.
- [x] Record baseline defects and preserve existing deterministic combat, story, save namespace, map geometry and strong title/actor assets.
- [x] Create the baseline audit, art-style specification, provenance ledger, reproducible artwork tooling and source-art archive.
- [x] Finish a single well-indexed before/after capture set for title, dialogue, target selection, battle states, transformation, credits and postgame. Credits and postgame include the existing UI/device limitation note.
- [x] Verify every current generation/refinement against installed AOTS3 identity references in-game; reject style/alpha/clipping defects. The pavilion v1 fringe was rejected and replaced by the captured v2; final registry/build audits are clean.
- [x] Maintain candidate vs derived vs human-approved labels. **Human art approval remains separately HUMAN / PENDING.**

### M1 — Real pilot slice: Ginger Town + Gohan vs Perfect Cell

- [x] Keep both slices in the actual game, real maps/encounters, real cutscenes and real battle engine.
- [x] Add a native-generated Ginger Town battle panorama and drifting mist; retain generated sources and reproducible installation.
- [x] Improve the two major Cell Games moments with native-generated candidate keyframes and in-engine finale staging.
- [x] Capture/inspect the complete pilot set: ordinary melee, multi-hit, charged beam, hit reaction, missed hit, guard result, target move, victory, exploration, dialogue, NPC interaction and relevant cutscene. Evidence is indexed in `docs/OVERHAUL_VISUAL_EVIDENCE_INDEX.md`.
- [x] Refine Ginger Town's repetitive terrain/house composition and review Gohan vs Cell at the normal 1280x720 view and a reduced-motion 1024x600 compact view. Dialogue and escort captures show the text fully typed and the follower separated from the player at the shuttle.

### M2 — Systemwide combat and interaction

- [x] Keep hit timing, deterministic outcomes, target following, scene-clock cleanup, reduced motion and battle-speed behavior in the existing systems.
- [x] Use the selected skill VFX family, typed registered VFX, beam travel and bespoke Father-Son staging; verify all 84 skill/combo/rage VFX registry references.
- [x] Make a multi-hit enemy move one guard timing input per defender for its whole hit string; only charged, telegraphed, multi-hit or heavy attacks trigger Active Guard; routine hits receive a modest passive brace; reduce enemy double-turn frequency for Android 17, Android 18 and Perfect Cell.
- [ ] Map all 84 skills to accurate action family and distinct signature cues; record phase timings and verify no damage/sound precedes contact.
- [ ] Continue visual validation from `docs/COMBAT_PRESENTATION_MAP.md`: the generated map covers all 84 core techniques plus Rage Arts and combos, and tests verify every effect reference is registered. Physical generic specials now resolve to heavy presentation; flare cues target selected or all affected opponents. Per-skill family/signature correctness and phase timing remain incomplete.
- [ ] Continue the all-skill presentation map: physical `special` clips now resolve to a close-range heavy animation; Ki specials retain projectile presentation. `flare` now uses its skill-authored VFX, countered physical hits lunge into contact, and aura-family attacks stage aura plus target impact. This is a partial family pass, not completion of all 84 mappings.
- [ ] Complete melee anticipation, lane-aware approach, swing/contact, recoil, recovery and return; verify misses, immunity, criticals, counters, absorption, guard, heals, buffs and telegraphs. Miss events now carry hit index/count; evades sidestep, and the attacker recovers home after the last miss. Real P01 capture: `tests/logs/screens/combat-vfx/miss-evasion-contact.png`. Full multi-skill outcome coverage remains open.
- [ ] Add truthful temporal clips for important variant-only VFX. Never treat unrelated variants as a sequence. The common `impact-hit` cue now uses a four-stage native-generated contact burst; beam projectile heads now advance through every authored ordered-growth frame during their existing travel window, while variant-only beams remain static and reduced motion suppresses frame cycling. A real fresh-game P01 Burning Attack capture at `tests/logs/screens/combat-vfx/beam-growth-travel.png` confirms the gold beam is visible before the displayed target HP changes, with 0 browser errors and 0 external requests. The beam charge cue was reduced to preserve Trunks' silhouette, and the beam core now follows the registered VFX palette. Most other variant-only VFX still remain single-frame pulses.
- [ ] Refine battle command dock, statuses, costs, cooldown/disabled explanations and targeting affordances for keyboard, mouse and controller.
- [ ] Continue HUD refinement: skill rows now label Ki/HP/Rage costs, combo rows show per-partner Ki, Rage and Sparking name their Rage costs, and target HP shows current/max. The focused browser test covers these cost labels and existing keyboard target/back/confirm paths; finish cooldown/disabled explanations, broader device/viewport QA and remaining dock/status polish.
- [ ] Exercise title, settings, party, inventory, skills, journal, shops, save/load, rewards, defeat/retry, help and postgame UI at 1024x600, 1280x720, 1920x1080 and a narrow desktop size.
- [ ] Regress dialogue click/typewriter double-dispatch, menus, focus, hit timing, guard cue windows and scene teardown.

### M3 — All maps, props and story cinematics

- [x] Keep all 12 map collision/layout/quest/story trigger contracts intact; Ginger Town now has atlas-derived grass, damaged-lot and curb tiles, a calm seamless asphalt fill, atmosphere, nonblocking prop variety and full battle-stage art. Its latest production capture is `tests/logs/screens/polish/gingertown-after.png` (browser errors: 0; external requests: 0).
- [ ] Generate/refine and integrate coherent per-region layered art for the other 11 maps; verify seams, depth, feet anchors, paths, lighting, weather and NPC prompts in Phaser. Follow-up passes now cover Capsule Corp ground variants, Rocky Outskirts soil/path tiles, South City asphalt/fountain plaza, transparent generated props for the Future Landing scout ship, Ginger Town time machine, Android Island pavilion, Lab Interior broken incubation pod and Mountain Lab broken weather monitor, plus deterministic natural-path orientation variety in Ginger Town, Future Landing, Rocky Outskirts, Mountain Lab and Android Island. The Lab Interior prop was captured in Phaser using a test-only map fixture at `tests/logs/screens/world-refresh/lab-inner-broken-pod.png` (0 page errors, 0 external requests, 0 missing runtime props); the Mountain Lab monitor now has its own earned-save map fixture and capture at `tests/logs/screens/world-refresh/mountain-lab-broken-weather-monitor.png` (0 page errors, 0 external requests). Both decorative props remain walkable in collision tests. Nine regions still need coherent ground/prop passes and region-wide depth review. Landing Future and Rocky Outskirts were also inspected in real-browser captures with no browser errors.
- [x] Integrate regional battle backgrounds across all 12 maps, with opaque scenic images and deterministic stage-ID variant selection where a region has multiple scenes. Handoff artwork is now integrated for Ginger Town, Future Landing (4 weather/time variants), Rocky Outskirts (6 variants), South City (intact/ruined), Capsule Corp, Android Island (2 variants), both Cell Games regions, Gero Mountain (2 views), Gero Lab, Kami's Lookout, and the Time Chamber. Human scene/contrast review remains pending.
- [ ] Review save/heal/shop/chest state and sizing in all contexts, including chest persistence after save/load.
- [x] Integrate candidate stills for Trunks defeating Frieza, Android 17/18 absorptions, Android 16 destruction, SSJ2 awakening, Goku sacrifice and Father-Son finale.
- [ ] Add deliberate camera/framing/dialogue-expression/hold/music transitions across the remaining 9 of 15 cutscene definitions; the six scenes that already contain keyframes still need continued direction. Keep canonical form unlock order, scene replay and reduced-motion/skip behavior correct.
- [ ] Continue cinematic direction: the shared renderer now adds letterbox framing to authored scenes and a restrained push across existing candidate keyframes, with reduced-motion and skip paths. This does not count as direction of the remaining nine cutscenes or approval of the seven candidate stills.
- [ ] Capture all 15 stories and major transitions in their real triggered story flow, not by injected campaign flags.

### M4 — Audio, balance, pacing and QoL

- [x] Retain offline synthesized audio, gesture unlock, saved sliders and music crossfades; existing automated checks pass.
- [x] Reduce guard repetition: one successful timing input covers a full enemy multi-hit move against one hero, and selected bosses no longer receive a second full action every round.
- [x] Balance offense against the defensive Guard action: basic attacks now restore 6 Ki (up from 3), while Guard restores 6 (down from 8); both choices fund techniques equally, and the attack also deals damage. Unit coverage verifies the tradeoff; campaign policy runs still clear all six no-guard Normal seeds with two retries each.
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
