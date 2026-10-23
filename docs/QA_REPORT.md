# QA report — RC1

Classification: **PASS** = executed with evidence in `tests/logs/`; **FAIL**; **BLOCKED**; **NOT RUN**. Nothing here is a claim about human playtesting, audio quality or clean-PC Windows behaviour.

## Commands actually executed (raw output saved)
| Gate | Command | Result | Evidence |
|---|---|---|---|
| Type check + production build | `npm run build` (`tsc --noEmit && vite build`) | PASS (exit 0) | `tests/logs/build.log` |
| Lint, zero warnings | `npm run lint` | PASS (exit 0) | `tests/logs/lint.log` |
| Unit + integration | `npx vitest run` (9 files) | PASS — 221 tests | `tests/logs/unit-integration.log` |
| Natural-progression policy matrix | `tests/integration/policies.test.ts` (4 policies x 6 seeds, real encounters, fresh save to credits, no debug flags) | PASS (see below) | `tests/logs/sim-policy-matrix.json` |
| Art integrity (bundle + registry) | `python tools/audit_assets.py` | PASS — 0 errors, 0 warnings, 0 clipped, 0 orphan PNGs | `tests/logs/art-audit-final.log`, `art-audit.log` |
| Runtime art audit | `tests/unit/art-runtime.test.ts` | PASS — 955 frames exist with recorded size/visible pixels; all 48 requested actors resolve; 84 skill icons; all items have icons; 12 worlds have full tile sets | `tests/logs/art-runtime-audit.json` |
| Audio data tests | `tests/unit/audio.test.ts` | PASS (data/limiter/crossfade logic only — nothing was heard) | `tests/logs/audio-unit.log` |
| Real-browser checks | `node tests/e2e/checks.mjs` (Chrome 155, headless, dist) | PASS 15/15 | `tests/logs/e2e-checks.log` / `.json`, screenshots in `tests/logs/screens/checks` |
| Real-browser full playthrough (defended) | `node tests/e2e/playthrough.mjs` fresh New Game, Normal | PASS — see section below | `tests/logs/e2e-playthrough-attentive-fresh.json`, `e2e-fresh.log`, screenshots `tests/logs/screens/playthrough` |
| Real-browser postgame simulation | `POSTGAME=1 CHOICE_RE=Swarm START_SAVE=beat-30 node tests/e2e/playthrough.mjs` (walk to the Capsule Corp simulation console, choose "Cell Junior Swarm", fight, record saved) | PASS | `tests/logs/e2e-postgame.log` |
| Real-browser low-skill route | `POLICY=noguard` (Easy, never presses Guard, no shopping) | **FAIL (informative)** — repeated defeats at G01 with working retry flow; killed after 7 defeats | `tests/logs/e2e-noguard.log` |
| UI screenshot sweep (mock session) | `tests/e2e/ui-shots.mjs` | PASS (37 scenes x 3 resolutions, no horizontal scroll) | `docs/ui-evidence/` |
| Player ZIP smoke | extract `AOTS3-Cell-Saga-RC1-player-windows.zip`, serve with its bundled `runtime
ode.exe tools\serve-dist.mjs`, load in Chrome, New Game -> intro cutscene | PASS (no page errors) | this report |
| `START_GAME.bat` double-click / Windows clean-PC | — | **NOT RUN** (dist served by `tools/serve-dist.mjs` through the same code path in the E2E; the .bat itself was not double-clicked) | — |
| Hardware gamepad | — | **NOT RUN** (fake-pad unit test only) | — |
| Human audio/playtest | — | **NOT RUN** | — |

## Natural-progression simulation (headless, deterministic)
Fresh save -> credits using the real world simulation (A* over the real collision grid, entity interaction, exits, travel), real encounters, real battle commands including Active Guard grades, shopping, healing pads and loadout upkeep; no XP/item injection, no skipped encounters. Results per policy (6 seeds each): **attentive** and **average** guard finished 6/6 on Normal; **no guard on Easy** finished 6/6; **no guard on Normal** finishes 0/6 (stops at G05 — documented difficulty wall: Active Guard is effectively required on Normal). Per-checkpoint levels/zeni/map and per-battle logs: `tests/logs/sim-*.json` (the matrix file lists completed beats and defeats).

## Real-browser playthrough (what it proves and what it does not)
Driven with real keyboard events (movement, interact, dialogue, menus, retry) from a fresh Normal New Game to the credits scene; Active Guard is pressed with real key events timed from the live cue (attentive profile: ~55% perfect, ~35% good, 10% none). The first two fights use the real HUD buttons; later battle decisions come from the shared reference policy and are submitted through `api.battleSubmit` (the same call the HUD uses). Navigation goals come from the shared navigator (real collision grid). Random encounters are **enabled**. Observed: no page errors, **zero external network requests**, 35 battles won (29 story + 6 random encounters, 0 defeats), 793 steps, 21.7 minutes, all 12 maps visited (screenshots), all 29 story fights + the Kami event completed in order. The retry-after-defeat flow was exercised in other runs (`DEFEAT -> retry` lines in `e2e-noguard.log` and an earlier from-save run that lost once and retried).

Bugs this run found and fixed (all regression-covered by the same run): a cutscene VFX timer touching a destroyed image froze the Cutscene scene update loop (soft-lock) — fixed and the clock now also has a wall-clock fallback for cutscene waits; hero battle art did not follow form (SSJ2 showed base art) — fixed through `Battle.refreshActor`; enemies were hidden behind the command panel — repositioned; interaction facing bug in the bot; a travel-pad stall; same-tile path fallback.

## Regression checklist (blueprint section 6)
| Regression | Status |
|---|---|
| Gohan cannot use SSJ2 before the story trigger; no bogus form unlock by menu | PASS (engine + save validation tests) |
| No frozen inputs after battle | PASS (E2E: 35 battles, world input resumed each time) |
| No negative HP / stacked rewards | PASS (tests: HP clamps, idempotent beat commit, defeat changes nothing) |
| No permanently unguardable telegraphed hit | PASS (`every hit on a hero produces a guard prompt`) |
| No invisible NPC collisions / unreachable entities | PASS (map reachability tests: 12 maps) |
| No misplaced/chopped sprite fragments | PARTIAL — runtime audit finds 0 clipped frames; skill icons contain neighbouring slivers (documented); SSJ/Kami source sheets touch their cell edge |
| No misaligned final beam | NOT VERIFIED visually beyond the screenshots; beams are stretched from attacker to target by `BattleScene.projectile` |
| No heroes revived in canon scenes | PASS (save invariant + sim: Goku away after G05; Trunks leaves after the finale) |
