# Art usage manifest (final art pass, partial)

| Category | Source (art/handoff) | Registry output | Status |
|---|---|---|---|
| Skill icons (84) | ui_and_icons/skill_status_icon_atlas.png | skillIcons `<hero>_<n>` -> assets/ui/skills | grid-sliced, 64x64, unique cell each; mapping in tools/art_icons.py SKILL_CELL |
| Item icons (37 ids) | ui_and_icons/item_icon_atlas.png | itemIcons -> assets/ui/items | cut per natural row segment (atlas is not a uniform grid) |
| uiIcons (46) | skill_status atlas, compact_combat_ui_atlas, targeting atlas | status-<kind> (all 32 StatusKinds), cmd-*, cursor-* | seal = lock glyph, atkDown/defDown/spdDown derived (flip/red badge) |
| Hero forms | heroes/forms + story_variants | gohan-ssj, gohan-ssj2, gohan-training, vegeta-ascended, trunks-ultra, goku-weakened, cell-junior, cell-super-perfect | genuine crops of handoff sheets (replaced derived art) |
| Base heroes, other actors, NPCs, minions | art/source bundle + procedural (unchanged) | unchanged | NOT yet replaced by handoff sheets |
| Worlds, VFX | art/source bundle (unchanged) | unchanged | NOT yet re-done from handoff worlds/ vfx/ |
| cinematics/storyboard | reference only | not shipped | - |

Other handoff sheets (npcs, villains_bosses, regular_enemies, heroes/base, worlds, vfx) are not integrated in this pass; see docs/MISSING_OR_PROVISIONAL_ART.md.

## Patch pass (art/patch/art/**, tools/art_patch.py)

| Asset | Source | Output | Notes |
|---|---|---|---|
| tien-base, vegeta-ssj (ordinary SSJ), gohan-ssj (ordinary SSJ) | characters/*_replacement.png | heroes/<id>/** | defringed (alpha binarised, red edge halo stripped), per-frame component crops, overworld 4x4 grid (idle + 3 walk per direction), portrait. No hurt pose exists on the Tien/Gohan sheets: the shouting pose is used for `hurt` (noted in frame notes). Gohan `charge` = Kamehameha stance with the baked beam erased. Gohan sheet has no left-facing row: `left` is the mirror of the right-facing side view (noted); `up` uses the first of two near-duplicate back rows. |
| objects.chest-closed / chest-open | world/treasure_chest_closed.png | objects/chest-*.png | closed: premultiplied BOX downscale to 68px wide (1:1 at the 2x world camera, displayHeight 30). open: derived by the tool (body + dark interior + gold heap + flipped/darkened lid) - no painted open art exists; open displayHeight keeps the same screen scale. |
| objects.save / heal / shop | world/Pixel RPG Save Heal Shop Icon Sheet.png | objects/*.png | background removed (edge-seeded flood over low-gradient pixels + haze peel + hole fill + edge decontamination); label plates and bottom UI bars not included; stored at 2x display height (144px, displayHeight 72). |
| uiIcons cmd-save / cmd-heal / cmd-shop | same sheet (floppy, bottle, bag) | ui/icons/*.png | 64x64 |
| title | title/cell_saga_title_screen.png | title/cell_saga_title_screen.png (1672x941) + title-small.png (836x470) | opaque; registry.title |
| Windows icon | title art crop (Goku + SSJ Gohan) | build/icon.ico (16-256) + build/icon.png (512) | derived from supplied art |
