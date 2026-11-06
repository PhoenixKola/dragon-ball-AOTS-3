# Final pass notes — Batch G

The Batch A–G implementation and technical integration work is recorded in `POLISH_RELEASE_REPORT.md`; this file supersedes the RC2 punch list below. The product is an upgraded technical preview, with human review gates explicitly pending in `KNOWN_LIMITATIONS.md`.

## Completed implementation

- Preserved the existing AOTS3 engine, deterministic combat, story/save identity, seven heroes, 84 skills, 12 maps, 10 quests and 29 mandatory battles.
- Completed the playable Ginger Town evacuation/rescue pilot, global battle presentation rollout, 12-region art/map pass and story camera framing.
- Refined the transformation reveal, aura size/depth, Trunks form timing, battle/cutscene flashes and localized spectacle.
- Added original stable music motifs, offline map ambience, transformation phase cues, and the Attack/Guard Ki rebalance and guard prompt reductions.
- Completed fresh-route and three-postgame automation, rebuilt browser and Windows artifacts, passed Electron smoke, and removed 27.6 MB raw UI-only screenshots from Git tracking while preserving real game evidence.

## Technical evidence

- `npm test`: 591 passed across 12 files.
- `npm run build`: passed; Vite emitted two mixed import warnings.
- Asset audit: 1,071 registered frames, 50 actors, 12 worlds, 42 VFX families, zero errors/warnings/orphans.
- Runtime asset audit: 1,682 paths, zero missing or invalid files.
- Fresh Normal campaign: 30/30 beats, 35 wins (29 story plus six random), 0 defeats, 1,013 movement steps, zero browser errors or external requests; all 15 cutscene IDs captured at natural triggers.
- Three postgame scenarios: SIM_JUNIORS, SIM_PERFECT and SIM_SUPER cleared through the real postgame console and battle engine.
- Desktop viewport/save checks: 15/15; Electron smoke: 13/13; battle controls passed.

## Still requires people

Human art approval, whole-route play-feel review, listening/mastering, physical controller tests, clean-PC Windows extraction/launch, and modest-hardware profiling remain **HUMAN / PENDING**. The route captures one rendered moment from each of the 15 real cutscenes; it does not replace person-by-person inspection of every animation or skill. See the current reports for precise scope.
