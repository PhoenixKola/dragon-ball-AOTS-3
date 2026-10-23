# Final pass notes (RC2)

## Done
- **Icons:** 84 skill icons, 37 item ids and 46 UI glyphs (`status-*`, `cmd-*`, `cursor-*`, `cmd-save/heal/shop`) re-sliced as one complete centred 64x64 icon each; audit fails on border pixels / off-centre / empty icons. Evidence in `docs/art-evidence/skillIcons.png`, `itemIcons.png`, `uiIcons.png`.
- **New art integrated:** Tien, Vegeta SSJ and Gohan SSJ replacement sheets (defringed, 8 poses + 4-way overworld + portrait); Gohan SSJ2, Gohan training/wounded, Vegeta Ascended, Trunks Ultra, Goku weakened, Cell Junior, Super Perfect Cell; villains/bosses, regular enemies (probe, drain drone, security grid, sentinels, husk/bio-bug, absorbed shadow, chamber guardian), NPCs (Bulma, Chi-Chi, Yamcha, King Kai, Mr. Satan, scientist, civilians, announcer) from the handoff sheets. Landing troopers are derived (recoloured sentinel set; no dedicated sheet exists). See `ART_USAGE_MANIFEST.md`.
- **World objects:** treasure chest (closed + derived open state), save terminal, heal dome, shop stall replace the geometric placeholders. Chests open once, persist across save/reload (verified in Chrome).
- **Proportions:** one source of truth `tools/art_proportions.py` (battle `displayHeight`, map `owHeight`); lineups `docs/art-evidence/proportions-battle.png` and `proportions-overworld.png`. Gohan is clearly smaller than Goku, Krillin smallest of the adults, bosses larger; every pose of an actor uses one scale so sprites never change size or jitter (measured: idle <= 0.2 px/frame, zero size variation).
- **Enemy facing:** enemy frames are recorded with their true facing and flipped to face the heroes (checked on `docs/art-evidence/h2-enemy-facing.png`).
- **Title screen:** the supplied illustration is the full-screen scene; compact pixel-style menu in the calm sky area; accessible hidden heading; loading state; keyboard/mouse/pad navigation. **Title music** was silent because the session never requested the `title` track; it is now requested at boot and starts at the first legitimate gesture, with a discreet "enable sound" chip. Verified: audio graph runs after a click, crossfades to the map track with no doubled loops (`window.__AOTS__.audio()`).
- **Loading flash:** the world HUD no longer appears with an empty "Objective:" box; a loading veil covers map loading.
- **Cut-off containers:** boss nameplate/badge and target title no longer clip; `tests/e2e/ui-shots.mjs` now scans for clipped text at 3 resolutions.
- **Active Guard feedback:** instant on-target result when the window closes: "PERFECT GUARD!" (cyan, shield ring burst, flash), "GOOD GUARD" (green ring) or "GUARD MISSED" (red text + red cross); works in reduced-motion mode. Verified in Chrome (`tests/e2e/guard-feedback.mjs`).
- **Rage display:** fixed raw decimals (e.g. 30.1384793) in the HUD.
- **Battle animation / dialogue / menus / targeting:** compact icon command menu, in-scene target arrow, windup->contact->recovery timing, dialogue click-advance fix.
- **Windows EXE (bonus):** `npm run build && npm run pack:win` produces `release/electron/.../Attack of the Saiyans III - Cell Saga.exe` (Electron, offline, private `aots3://` protocol, own data folder, icon). Smoke-tested once; not further QA'd. Browser edition: `START_GAME.bat` now waits for the server before opening the browser.

## Not done / unverified
Worlds and VFX were not re-done from the handoff sheets (RC1 tiles/effects remain). Painted cutscenes do not exist. Windows clean-PC double-click, hardware gamepad, audio listening and human playtest are manual checks.
