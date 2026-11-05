# ATTACK OF THE SAIYANS III — CELL SAGA
## ONE-SHOT CODEX MASTER PROMPT — COMPLETE GAME FEEL, ART, ANIMATION, STORY, AUDIO & RELEASE OVERHAUL

> **Task type:** Execute the actual end-to-end implementation, not a proposal, mockup, audit-only response, or collection of prompts.
>
> **Target:** The existing, playable **Attack of the Saiyans III — Cell Saga** (AOTS3), **not** Attack of the Saiyans II / Namek Saga.
>
> **Primary baseline:** The most recent project/repository available locally, corresponding to the uploaded archive `dragon-ball-AOTS-3-main(1).zip` (November 2026 baseline). The GitHub repository `https://github.com/PhoenixKola/dragon-ball-AOTS-3.git` may be useful for locating it, but **do not pull/overwrite unreviewed local changes** or assume that `main` is newer than the supplied archive.
>
> **Owner's goal:** The game is functionally complete but does not *feel* like a polished RPG. Make the entire New Game → credits → postgame experience substantially more enjoyable, responsive, beautiful, coherent, cinematic, and satisfying. **Deliver the finished code and assets.**

---

## 0. NON-NEGOTIABLE EXECUTION RULES

1. **Work on the actual existing AOTS3 source.** Begin by checking the current working tree, reading `CLAUDE.md`, `README.md`, `docs/FINAL_PASS_NOTES.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/ART_USAGE_MANIFEST.md`, and the runtime art registry. Inspect the executable game in a browser *before* deciding what to replace. Use code and real rendered evidence, not assumptions based on prior reports.
2. **Do not start over.** Preserve the deterministic combat engine, real encounter and story sequence, save identity and namespace (`aots3.cell.v1.*`), 7 heroes, 84 skills, 12 map regions, quest/story triggers, tested gameplay rules and Windows packaging. Refactor presentation systems as needed; do not gratuitously reimplement the game.
3. **Do not touch AOTS2 Namek Saga.** Treat the older game and its saves as read-only references if available. The existing AOTS3 working directory is the only write target.
4. **Do not commit, push, publish, deploy, upload repository contents, change remotes, or change production/cloud settings.** Leave all edits in the local working tree for owner review. Do not remove the existing Git history or ignore patterns without good reason.
5. **Actually use image generation.** Codex supports image generation in compatible signed-in experiences. Where available, use its **native image-generation capability** to produce real PNG artwork and useful variations, then clean/slice, integrate, inspect in Phaser, and iterate. Merely drawing placeholder geometric shapes in Python/Canvas/SVG is **not** an acceptable substitute for final visual artwork.
6. **No unapproved payments.** Work while signed into Codex with the owner's **ChatGPT account and included plan usage**. **Never** configure or use a separately billed OpenAI API key, external image service, paid generator, purchased credits, subscriptions, automatic credit top-ups, or any billable third-party service without prior explicit user authorization. If native image generation is unavailable, rate-limited, or access is exhausted, do not secretly switch to paid API usage: finish the engineering that can be done, track blocked art accurately, and continue whenever a permitted tool becomes available. Do not claim infinite free usage. Check the current account/usage controls when needed.
7. **No fake QA.** Never claim a human playtest, hardware gamepad check, clean-PC installer test, or audio listening test unless somebody actually performed it. Do not inject win flags, skip mandatory stages, grant artificial XP, or alter the difficulty for a supposedly authentic playthrough. Keep test-only fixtures isolated from release gameplay.
8. **Be implementation-heavy.** Spend most of the work modifying the real TypeScript, React, Phaser, CSS, art-generation tooling and assets. Do targeted tests as implementation proceeds; reserve expensive full campaign runs, exhaustive screenshots, performance sweeps, and release packaging for integration checkpoints and final sign-off. Still run any critical regression tests immediately when combat rules, story progression, save migrations, or input safety change.
9. **This is one master instruction for the whole job.** Execute all workstreams in sequence with useful local checkpoints; do not stop after an audit or proof of concept. Avoid repeated permission questions for ordinary implementation choices. Make the best justified decisions from evidence. If limitations prevent completion, deliver the best executable state plus a precise blocked-items ledger, never a false 'finished' claim.
10. **Private, offline fan-made game.** Keep runtime offline, preserve the existing project framing, do not fetch copyrighted soundtrack recordings or redistribute third-party proprietary game assets without permission. Make original musical and UI/VFX work where possible.

---

## 1. SOURCE-SPECIFIC STARTING POINT (VERIFIED IN THE LATEST ZIP)

The current project is **React 19.1 + TypeScript 5.9 + Phaser 3.90 + Vite 6.3**, with Electron 38 packaging available. The archive contains, among other things:

- `src/engine/scenes/BattleScene.ts` — main Phaser battle presentation, actor poses, camera effects, VFX, hit feedback, guard visuals, background composition.
- `src/engine/combat/director.ts`, `engine.ts`, `commands.ts`, `guard.ts`, `rage.ts` — authoritative event sequencing, battle logic, Active Guard timing, commands and transformations. **Preserve deterministic rules and event contracts.**
- `src/components/BattleHUD.tsx` — React battle UI, turn/target choices, commands, ability icons, active guard feedback.
- `src/components/dialogue.tsx`, `menu.tsx`, `screens.tsx`, `shop.tsx` — dialogue, main UI and menus.
- `src/engine/scenes/WorldScene.ts`, `src/data/maps/{builder,mapsA,mapsB,mapsC}.ts` — terrain, props, walking, collisions and interactions for the 12 maps.
- `src/engine/scenes/CutsceneScene.ts`, `src/data/cutscenes.ts` — cinematic in-engine sequences, dialogue and stage beats.
- `src/engine/audio/` — synthesized audio, music routing and effects; start-gesture audio unlock already exists.
- `src/data/artRegistry.generated.json`, `src/data/artTypes.ts`, `tools/build_art.py`, `tools/art_vfx.py`, `tools/art_worlds.py`, `tools/art_heroes.py`, `tools/art_icons.py`, `tools/audit_assets.py` — runtime art registry and art build workflow.
- `tests/unit`, `tests/integration`, `tests/e2e` — existing verification. A previous release recorded **578 passing tests**, but that is a historical result, not proof of this new overhaul.
- `electron/main.cjs`, `tools/pack_windows.mjs`, `START_GAME.bat` — offline PC delivery.

Important evidence in `docs/KNOWN_LIMITATIONS.md` / `docs/FINAL_PASS_NOTES.md`:

- The source archive contains generated runtime artwork; **`art/source`, `art/handoff`, `art/patch` were intentionally Git-ignored**, so source sheets may be missing in a fresh checkout. Check first; reuse separately supplied art bundles only if available. Do not assume they are in the repository.
- Some effects in `tools/art_vfx.py` are explicitly marked **`variants_not_sequence`**: visual variants are not genuine temporal animation frames. Correct this systemic issue rather than just increasing the number of PNGs.
- Many characters/forms/NPCs use art labeled derived/procedural; no recorded universal human art sign-off.
- The campaign has 29 fights plus scripted noncombat beats, 12 maps, 7 heroes, 84 skills, 10 quests, and 15 in-engine cutscene sequences. **Preserve that coverage.**
- The code has functional compact commands, targeting, dialogue click fixes and a title music request, but the **quality of their experience** is the issue; do not call a feature polished merely because the code path exists.
- The Normal route with no Active Guard has a documented late-game difficulty wall. Audio was structurally tested but not approved by listening; gamepad and clean-PC QA were not independently checked by a human.

Before modifying files, generate a concise **baseline quality audit** with (a) 10–20 actual screenshots covering title, world, dialogue, menus, ordinary and boss battle, targeting, transformation, cutscene, credits and postgame, (b) a short list of strongest existing elements worth preserving, (c) observable pain points mapped to code and (d) an inventory of already-usable, derived, duplicated, mismatched and missing art. Do not spend the whole task on this audit.

---

## 2. CREATIVE DIRECTION: A CONSISTENT, PREMIUM 2D PIXEL-ART JRPG

The style should feel like a cohesive, polished successor to **Attack of the Saiyans II — Namek Saga**, and consistent with AOTS3's strongest existing character sprite sheets. We have repeatedly rejected giant multi-character collages, random geometric sprites, unrelated art styles, embedded headings on sprites and inconsistent proportions.

**Art bible to establish and enforce first:**

- Detailed readable **16-bit-inspired / modern high-quality pixel art**, with confident dark outlines, controlled cel/pixel shading, vivid but disciplined palettes, consistent face construction, cloth shading, hair, armor, character scale, pose silhouettes and feet anchors.
- **One character / one form / one well-defined sheet** where possible, rather than seven characters mixed together. Each game-ready sheet should contain only the relevant subject and approved poses. **No captions, headers, watermarks, labels, panels, decorative borders, unrelated scenery or copied neighbor pixels inside exported sprite sheets.**
- Genuine **transparent RGBA PNG** for characters, portraits, VFX, props and icons; environmental floor layers or full scenic backdrops can be opaque. Black-looking transparent previews are not proof of alpha; inspect actual alpha channels.
- Use clean pixel grids and nearest-neighbor filtering, never blurry resized art. Respect character scale and animation anchors. No frame-to-frame eye drift, anatomy mutation, costume swaps, inconsistent hair styles, floating feet or repeated filler frames passed off as movement.
- For an existing actor, **study its installed source/runtime sheet before generating any replacement** and preserve identity. Goku must look like Goku, base/SSJ/SSJ2 appearances and clothing must remain distinct, and forms must unlock in the same story order. No unnecessary redesigns.
- The existing AOTS2 naming/layout can be referenced if available (roughly eight essential combat poses plus directional overworld frames and a portrait), but generate the **actual animation frames** needed for fluidity separately from static pose variants. Don't request an absurd number of decorative images per actor.
- Clearly separate **battle sprites**, **overworld four-direction sets**, **dialogue portraits**, **animated VFX**, **tilesets**, **battle stage backgrounds**, **story keyframes** and **UI icons**.
- Establish technical specs from real AOTS3 assets: native frame resolution, transparent padding, alpha-fringe removal, baseline, pivots, collision/feet anchor, render scaling, orientation, frame naming, timing, export format and file-size budget. Keep these specs in a living `docs/ART_STYLE_AND_ANIMATION_SPEC.md` and machine-readable manifest.
- Every image-generation request should include **actual approved visual references** (available installed Goku, Gohan, Vegeta, Piccolo, Trunks, enemy and VFX samples), exact form/costume, pose list, no-text rule, transparency requirement and target dimensions. Generate controlled variations, inspect consistency, reject failures, and refine only failures.
- **Do not replace solid existing work merely to increase the asset count.** Preserve the strongest installed assets. Upgrade only what fails quality checks or produces poor in-game results.

### Required native Codex art workflow

For each missing/weak asset family: **inspect reference → define shot/poses and art spec → image-generate (if native tool is available) → visually inspect output → refine/regen rejects → isolate PNGs and backgrounds → crop and normalize pivot/scale → build actual frame sequence/atlas → integrate in real Phaser/React scene → capture actual game screenshot/video frames → fix artifacts → register asset source and status → targeted tests.**

A contact sheet is **not** a finished animation; a sprite existing on disk is **not** proof it is visible in game. Inspect individual frames. A polished game matters more than the number of generated images.

### Source preservation and reproducibility

- Keep original generated outputs and source sheets in a sensible local `art/source` or `art/production` hierarchy, distinct from `public/assets` runtime exports. Record provenance, frame boundaries, clipping, roles, generation notes and approval status.
- Existing ignored raw art can remain out of Git if size warrants, but **the finished deliverable must also contain a separate art-source archive**, exact reproducible asset generation instructions, checksums and manifests so another developer can rebuild every runtime asset. Do not silently drop source PNGs.
- Validate PNG integrity, alpha, bounding boxes, 8-way pose completeness where relevant, directional walk cadence, no clipping/sheet bleed, sensible frame count, sensible per-frame offsets and runtime fallback behavior.
- If image generation truly cannot run, **do not fake generated artwork**. Implement improved animations/UX using legitimate installed art, track exactly what is awaiting image generation and distinguish complete from blocked.

---

## 3. IMPLEMENTATION STRATEGY — PROOF OF QUALITY, THEN FULL CAMPAIGN

Complete the entire overhaul via these **six workstreams, in this dependency order**. The first implementation checkpoint is a **real vertical slice**:

**Pilot slice:** the **Gohan vs. Perfect Cell** encounter (not a fake isolated concept scene) plus exploration/dialogue in **Ginger Town**. Upgrade those using the real battle engine, real saves, real encounters, real NPC and map collision code. They establish camera grammar, timing, texture style, UI density, audio and interaction quality for the rest of the game. Record actual before/after captures and a prioritized defect list. **Then roll these systems through every other area and ability**; do not stop after the pilot and do not ask the owner to approve each intermediate step unless an external authorization is genuinely required.

### Workstream 1 — Make combat feel fantastic

Develop or refactor a reusable **battle presentation/animation director** bridging authoritative events from `src/engine/combat/*` to Phaser visual sequences. Prefer reusable clips and composable effects; use custom beats for signature techniques. The combat simulation must remain deterministic even if playback is skipped, accelerated, paused or interrupted.

Mandatory:

- **Anticipation → execution → travel → contact → reaction → follow-through/recovery → settle** for actions. No instant static pose teleport / arbitrary fade / uncoordinated bounce as the default.
- Melee: lean/dash, approach correct enemy on the correct plane, distinct swing/punch/kick arcs, believable contact position, small appropriate hit-stop, accurate recoil/knockback, synchronized shadows/auras, smooth return to formation. Prevent sprites overlapping HUD or disappearing outside the camera.
- Beams/projectiles: charge frames, source attachment and direction, beam growth/travel/loop, persistent contact zone, hit spark/explosion, trail cleanup, light/camera response and recovery. The **Father–Son Kamehameha** needs bespoke dramatic staging.
- Multi-hit attacks: visible hit rhythms, multiple correct events, stable order, no duplicated fake damage or lingering projectile. Misses visibly miss, immunities are distinct, absorption works visually, critical hits have stronger but disciplined effects, blocking/guarding have accurate contact feedback. No damage number before its actual impact marker.
- Special actions: transformations, counters, Rage, Sparking, status effects, heals, revives, regen, guard and enemy telegraphs each have meaningful, noninterchangeable visual grammar.
- Proper animation source: build real frame sequences from approved sprite/VFX frames. Replace variant-pulses that pretend to be animations with actual temporal sequences where needed; no unrelated effects cycling as 'frames'.
- Tie duration to clip data and `battleSpeed`, honor reduced-motion settings, maintain readable Active Guard cue windows and prevent animation length from altering deterministic gameplay rules or input timestamps.
- Phaser camera: subtle punch-in, parallax, purposeful slow motion for rare finishers, disciplined shake amplitude, very brief hit-stop and crisp camera reset. No motion-sickness-inducing excess. Combine with synced audio.
- Robust asynchronous lifecycle: destroyed scenes, skipped animations, fast-forward, load/retry, transformation mid-sequence and battle end must cancel/resolve tweens/timers cleanly without stale references, freezes, race conditions or orphaned graphics.

**Coverage:** Every one of the existing 84 skill IDs maps to the correct behavior/effect *family* and signature-attack variants, even where shared family clips are justified. Confirm every skill has a visually accurate action cue and correct hit timing; don't generate 84 visually identical beams.

### Workstream 2 — Redesign battle UI and overall interaction

Rework `BattleHUD.tsx` and its CSS/UI assets into a cohesive **premium compact pixel-art JRPG combat shell**. Favor clarity over decorative volume.

- Beautiful but small icon-led command dock (Attack, Techniques, Items, Guard, Transform, Rage/Sparking etc. as permitted by the actual command model), stable four-slot technique bar, costs, cooldown/restrictions, status icons, tooltips and target affordances.
- Clean targeting as an **in-world marker on enemies**, not an oversized secondary popup. Make next/previous target, single/all-target differences, target HP/status, confirm/cancel and keyboard/controller focus unmistakable. Keep target cursor visually aligned even during motion.
- Ensure enemies and VFX stay visible behind HUD, appropriate HUD safe area, readable contrast, pixel-fitting, no truncated boss nameplate, no empty icons or accidental huge text.
- Hero order, active turn, team statuses, HP/Ki/Rage/Sparking, abilities and actions immediately legible. Use icon fallbacks intentionally; fix rather than mask missing icon mappings.
- Button down/hover/selected/disabled/locked states with purposeful audio and short animations; no input lag, focus trap, click-through, phantom clicks or menu state flicker.
- Test mouse, keyboard and controller navigation. Verify 1024×600, 1280×720, 1920×1080 and a narrow desktop window; honor 16:9 and atypical aspect ratios where feasible. Keep accessibility, contrast, reduced motion and scalable text.
- Apply the same professional visual language to **title screen, settings, party, inventory, skill loadouts, quests/journal, shop, save/load, victory/reward, defeat/retry, help and postgame screens**—without turning the RPG into a web dashboard.
- Thoroughly regression-test the previous user-reported **dialogue click causing remaining text to flash without advancing**, dialogue key/click double dispatch, missing menu icons, option controls that feel like raw HTML, overlay placement, fight menu size, targeting awkwardness, and cutscene/dialogue flicker. Do not reintroduce them.

### Workstream 3 — Make the 12 exploration regions feel like places

Upgrade **every region**, starting with Ginger Town, using real layered tiles/props and meaningful atmosphere while **preserving authored collision geometry, navigation, NPC trigger locations, chest persistence, map transitions and quest predicates**:

1. Future Landing Site
2. Capsule Corp
3. South City
4. Rocky Outskirts
5. Gero's Mountain Lab exterior
6. Lab Interior
7. Ginger Town
8. Android Island
9. Kami's Lookout
10. Hyperbolic Time Chamber (Room of Spirit and Time)
11. Cell Games Approach
12. Cell Games Arena

Required improvements:

- Cohesive biome-specific tilesets, seamless seams, terrain diversity, cliffs, rocks, paths, shadows, vegetation, city furnishings, interior machinery, atmospheric weather/light and distant backdrops. Make all twelve visually identifiable at a glance.
- Camera follow/inertia and motion tuned for crisp pixel sprites, movement responsiveness, correct walk animations, player occlusion/depth, exit discovery, spatial orientation and interaction prompts.
- Crisp four-direction walking for actors that need it; no big sprite scale jumps between world and battle; standardized pivots and proportion chart for all actors/transformations.
- Make save/heal/shop and treasure chest art visually coherent and properly sized; interactions must be obvious and post-open chests must remain empty after save/load. Do not insert fake icon panels on the map as objects.
- Unique environmental storytelling: evacuated Ginger Town, lived-in Capsule Corp, eerie Gero laboratory, isolated Time Chamber, tense Cell Games. Use small ambient changes, destructible/decorative details where safe, limited believable NPC behavior and visual signposting.
- Review exploration rhythm: avoid empty corridors, needlessly long walks and ambiguous routes. Improve navigation and quest guidance without changing mandatory story order or using auto-teleports to skip intended progression.
- Better ambient map sounds and correct music crossfades. No external network assets at runtime.
- Refresh each of the corresponding battle backdrops, including the finale, without changing battle arenas' logical encounter IDs.

**A map isn't finished just because a pretty sheet was assigned.** Capture and inspect the actual game at every location, in motion and with interactive entities visible.

### Workstream 4 — Cinematic Cell Saga storytelling

Improve the existing 15 cutscenes and all consequential story event transitions. Reuse `CutsceneScene.ts` and `src/data/cutscenes.ts` concepts, adding high-value camera/cutscene capabilities rather than replacing reliable story scripts.

Introduce a consistent cinematic language: controlled camera establishing shots, framing, purposeful cuts, eased pans, dialogue portrait expressions, character eye-lines, pause lengths, vignette/light, music cues, impact events and skip/fast-forward safety. Story beat timing must survive replay, save restoration and reduced motion.

Give particularly memorable direction to:

- Trunks arriving and defeating Mecha Frieza / King Cold.
- The three-year warning and Vegeta's SSJ debut.
- Androids waking, Piccolo/Kami assimilation.
- Cell's first appearance and absorption of Androids 17 and 18.
- Vegeta Ascended / Ultra Trunks' limitations and Room of Spirit and Time training.
- Goku vs Cell and his final sacrifice.
- Android 16's destruction and Gohan's SSJ2 awakening (**only at the correct canonical story event**).
- Cell Juniors, Gohan's rage, Cell's return as Super Perfect Cell.
- **Father–Son Kamehameha**, final impact, resolution, Trunks' departure and credits.

Generate **selected high-impact painted/pixel-art keyframes or overlays** where genuinely effective, but **do not force fifteen huge static comics** into the game, and do not litter the repository with rejected frames. Keep in-engine animation where it tells the story better. The player should still feel engaged rather than watching overlong cutscenes.

### Workstream 5 — Audio, game design, pacing, balance and progression

**Audio:** Review actual playback. The current `src/engine/audio/` synthesized soundtrack is useful infrastructure, not proof of musical quality. Create original coherent themes/arrangements and effects using available rights-safe tools and assets (or improve synthesis substantially) for title, peaceful exploration, abandoned towns, Android encounters, Cell battles, SSJ2 awakening and finale. Sound must match impact frames and not simply fire at action selection. Establish mastering/volume targets, smooth track crossfades, unobtrusive ambience, saved music/SFX sliders, mute persistence, autoplay unlock, pause/resume safety and offline compatibility. **Do not copy the copyrighted Dragon Ball soundtrack.** If you cannot audit by hearing, record that honestly and perform signal-level checks only.

**Game design:** Reassess *real player* pacing across the entire campaign. Evaluate travel time, encounter cadence, quest reward motivation, character availability, skill viability, difficulty spikes, healing economy, shop usefulness, tutorial pacing and postgame replay. Add meaningful tactics (telegraphed counters, viable loadout choices, better boss pressure patterns) without rewriting the entire progression or making random new mechanics that undermine the approved design.

- Normal should be demanding but **not require near-perfect Active Guard**; imperfect/missed guarding needs to be survivable through preparation and sensible decisions in normal circumstances. Guard timing should feel fair and learnable. Easy should remain forgiving, including low-skill/no-shopping routes reasonably representative of a human player.
- A 21.7-minute scripted browser run is not evidence of a satisfying human-length RPG. Evaluate real reading/dialogue time, decision-making and exploration rather than optimizing only a speed-running bot.
- Preserve identity of 7 heroes and the four-slot equipped loadouts. Every hero should have useful distinctive tactical roles and viable abilities. Check resource balance, transformations, Rage/Sparking, death/revive, status resistances, assists and boss immunity clarity.
- Upgrade shallow rescue/escort objectives **only if it measurably improves player experience**: e.g. actual escort following and danger, with reliable pathing and save/suspend handling, rather than just increasing quest count. Keep existing quests completable.
- The Father–Son finisher deserves a satisfying **player-performed climax**, possibly optional timing/energy interaction with accessible alternatives. Avoid introducing a one-frame QTE or an unwinnable finale; preserve narrative and accessibility.
- Add player-friendly feedback and QoL where needed: quest tracking, battle recap, equipment comparison, clear save feedback, readable help, skip-seen animations/cutscenes, optional faster battle playback, controller focus state, and configurable assists.

### Workstream 6 — Coherence, performance, Windows packaging & true release QA

- Apply the same visual/auditory/interaction conventions everywhere, eliminate wrong sprite scale, clipping, flashing, mismatched icons, slow UI, stale textures, renderer artifacts, and out-of-sync sounds.
- Verify performance on modest Windows hardware where actually accessible, and under software rendering; profile Phaser texture count, overdraw, large PNGs, asset decode, memory, long GC stalls, FPS stability and loading. Optimize atlases and sprite packing without damaging nearest-neighbor art.
- Ensure pause/blur/focus, alt-tab, scene teardown, save/load, corrupt-save recovery, difficulty changes, audio settings, Electron file protocol, controller unplug/replug and crash recovery work. Never lose saves just to change presentation.
- Keep the main title image striking, with menu overlay that doesn't cover core scene art; title music must obey the browser/Electron first-interaction policy. Keep original placeholder disclaimer only as appropriate to the private fan project, not as a large intrusive UX block.
- Maintain `START_GAME.bat` and the actual offline Electron Windows `.exe`; regenerate app icon only if necessary, use a reliable executable name and version, test clean extraction and startup, and verify where save files land. If clean-PC testing or Explorer icon verification is unavailable, mark NOT RUN and provide precise manual checks.
- Avoid unnecessary external dependencies; runtime must require **zero external network requests**.

---

## 4. MILESTONES AND EVIDENCE (COMPLETE THEM IN ONE OVERALL JOB)

### M0 — Baseline and art bible (brief)

- Inspect actual repository, determine latest working baseline, backup/checkpoint locally without committing/pushing, check generated/runtime asset source availability, and capture before evidence.
- Create `docs/POLISH_BASELINE_AUDIT.md`, `docs/ART_STYLE_AND_ANIMATION_SPEC.md`, and an asset-state ledger. Avoid long speculative planning.

### M1 — Outstanding pilot vertical slice

- Upgrade **Gohan vs. Perfect Cell** and **Ginger Town** using real integrated systems.
- Demonstrate (with actual captures) at least: normal attack, multi-hit, charged beam, guard result, Kamehameha, enemy hit reaction, target selection, fight victory, exploration, dialogue, interaction and a relevant mini-cutscene.
- Identify structural techniques that can apply globally. **Don't stop here.**

### M2 — Systemwide combat/UI rollout

- Apply animation director and combat UI standards to all 84 skills, 7 heroes, all existing forms, enemy families and 29 battles, with per-attack family correctness and exceptional hero/villain techniques.
- Regressions: accurate missed/immune/critical/absorbed feedback; no sprites hidden by HUD; targeting and Active Guard still functional.

### M3 — World and cinematic rollout

- Refresh and inspect all 12 map regions and their battle backgrounds, all interactive props/chests, plus all 15 story cinematics and major transitions.
- Validate travel paths and every mandatory story trigger remain reachable.

### M4 — Audio/balance/QoL and native Windows delivery

- Complete original audio treatment, practical balance improvement, interaction/menu polish, side quest feel, credits/postgame polish, performance and release packaging.

### M5 — Final verification and deliverables

- Run and record **actual commands with exit codes and output logs**: `npm ci` (where appropriate), typecheck, lint, build, existing unit/integration suite, relevant art audits, browser E2E and New Game-to-credits progression tests.
- Capture comprehensive *in-game* screenshots (title, all 12 worlds, several enemy/hero families, transform stages, UI variants, story moments, credits and postgame); where feasible take frame-by-frame or short video evidence of contact timing, guard, beams, boss transformations, cutscene transitions and dialogue clicks.
- Run multiple **normal-progression** seeds and skill policies, including a realistic imperfect-guard Normal player, a low-skill Easy route, no-shopping or minimal-shopping where defensible; do not use injected story flags, forced level boosts or automated teleport skips as proof of completion.
- Verify the full boss sequence, all 84 skills, four-slot loadouts, Active Guard, Rage/Sparking, 10 quests, all 12 maps, 29 mandatory combat stages, 15 cutscenes, Save/Load, at least all three postgame simulations, and Windows packaged build.
- Performance smoke at the three desktop viewports and a modest GPU/software mode. Verify audio streams and device input programmatically, but do **not** pretend that substitutes for listening or a physical gamepad.
- Preserve and update all old RC1/RC2 documentation so it doesn't contradict the new final source state.

---

## 5. DEFINITION OF DONE — THE GAME HAS TO *FEEL* FINISHED

Do **not** call the game a completed overhaul simply because build/tests pass or because generated PNGs exist. Required gates:

**Art & animation**
- Main heroes, transformations, bosses, regular enemies, NPCs, world props, important VFX and critical story graphics form a consistent style family. Sprite anchors, alpha, scale, direction and colors are reviewed in runtime; no obvious geometric placeholders remain in prominent areas.
- Action animation has legible **anticipation/contact/recovery** and synchronized hit, audio and damage. Each of the 84 skills has an appropriate cue; no generic pulse hides important action identity. Miss/immunity/critical/multi-hit/guard logic is represented accurately.
- Full world and battle environment presentation feels coherent, no blocky accidental collision-looking backgrounds and no clipping/dark fringe/sheet bleed.

**Player experience**
- Commands/targets are clear and quick. The player can operate battle entirely with mouse, keyboard and supported controller mappings; all icons resolve; settings/menu/dialogue have no flicker, stalls, click-through or empty elements.
- Major story moments have real dramatic direction, with the SSJ2 event and Father–Son Kamehameha clearly more impressive than ordinary attacks.
- Normal is approachable for a human with imperfect guard accuracy; combat is tactical rather than dependent on perfectly repeating one animation input.
- World travel has clear goals and meaningful atmosphere, and all quests/story gates work without regression.

**Engineering & honesty**
- Existing deterministic systems and saves preserved, no mandatory stage skipped, all required tests actually executed, no runtime network dependency, offline Windows `.exe` produced, release ZIPs integrity checked.
- Human-specific checks (art approval, audio-by-ear, controller hardware, clean-PC install, play-feel acceptance) remain explicitly *PENDING HUMAN SIGN-OFF* unless independently performed. Do not downgrade or hide their importance.

---

## 6. DELIVERABLES — ALL REQUIRED

At the end, provide:

1. **The complete upgraded AOTS3 source**, in its existing local repository working tree, with no commits/pushes/deployments.
2. **Playable production build**, standalone offline **Windows executable** and browser fallback with launch instructions.
3. **Release ZIPs** for (a) full source, (b) Windows player, (c) reproducible **raw/source art and generation/slicing manifest**, where sensible separately compressed to avoid duplicating assets unnecessarily. Do not include `node_modules`, debug screenshots or large reference outputs in the player package.
4. Actual generated art, sprite atlases, animation timing metadata, asset origin/approval ledger, and fallback registry updates.
5. `docs/POLISH_RELEASE_REPORT.md` with **before/after** screenshots and measurable changes to combat feel, battle UI, exploration, cinematics, audio, balance and performance.
6. `docs/ART_STYLE_AND_ANIMATION_SPEC.md`, `docs/ASSET_COVERAGE_AND_PROVENANCE.md`, `docs/GAMEPLAY_BALANCE_NOTES.md`, `docs/AUDIO_MIX_NOTES.md`, and updated known limitations and QA matrix.
7. Actual test logs / commands / failures / fixes / screenshots / ideally video evidence. Precise manual sign-off checklist where automation cannot truthfully substitute for a person.
8. A compact final summary containing **changed modules, art assets generated/reused, tests run and results, playthrough outcome, Windows build result, known limitations and exact owner test steps**.

### DO NOT DO

- Do not answer with a plan and stop.
- Do not generate one giant collage of every character; do not put titles or labels on character/VFX sheets.
- Do not create random geometry or static filters and pass them off as genuine finished sprite art.
- Do not write tests that simply assert a feature exists while its rendered UX is broken.
- Do not replace successful AOTS3 gameplay with a prototype or a screenshot-only simulation.
- Do not make 84 entirely new custom animations if shared truthful families yield a better, maintainable game—but do make the key attacks truly distinctive.
- Do not spend most effort on audit paperwork while gameplay remains weak.
- Do not introduce usage charges, API key billing, purchases or external services without the user's permission.
- Do not present unresolved human judgment as an automated PASS.

**Now implement the whole overhaul.** Use native image generation where included and available; preserve visual consistency; iterate against the actual running React + Phaser game; improve everything the player sees, hears and controls; test honestly; and deliver a genuinely more enjoyable **Attack of the Saiyans III — Cell Saga**.
