# Attack of the Saiyans III — Cell Saga: Final Art Integration, Bug Fixing, and Release Completion Prompt

You are working on the **separate** Attack of the Saiyans III — Cell Saga project. Your job is to take the RC1 source and the curated art handoff bundle, then finish the game to a strong final-release state.

## Inputs you must use
- `AOTS3-Cell-Saga-RC1-full-source.zip`
- `AOTS3-FINAL-ART-HANDOFF.zip` (or the extracted `AOTS3-FINAL-ART-HANDOFF/` folder)
- The original blueprint if needed for feature/quality reference: `attack-of-the-saiyans-iii-cell-saga-complete-code-first-master-blueprint.md`
- The old Namek architecture ZIP only as reference for proven patterns: `AOTS2_Beta3_Source_Architecture_Reference_Code_Only.zip`

## High-level goal
Deliver a **complete, playable, polished final game** from New Game to credits, with the curated artwork integrated throughout exploration, combat, menus, story scenes, and postgame. Do not just plan. Implement the remaining work in code and assets, test it for real, and produce the final shippable outputs.

## Non-negotiable rules
1. Keep the existing Namek Saga project completely separate and untouched.
2. Do not commit, push, publish, or deploy anything.
3. Do not fake test results, skip encounters, or use artificial level boosts to claim completion.
4. If an asset is missing or unusable, use the best fallback honestly and document it.
5. Preserve save safety and backward compatibility where reasonable.

---

## Part 1 — Art integration
Integrate the curated art bundle into the RC1 project.

### A. Character art
Use the best available sheets for:
- Base heroes: Goku, Gohan, Vegeta, Piccolo, Future Trunks, Krillin, Tien.
- Form variants: Goku SSJ, Future Trunks SSJ, Piccolo Kami-merged, Vegeta SSJ, Vegeta Ascended/Super Vegeta, Future Trunks Grade 3, Gohan SSJ, Gohan SSJ2.
- Story variants: weakened Goku, virus Goku, wounded-arm/finale Gohan, training-variant Gohan.
- Villains and bosses: Mecha Frieza, King Cold, Androids 16/17/18/19/20, Imperfect Cell, Semi-Perfect Cell, Perfect Cell, Super Perfect Cell, Cell Juniors.
- NPCs: Bulma, Chi-Chi, Yamcha, King Kai, Mr. Satan, Capsule Corp scientist, frightened civilians, Cell Games announcer.

### B. Regular enemies / non-boss combatants
Integrate and map the generated enemy-family sheets to the procedural/minor enemies, including the missing ones noted in RC1:
- reconnaissance probe / recon drone
- Ki-draining drone
- armored android sentinel
- laboratory security grid emitter / turret
- Cell bioform / husk / bug-type minion
- absorbed-human shadow / strange apparition
- training sentinel / Time Chamber guardian

If a generated sheet combines two related enemy types, split them in code or crop them into separate atlas regions.

### C. World / map art
Replace provisional geometric or placeholder world sheets with the curated world tilesets where feasible:
- Future Landing Site
- Capsule Corp
- South City
- Rocky Outskirts
- Gero Mountain exterior
- Gero Lab interior
- Ginger Town
- Android Island
- The Lookout / Heavenly Palace
- Hyperbolic Time Chamber
- Cell Games Approach / Arena

You may keep some maps mixed-style temporarily if full replacement is risky, but improve all obvious placeholder geometry.

### D. VFX
Integrate the VFX atlases for:
- basic attacks, hit sparks, impacts
- beams, blasts, projectiles
- charge / aura / burst states
- transformations and sparking/rage visuals
- signature attack effects where sensible

### E. UI / icons
Use the curated UI and icon atlases to complete and polish:
- combat command menu
- target-selection menu
- party/menu icons
- item / skill / status / portrait visuals
- missing menu icons throughout the game

Prefer the compact newer combat UI atlases over the oversized RC1 presentation.

---

## Part 2 — Required bug fixes and UX fixes
Fix all of the following, not just some:

### Reported / observed issues
1. **Combat command menu is too large** and feels clunky.
   - Redesign it to be more compact and polished.
   - Add meaningful icons for attack / skills / items / guard / transform / special where applicable.
   - Ensure it does not obscure combatants.

2. **Targeting menu is not liked**.
   - Rework the enemy-target selection UX so it feels cleaner, smaller, clearer, and faster.
   - Use proper highlight markers, arrows/cursors, and readable target feedback.
   - Reduce visual clutter.

3. **Hit / ability impact animation is clunky**.
   - Smooth out attack windup, travel, impact, shake, flash, and recovery timing.
   - Improve perceived contact timing for melee and abilities.
   - Ensure effects line up with damage events and reaction frames.

4. **Dialogue interaction bug / flicker**.
   - When a dialogue box is clicked, the text container should advance cleanly.
   - Fix the issue where the remaining text flashes but the conversation does not advance properly.
   - Verify keyboard, mouse, and any relevant tap/click flow.

5. **Missing icons in menus**.
   - Find and fix the places where items, skills, or other UI entries appear without icons.
   - Ensure safe fallback icons exist so nothing renders blank.

6. **General flicker / presentation cleanup**.
   - Check for sprite flicker, z-ordering issues, menu overlap, and transformation art desync.
   - Verify battle art updates correctly when forms change.

### Additional stability / polish tasks
- Make sure command selection, target selection, and Active Guard all feel responsive.
- Verify no important UI is hidden behind overlays.
- Verify dialogue cannot soft-lock cutscenes.
- Verify all sprite atlases crop correctly without bleeding neighbors.
- Verify transparency and anchor points are correct.

---

## Part 3 — Gameplay completion and validation
Even though RC1 is already playable, do a final completion pass.

### Verify / finish
- All 29 story encounters from Future Trunks’ arrival to SSJ2 Gohan defeating Super Perfect Cell.
- All 12 world regions.
- All 7 heroes and all 84 skills.
- Rage, Sparking, transformations, Active Guard, quests, menus, saves, postgame.
- Cell Games finale and credits.
- Postgame content including Cell Junior Swarm and other available rematches.

### Important gameplay checks
- No broken progression triggers.
- No softlocks in story events or map transitions.
- No combat UI breaking at different resolutions.
- Save/load integrity, including corrupt-save recovery if already supported.
- Audio actually works and is reviewed by a human where possible.
- Controller/gamepad support if present in project scope should be smoke-tested.
- `START_GAME.bat` / local launcher should start the server before opening the browser.

---

## Part 4 — Testing requirements
You must do **real** testing, not pretend.

### Required
1. Build the game and ensure the production build works.
2. Run lint/tests and fix regressions.
3. Run campaign playthrough tests end-to-end.
4. Run browser-based verification in real Chrome if available.
5. Run fresh New Game through to credits with normal progression.
6. Re-test postgame content.
7. Capture logs and honest QA documentation.

### Specifically validate
- command menu redesign
- target menu redesign
- dialogue click advancement fix
- icon coverage fix
- smoother hit / ability impact animations
- transformation sprite correctness
- world-map art replacement did not break collision/pathing

If any part still has limitations, document them precisely instead of hiding them.

---

## Part 5 — Output deliverables
When done, produce:
1. A complete final source folder.
2. A final playable build and Windows launcher.
3. A ZIP of the final source.
4. A ZIP of the final player build.
5. Documentation including:
   - what was integrated
   - what bugs were fixed
   - what tests were run
   - remaining limitations, if any
   - an art-usage mapping / manifest

## Implementation guidance
- Prefer the cleanest single-subject sprite sheets from the curated bundle.
- If there are duplicates or alternate sheets, choose the strongest one and ignore weaker copies.
- If a source image is a combined sheet, crop/slice it into engine-friendly atlas regions as part of integration.
- Do not break gameplay just to force art replacement.
- Favor stability and honesty over pretending the art is perfect.

## Final instruction
Do the actual work. Integrate the art, fix the UI and bug issues above, finish any remaining gaps, and validate the game end-to-end. Do not stop at planning.
