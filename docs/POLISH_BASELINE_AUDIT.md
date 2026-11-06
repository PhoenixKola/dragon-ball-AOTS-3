# Polish baseline audit — 5 November 2026

Source: local RC2 working tree. `git status --short` initially showed only the supplied overhaul brief as untracked. I inspected `CLAUDE.md`, `README.md`, the RC2 notes, limitations, art manifest, registry, and the title, world, battle, and targeting captures. The in-app browser host was unavailable; `node tests/e2e/ui-shots.mjs` ran the existing Chrome harness (111 checks, one 404 console error). Its world and battle images contain a black Phaser area, so they are **UI overlay diagnostics, not valid full-game visual approval**.

The generated real-browser playthrough captures under `tests/logs/screens/playthrough/` and the curated `docs/overhaul-evidence/` set contain actual game frames. The older `docs/ui-evidence/` images came from a mock React overlay harness with a black Phaser canvas, so their PNGs are now excluded from Git and can be regenerated with `node tests/e2e/ui-shots.mjs`; they were never used to approve full-game rendering.

## Preserve

- Deterministic battle events and guard timing, real encounter order, isolated save namespace, and the existing 12 map collision layouts.
- Strong title illustration; consistent major hero silhouettes; the Ginger Town battle backdrop; compact battle commands and in-world target marker.
- Authored quests, portraits, NPC interactions, and existing offline art registry/build process.

## Observed priorities

| Issue | Source | Impact |
|---|---|---|
| Cutscene awakening has no high-impact still | `CutsceneScene.ts`, `cutscenes.ts` | SSJ2 reveal shares ordinary in-engine staging |
| Battle clip promises may remain pending on scene shutdown | `BattleScene.ts` | load/retry or interrupted playback can stall callers |
| Many VFX are variants rather than temporal frames | `tools/art_vfx.py`, registry notes | Important action effects remain short pulses |
| Normal no-guard progression wall | `docs/KNOWN_LIMITATIONS.md`, policy simulation | Human accessibility remains unproven |
| Harness lacks a full Phaser render in world/battle states | `tests/e2e/ui-shots.mjs` | Overlay screenshots alone can hide visual faults |
| NPC update depth used tile-like units while props/player used pixel feet positions | `WorldScene.ts` | NPCs can layer behind nearby scenery |

## Art inventory

Registry: 50 actors (48 `genuine` idle sources, 1 `derived`, 1 `procedural_fallback`), 12 worlds, 35 VFX, 84 skill icons, 37 item icons. `genuine` means a real source crop, **not** human approved. All actor approvals remain false. Twenty-two VFX entries still say `variants_not_sequence`; they must not be presented as full animation. The current art audit found zero orphan runtime PNGs and zero clipped character frames, with one pre-existing flyer border warning. Source bundles in `art/source`, `art/handoff` and `art/patch` are present locally but ignored by Git; archive them for reproducibility.
