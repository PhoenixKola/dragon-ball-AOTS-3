# Attack of the Saiyans III — The Cell Saga (release candidate 1)

Private, offline, fan-made JRPG: React 19 + TypeScript (strict) + Phaser 3 + Vite. No network access at runtime.

## Run
- **Player package:** extract, double-click `START_GAME.bat` (bundles `runtime\node.exe`).
- **Source:** `npm ci && npm run build && node tools/serve-dist.mjs` then open http://127.0.0.1:4173/ (or `npm run dev`).

## Commands
| | |
|---|---|
| `npm run build` | `tsc --noEmit` + production `vite build` |
| `npm test` | unit + integration (combat, all 84 skills, content/map reachability, save integrity, art audit, natural-progression simulation) |
| `npm run test:controls` | focused browser check of visible battle technique, item, Back, and target controls |
| `npm run test:e2e` | build, create test saves, run browser checks and a full Normal playthrough |
| `npm run lint` | eslint, zero warnings |
| `node tests/e2e/playthrough.mjs` | real-Chrome playthrough of `dist` (see docs/QA_REPORT.md) |
| `python tools/build_art.py` | regenerate `public/assets` + `src/data/artRegistry.generated.json` from `art/source` |
| `python tools/package_release.py` | build the release ZIPs in `release/` |

## Layout

`src/data` content (heroes, 84 skills, enemies, 29 stages, story beats, cutscenes, 12 maps, quests) · `src/engine/combat` deterministic battle engine, director, policy · `src/engine/world` collision, world simulation, navigator · `src/engine/scenes` Phaser scenes · `src/components` React UI · `src/systems` state, progression, quests, story runtime, save, validation, input · `art/source` original art bundle (read-only) · `public/assets` generated runtime art.

### Healing effect art workflow

`python tools/build_art.py --only vfx` now rebuilds `regen` as five transparent, fixed-pivot temporal frames derived from the existing healing glyph in `art/source`. This cue is labelled `derived` in the registry, not artist-approved character art. It replaces the prior unrelated-variant pulse while keeping the runtime `regen` ID. Run `npx vitest run tests/unit/art-runtime.test.ts` and `npm run build` after regeneration. The existing Pillow/NumPy art environment is used; no new dependency was installed. The local `art/source` bundle is needed to rebuild it. Other provisional character art remains identified in `docs/KNOWN_LIMITATIONS.md`.

Read `docs/FINAL_ACCEPTANCE_MATRIX.md` and `docs/KNOWN_LIMITATIONS.md` before relying on anything: art is provisional, nothing has human sign-off, and several verification gates are marked BLOCKED or NOT RUN.
