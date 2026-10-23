# Final acceptance matrix (RC1)

Legend: **PASS (executed and evidenced)**, **PARTIAL**, **FAIL**, **BLOCKED**, **NOT RUN**. "Complete" is deliberately **not** claimed: art is provisional and several verification gates were not run.

| # | Gate (from the master brief) | Status | Evidence / note |
|---|---|---|---|
| 1 | Real React + TS + Phaser 3 + Vite app (not the iframe shell) | PASS | `src/**`, `npm run build` log |
| 2 | Strict typing, `tsc --noEmit`, production `vite build`, lint | PASS | `tests/logs/build.log`, `lint.log` |
| 3 | Offline, no external requests, isolated `aots3.*` saves | PASS | zero external requests in every E2E run; namespace tests |
| 4 | 29 mandatory encounters triggered through the world with authored dialogue and distinct objectives (win/threshold/survive/protect/finisher, waves, phases) | PASS | `STORY_ENCOUNTER_MATRIX.md`, simulation + browser playthrough |
| 5 | 12 regions, collision, doors, exits, chests, NPCs, shops, save/heal, travel | PASS (look is provisional) | map tests (reachability, arrivals), `MAPS_AND_INTERACTABLES.md` |
| 6 | 7 heroes, 84 distinct skills with 4 customizable slots and disabled reasons | PASS | `ALL_84_SKILLS_MATRIX.md`, 84 per-skill tests, signature-uniqueness test |
| 7 | Basic Attack/Defend/Items/Flee/Rage Art/Sparking/Forms/6+ combos | PASS | engine + combat tests (7 combos) |
| 8 | Deterministic seeded combat, Active Guard good/perfect/miss with telegraphs | PASS | combat tests; real key-press guard in browser run |
| 9 | Boss rules differ observably (19/20 absorb, 17/18 counter, Cell grab, adaptation, Super Perfect afterimage/solar beam, sentinel) | PASS | boss-rule unit tests + simulation |
| 10 | Independent forms; SSJ2 locked before Android 16's event; finale legal only after gates | PASS | form + finisher + save-invariant tests |
| 11 | XP/levels/TP, equipment, capsules/items, shops, journal, 10 quests with real objectives | PASS (quests exercised by unit tests; only the main route is bot-played in the browser) | systems tests, `MAPS_AND_INTERACTABLES.md` quest table |
| 12 | Save integrity: slots, checksum, backup/recovery, validation, import/export, exactly-once rewards | PASS | `SAVE_AND_MIGRATION.md`, 25 systems tests, browser corrupt-save check |
| 13 | Migration: legacy prototype / Namek | PASS (by design: no automatic import) | `migrateLegacy` test |
| 14 | Natural-progression simulation incl. defended and low-skill routes | PASS | policy matrix (attentive/average/Easy no-guard finish; Normal no-guard documented wall) |
| 15 | Real-browser playthrough fresh save -> credits | PASS | `e2e-playthrough-attentive-fresh.json` / `e2e-fresh.log` (see QA_REPORT for scope) |
| 16 | Browser: low-skill route to credits | FAIL (informative) | Easy no-guard/no-shopping bot stalls at G01 in the browser; headless equivalent with shopping completes |
| 17 | Save/reload mid-story and postgame in the browser | PASS | `e2e-checks.json` |
| 18 | Postgame simulations separated from canon | PASS (one sim) | sim stages + records + validation; the browser bot cleared "Cell Junior Swarm" from the credits save and the record persisted (`e2e-postgame.log`); the Perfect/Super Perfect simulations were not browser-played |
| 19 | Screenshots of 12 locations, boss/hero/form battle shots, menus, 3 resolutions | PASS / PARTIAL | `tests/logs/screens/**`; every character/form is not individually screenshotted in battle (forms: SSJ2, Ascended, Ultra, Kami visible in playthrough shots; others only in art evidence sheets) |
| 20 | Art: every actor/form resolves to art or labelled fallback; 13 duplicate slots handled; 84 icons; worlds | PASS (provisional) | `art-runtime-audit.json`, `MISSING_OR_PROVISIONAL_ART.md` |
| 21 | Art approved by a human | **NOT DONE** | `approved=false` everywhere |
| 22 | Painted cutscene art | NOT DONE | 15 in-engine choreographed cutscenes (provisional) |
| 23 | Music/SFX original and playable offline | PASS (synthesized); audio quality NOT RUN | `AUDIO_NOTES.md` |
| 24 | Keyboard/gamepad parity, held-A safe, blur safe | PASS (unit, fake pad); hardware NOT RUN | input tests |
| 25 | Accessibility: reduced motion, guard assist, text speed, contrast, focus, no colour-only cue | PASS (UI sweep); not audited with assistive tech | `docs/ui-evidence`, settings persist test |
| 26 | Responsive 1024x600 / 1280x720 / 1920x1080, no page overflow | PASS | `e2e-checks.json` |
| 27 | Packaged `dist` + `START_GAME.bat` + player ZIP + full source ZIP | PARTIAL | ZIPs built by `tools/package_release.py`; the extracted player ZIP was served with its bundled node.exe and smoke-tested in Chrome; the .bat itself was not double-clicked and no clean-PC run happened |
| 28 | Modest-PC performance | NOT RUN | only software-GL headless FPS sampled (43–56) |
| 29 | Docs set (implementation, art, story matrix, skills, maps, save, QA, missing art, limitations, acceptance) | PASS | `docs/` |
| 30 | No commit/push/deploy; original Namek project untouched | PASS | no git actions; Namek only read as reference |

**Verdict:** a complete, playable offline RC with real exploration, 29 fights, the Cell Games finale and credits, verified by tests, a deterministic simulation and a real-browser run — but with provisional art throughout, and with Windows launcher, hardware gamepad, audio listening and human playtesting still to be done by a person. Not called "final".
