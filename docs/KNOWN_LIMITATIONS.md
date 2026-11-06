# Known limitations and pending review

Updated 6 November 2026. The Batch G technical preview build has completed a fresh natural Normal campaign route and all three postgame simulations. This document records what automation did not establish.

## Art and animation

- All generated, supplied, and derived assets remain candidates; no human art approval has been recorded. See `ART_USAGE_MANIFEST.md`, `ASSET_COVERAGE_AND_PROVENANCE.md`, and `MISSING_OR_PROVISIONAL_ART.md`.
- The game has 50 registered actors and complete runtime art coverage, but this does not mean every character has a complete bespoke animation sheet. Kami and Bulma now have native-generated four-direction idle and walk cycles; other NPC/enemy motion still uses short stand-in cycles, some duplicate source poses remain, and several VFX are variants or pulses rather than authored temporal animation.
- All 15 cutscene definitions have authored establishing camera framing and story direction, and the final natural route captured each sequence at its real trigger. The evidence is one screenshot per scene, not a frame-by-frame animation review. Seven candidate stills are integrated; the remaining scenes use in-engine staging and effects.
- Transformation effects were corrected and reviewed in browser captures: compact aura and lightning are behind Trunks, with form change on the release beat. Human art/style approval remains pending.
- The UI-only screenshot harness has a black Phaser canvas. Its large PNG set was removed from Git and is regenerable; it is not represented as whole-game evidence.

## Gameplay and balance

- The fresh Normal policy simulation completed 30/30 story beats, 29 story battles plus six random encounters, 35 wins and 0 defeats. The final real-browser route also completed all 30 beats and all 15 cutscenes, with 35 wins and one automated defeat/retry; it reported zero page errors and external requests. Both are automated evidence, not human play-feel approval.
- Six-seed deterministic policies also cleared Normal with no guard, though that route required two retries per seed; Easy no-guard cleared without defeats. These runs do not establish that every player, loadout or no-shopping route is fair.
- The campaign retains 29 story battles, 10 quests, 12 maps, seven heroes and 84 skills. The final integration pass does not claim manual playthrough validation of every quest, skill, or four-slot loadout.
- Random encounters permit extra levels up to the level cap. Enemy scaling, solo fights, healing/shop economy and actual human route length deserve owner review.
- The Father–Son Kamehameha remains an accessible direct command, not a mandatory one-frame QTE.

## Audio, controls, performance and delivery

- Music and effects are synthesized offline and pass signal/routing tests. No person has listened to the mix or approved musical quality or device translation.
- Gamepad support is covered by automated/fake-device checks only; physical controller play and unplug/reconnect behavior remain unverified.
- The Electron package passed automated startup, save persistence and offline/security checks. No person has tested extraction and launch on a clean Windows PC or Explorer integration.
- FPS samples (53/52/51 at 1024×600, 1280×720, 1920×1080) came from headless Chrome with software GL. Memory, frame spikes, texture pressure, decode/load time and modest-PC hardware performance are not established.
- Touch controls are not implemented; the game is desktop-first. Browser Escape behavior is best effort because browsers reserve the key for fullscreen; in-game Back, X and Backspace remain available.
- Vite reports mixed dynamic/static import warnings for `items.ts` and `enemies.ts`; the production build succeeds, but those modules do not split into separate chunks.

## Human sign-off checklist

1. Play on Normal with imperfect guard timing and on Easy with little or no guarding; review bosses, shop/heal use, quests and the credits-to-postgame transition.
2. Inspect candidate art, character identity across forms, transparent edges, scale, neighboring-frame consistency, VFX depth and the 15 cutscene sequences.
3. Listen to all themes, ambience, and battle/transformation effects on speakers/headphones.
4. Test a physical gamepad, including focus, unplug and reconnect.
5. Extract the Windows package on a clean PC, launch it offline, and verify its save location.
6. Profile the game on modest Windows hardware.

All six remain **HUMAN / PENDING**. See `POLISH_RELEASE_REPORT.md` and `FINAL_ACCEPTANCE_MATRIX.md` for automated evidence and scope.
