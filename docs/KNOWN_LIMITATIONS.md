# Known limitations (honest list)

## Art (the biggest caveat)
- **Nothing is human-approved.** All art is candidate material from the supplied bundle plus tool-generated derived/procedural stand-ins. See `MISSING_OR_PROVISIONAL_ART.md` and `ART_INTEGRATION_REPORT.md`.
- Missing or derived forms: Gohan SSJ/SSJ2/wounded/training, Goku weakened, Vegeta Ascended, Trunks Ultra, Super Perfect Cell, Cell Junior, all minion enemies and all NPCs/portraits other than heroes are derived or procedural (flagged `derived` / `procedural_fallback` in the registry). They are not painted final art.
- Cutscenes are in-engine choreography (poses, VFX, flashes, camera shake) over the candidate frames; there are no painted cutscene frames. Every cutscene definition carries `provisionalArt: true`.
- VFX sheets mostly contain variants, not temporal sequences; the runtime plays those as a short pulse. VFX hit markers are the engine's own `hit` events, not authored clip timestamps.
- Skill icons (84) were re-sliced in RC2 (clean single icons); their mapping to techniques is by visual similarity, not artist-verified.
- The 13 duplicate-frame slots were replaced by labelled derived stand-ins where feasible; a few may remain visually identical.
- Heroes/NPC overworld sprites are small candidate frames; there is no 4-way walk animation for procedural NPCs beyond their stand-in cycle.

## Gameplay and balance
- Balance is verified only by deterministic bot simulation and one real-browser bot run, not by human playtesting. Normal difficulty with **no Active Guard at all** cannot beat the late Cell fights (wall at G05 in simulation); Easy with no guarding can. Normal with average/attentive guarding completes in every simulated seed.
- Random encounters are intentionally sparse; the story XP curve is calibrated so that the bots stay roughly level with the stage power. Heavy over-levelling from grinding is possible and not capped except by the level cap (40).
- Enemy HP for forced 1–2 hero fights is scaled down (x0.5 / x0.75) so solo story fights are finishable.
- The Super Perfect Cell final uses a staged finisher (survive to the opening, then the Father–Son Kamehameha command); it is a committed single action, not a free-form timing mini-game.
- Escort/rescue quests are fight-then-talk interactions, not followers that walk with the player.
- Android 16 is a temporary guest in one story fight only; he is not in the roster and cannot appear after his story death.

## Platform and QA coverage
- **Windows manual QA is NOT RUN** (no human operated the packaged ZIP on a clean PC). The launcher needs a localhost server; the player ZIP bundles `node.exe`, a browser is still required (any Chromium/Firefox; Chrome 155 was used).
- Audio is synthesized with Web Audio and has been unit-tested as data only; nobody has listened to it. No claim of musical quality or mix levels is made.
- Gamepad support is implemented and unit-tested with a fake pad; it was **not** tested on hardware.
- Performance was sampled in headless Chrome with software GL (43–56 fps at 1024x600..1920x1080); this is not a modest-PC benchmark.
- Touch controls are not implemented (desktop-first).
- The E2E bot uses engine-state reads for decisions (same policy as the headless simulation) and submits battle commands through `api.battleSubmit` (the HUD buttons use the same call); only the first two fights use real HUD button clicks. Movement, interaction, dialogue, menus, retry and Active Guard are real keyboard events.
- Esc is handled best-effort; X/Backspace/Back buttons/gamepad B always work (browsers reserve Esc to leave fullscreen).

## Update (RC2)
See `FINAL_PASS_NOTES.md`: only part of the new handoff art is integrated (icons, UI glyphs and 8 hero/Cell actors). Earlier notes above about icon slivers are obsolete; notes about NPC/enemy/world/VFX art being provisional still apply.
