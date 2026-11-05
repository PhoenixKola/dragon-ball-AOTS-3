# AOTS3 polish preview report — 5 November 2026

This is an **incomplete overhaul preview**, not a finished M0-M5 release. The master prompt's art, animation, world, UI, audio, balance and human sign-off gates remain open. The owner has now authorized batch commits/pushes; no deployment, paid service or remote-setting change is involved.

## Changes that can be reviewed now

- Seven native-generated, identity-referenced cinematic PNGs stage Trunks arrival, both Android absorptions, Android 16 destruction, Gohan SSJ2 awakening, Goku sacrifice, and the Father-Son Kamehameha in their existing story sequences. Original outputs are retained in `art/production/cinematics/`; `tools/art_cinematics.py` installs reproducible runtime copies in `public/assets/cinematics/`.
- The cutscene player supports a short `keyframe` step with reduced-motion handling and scene-clock shutdown flush. The normal script, story flags and save format are untouched.
- Battle scene shutdown now resolves pending scene-clock and projectile/tween waits. The target marker follows the actor's current vertical position.
- World NPCs now use pixel feet-position depth, matching props and the player; map collision and entity coordinates are unchanged.
- Ginger Town uses a new transparent mist sprite and additional nonblocking abandoned-street props from the existing world art. A real-browser image at `tests/logs/screens/polish/gingertown-after.png` shows the current result; the repeating terrain/house composition still needs a full art pass.
- The registry and art audits now account for cinematic PNGs. Release packaging can produce separate source, browser player, source-art and Electron Windows archives.

## Before and after evidence

The historical baseline captures at `tests/logs/screens/playthrough/` show the 12 maps, Cell Games battles, credits and postgame. The current real-browser keyframe captures `keyframe-gohan_ssj2_awakening-step-08.png`, `keyframe-gohan_ssj2_awakening-step-16.png`, `keyframe-goku_sacrifice-step-17.png`, and `keyframe-father_son_finale-step-09.png` show distinct sequential frames in their actual cutscenes. The Android 16 destruction capture precedes Gohan's SSJ2 transformation in the scene. `tests/logs/screens/polish/gingertown-after.png` shows the changed map. The in-app browser host was unavailable, so Chrome was driven by the project E2E tools. `docs/ui-evidence/` is a React overlay harness and does not show the Phaser world/battle render, so it is not used as full-game approval.

## Executed checks

| Command | Result | Scope |
|---|---|---|
| `npm run typecheck` | exit 0 | TypeScript |
| `npm run lint` | exit 0 | ESLint |
| `npm test` | exit 0, 580 tests | Unit/integration; includes the multi-hit guard and six-seed occasional-guard policy checks |
| `python tools/build_art.py --only cinematics` and `--only atmosphere` | exit 0 | Copies source artwork to runtime and updates registry |
| `python tools/audit_assets.py` | exit 0, 0 errors and 0 warnings | 1,050 registry frames; 50 actors; 12 worlds; 36 VFX; no orphan PNGs |
| `npm run audit:runtime` | exit 0; 1,623 paths, no missing files or invalid PNGs | Runtime asset path/integrity audit |
| `npm run build` | exit 0 after final artwork and Ginger Town changes | Production browser build |
| `npm run pack:win` | exit 0 after current build | Offline Electron Windows app directory |
| `START_SAVE=tests/logs/saves/beat-25.json node tests/e2e/playthrough.mjs` | exit 0; beat 25 to 30, five fights, 34 total wins, zero defeats, zero page errors/network requests | Attentive-guard Normal replay from legitimate save; captures late story keyframes |
| `START_SAVE=tests/logs/saves/beat-25.json POLICY=occasional node tests/e2e/playthrough.mjs` | exit 0; beat 25 to 30, five fights, 34 total wins, zero defeats, zero page errors/network requests | Guard-light Normal replay (35% success profile) reached credits |

The prior beat-23-to-30 route remains in `tests/logs/e2e-playthrough-attentive.json`. Current beat-25 replays used a legitimately earned save and reached credits in five mandatory fights. Both the attentive and 35%-guard-success Normal profiles finished with 34 total wins, zero defeats, and zero page errors/external requests. The guard-light route confirms an ordinary missed guard does not derail the late campaign in this browser policy; it is not a fresh New Game or human playtest.

A further run from a legitimately earned beat-25 save reached credits with four story fights, zero defeats, zero page errors and zero external requests. It verified the preloaded awakening and finale frames. `node tests/e2e/gingertown-shot.mjs` passed from a legitimate beat-11 save with zero page errors and external requests.

The final `npm run lint` and `npm test` both exited 0; the latter passed 579/579. The refreshed Electron app passed `node tests/e2e/electron-smoke.mjs` (13/13), including save persistence across relaunch in an isolated user-data folder. This is not clean-PC installation, audio listening or physical gamepad approval. `python tools/package_release.py` produced four updated preview ZIPs under `release/`; all four passed `ZipFile.testzip()` with no corrupt member. The art-source ZIP contains 540 members and `source-checksums.json`. The Electron and browser-player ZIPs contain the app `.exe`; the browser-player ZIP also contains `runtime/node.exe` and `START_GAME.bat`.

## Owner review steps

1. Extract `AOTS3-Cell-Saga-Polish-Preview-2026-11-05-electron-windows.zip` and launch `Attack of the Saiyans III - Cell Saga.exe`. Alternatively extract the browser-player ZIP and run `START_GAME.bat`.
2. Start New Game and review title audio after the first click, dialogue advance, Ginger Town exploration and interactions, Gohan vs Perfect Cell targeting/guard/beam feedback, the SSJ2 awakening still, Father–Son finale and credits. Use a normal save if continuing from an existing `aots3.cell.v1.*` slot.
3. Listen to the music and effects, try a physical controller, inspect art at different window sizes, and test extraction on a clean Windows PC. These checks remain **PENDING HUMAN SIGN-OFF**.

## Open gates

Full temporal/character-specific animation coverage for all 84 skills, a refined battle UI, refreshed 12-region art and stages, direction for the remaining cutscenes, original audio treatment, approachable Normal balance, postgame replay, modest-PC performance profiling, and human art/audio/controller/clean-PC review remain open. The current verification proves code/runtime integrity and selected campaign sequences; it is not a finish-quality sign-off.
