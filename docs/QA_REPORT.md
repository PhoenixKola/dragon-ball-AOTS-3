# QA report — Batch G integration (6 November 2026)

Only checks with recorded execution are listed as passed. Automated policy/browser behavior is not human playtesting. Human sign-off items are listed in `KNOWN_LIMITATIONS.md`.

## Current checks

| Gate | Command / evidence | Result |
|---|---|---|
| TypeScript + production bundle | `npm run build` | PASS. Vite prints mixed dynamic/static import warnings for `items.ts` and `enemies.ts`; build completes. |
| Lint | `npm run lint` | PASS during final implementation pass. |
| Unit/integration | `npm test` | PASS, 591 tests in 12 files. |
| Asset registry audit | `python tools/audit_assets.py` | PASS, 1,071 frames; 50 actors; 12 worlds; 42 VFX; zero errors, warnings or orphans. |
| Runtime asset audit | `node tools/audit_runtime_assets.mjs` | PASS, 1,682 paths; no missing or invalid assets. |
| Natural Normal story route and cutscene sweep | `$env:MAX_MIN='40'; $env:CAPTURE_STORY_SWEEP='1'; node tests/e2e/playthrough.mjs` | PASS, 30/30 beats; 29 story battles + 6 random encounters; 35 wins, 0 defeats; all 15 unique cutscenes captured at real triggers; no page errors/external requests. 1,013 movement steps. |
| Postgame | `node tests/e2e/playthrough.mjs` run separately with `POSTGAME=1`, `POSTGAME_ID` set to each of `SIM_JUNIORS`, `SIM_PERFECT`, `SIM_SUPER`, and `START_SAVE=tests/logs/saves/beat-30.json` | PASS; each scenario was cleared using the legitimately earned beat-30 save. |
| Save, viewports and FPS smoke | `node tests/e2e/checks.mjs` | PASS, 15/15. No horizontal overflow at 1024×600, 1280×720, 1920×1080. Software-rendered FPS samples: 53/52/51. |
| Battle inputs | `node tests/e2e/battle-controls.mjs` | PASS for mouse/keyboard techniques, item, targeting and Back. |
| Electron player | `npm run pack:win`; `node tests/e2e/electron-smoke.mjs` | PASS, current Windows x64 app folder; 13/13 including relaunch save persistence and no external requests/errors. |

`npm test`, campaign runs and audits write run logs/screens below `tests/logs/`. These are local QA artifacts; reproducible game screenshots are indexed in `docs/OVERHAUL_VISUAL_EVIDENCE_INDEX.md`. Generated UI-only harness PNGs are excluded from source control because their Phaser canvas is black.

## Scope limits

- The final fresh Normal route exercised natural progression, all 30 story beats, 29 story battles, six random encounters and all 15 cutscenes. It is automated and uses engine-state reads to choose actions.
- The three postgame simulations exercised their actual console and battle flows from an earned beat-30 save.
- Existing matrices/tests provide broad data coverage for all 84 skills, maps, quests, saves, combat rules and accessibility. This integration pass did not manually inspect every skill/loadout or play every optional quest by hand.
- FPS checks are headless software-GL samples, not hardware profiling. Audio unit/signal checks do not substitute for listening. Fake-pad tests do not substitute for a physical controller.
- Electron smoke does not substitute for clean-PC extraction and launch by a person.

## Pending human review

Play feel/balance, generated and derived art, the full cutscene set, audio mix, hardware gamepad, clean-PC Windows install, and modest-PC performance are **HUMAN / PENDING**. Do not treat this report as a final human acceptance sign-off.
