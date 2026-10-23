# Attack of the Saiyans III — Cell Saga
## Final visual replacement, title-screen polish, audio fix and native Windows EXE — Claude Code implementation brief

**ACTUAL IMPLEMENTATION REQUIRED.** Continue the **latest AOTS3 Cell Saga working tree** (RC1 or newer). Do not start another project from scratch, and do not stop at a plan. Preserve campaign gameplay, saves and earlier fixes. Deliver working updated game files and genuine test evidence.

### Required inputs and precedence
1. The current **AOTS3 Cell Saga** project source; RC1 archive `AOTS3-Cell-Saga-RC1-full-source.zip` is an available baseline, but prefer a newer working tree if it contains the previously requested final-art/bugfix pass.
2. `AOTS3-RC1-FINAL-VISUAL-AND-WINDOWS-PATCH.zip` (this patch).
3. Prior `AOTS3-FINAL-ART-HANDOFF.zip` and `AOTS3-Cell-Saga-Final-Claude-Completion-Prompt.md` where applicable. **Keep their unfinished acceptance items in scope.** This follow-up adds requirements; it does not supersede them.
4. The AOTS3 master blueprint for mechanics and acceptance when needed. Treat the old AOTS2 Namek source as **read-only reference**, not an edit target.

**Hard constraints:** No commits, pushes, publishing, deploying, or changes to the separate Namek Saga game. Do not claim passes from source inspection or simulated clicks. Do not alter the intended 29-battle story, save keys, balancing or combat calculations merely to accommodate art. Report any unresolved gap precisely.

### 1. Replace three poor-quality character sheets

Use the **new** source files as candidates, not the old provisional artwork:

| New source image | Intended in-game actor |
|---|---|
| `art/characters/tien_base_replacement.png` | Tien base form |
| `art/characters/vegeta_ssj_replacement.png` | Vegeta **ordinary SSJ**, not Ascended/Grade 2 |
| `art/characters/gohan_ssj_replacement.png` | Gohan **ordinary SSJ**, not SSJ2 |

Inspect each image and its actual frame layout. Use existing `tools/build_art.py`, `tools/audit_assets.py`, `tools/audit_runtime_assets.mjs`, `src/data/artRegistry.generated.json`, `src/engine/assets.ts`, `src/data/artTypes.ts`, and Phaser actor-loading code as integration entry points. Choose robust per-frame crops (not an assumed regular grid), correct facing/flipping, feet anchors, battle poses, overworld walk frames and portrait crops. Do not include adjacent frames, black matte or colored fringe. Keep form unlock logic and story-specific timing intact. Explicitly check that **SSJ Gohan does not become SSJ2 too early** and that Vegeta's normal SSJ art is different from Ascended Vegeta.

The goal is consistent source-faithful 16-bit-style sprites at appropriate apparent game scale, not stretching 1448×1086 source images directly into the scene. If a sheet contains a visibly invalid or duplicate pose, preserve the existing good pose or fix the crop instead of introducing a regression.

### 2. Treasure chest image and actual interaction

Use `art/world/treasure_chest_closed.png`. Convert it into a performant world sprite at the intended map tile scale and world-object anchor. Replace any obvious geometric/placeholder treasure chest visuals where chests appear, while preserving collision, facing, interaction range, loot/once-only flags, save/load persistence and quest logic. The new art is a **closed-only** image; if an opened state is required, create a matched derivative or keep a reliable existing state with a short lid/reward animation. Do not invent or duplicate item rewards. Test discovery, collect, persistence across save/reload and no interaction after already opened.

### 3. Replace the ugly opening/title screen with the supplied full-screen illustration

Use `art/title/cell_saga_title_screen.png` (1672×941, **opaque**, title graphics already painted into it). Current RC1 title component lives in `src/components/screens.tsx` (`TitleScreen`); layout in `src/app/styles.css` (`.title`, `.title-art`, `.title-box`, `.title-kicker`, `.title h1`, `.title-menu`).

- Make the art the visible primary fullscreen scene, with proportional cover/contain behavior appropriate to the game stage. Avoid stretched pixels, important characters/title cut off, black seams, or two overlapping copies of the logo.
- **Remove/hide the current large HTML title/kicker visually** since the art has baked title text. Retain an accessible title via a visually hidden heading or aria label.
- Keep Continue, New Game, Load Game, Options, Help, Credits actually functional. Restyle their controls into a **small, sophisticated pixel-JRPG selection UI** that occupies calm space without covering the title or faces; keyboard/controller focus, hover and click states should be obvious. No giant generic rectangular web buttons; avoid busy overlays.
- Continue is shown only for an existing save. Existing save confirmation, New Game difficulty selection and overlay behavior must remain correct.
- Handle 1024×600, 1280×720, 1920×1080, and laptop/ultrawide resizing without distortion/overflow; ensure no critical content is cropped by responsive safe zones. On portrait orientation offer sane scaling or letterbox fallback instead of broken layout.
- Include a deliberate game-like loading state, reduced-motion support, and functional mouse/keyboard/controller navigation. Keep the private fan-made disclaimer in a discreet text location where appropriate; avoid duplicating a disclaimer embedded into the artwork (none is embedded).

### 4. Fix title-screen silence; implement reliable offline menu music

Important source finding: RC1 **already defines a synthesized `title` music track** in `src/engine/audio/tracks.ts` and has a Web Audio engine in `src/engine/audio/engine.ts`. The issue is **playback/user-gesture/audio initialization or presentation**, not a missing sound file. Investigate why title is silent. Fix it end to end:

- Ensure the title music intent is set on entering the title screen and plays once browser autoplay restrictions permit a legitimate user gesture (pointer/key/gamepad press). No fake hidden autoplay bypasses.
- Add a discreet visible **Play music / Enable sound** control when needed. Retain volume/master/music/mute settings and persist them; do not override a saved user mute preference.
- Verify fade/crossfade on New Game, Continue, returning to title, opening and closing Options, and switching browser focus. No doubled loops, silent resume after tab suspend, or audio unexpectedly playing after mute.
- Improve the title composition if the existing procedural track sounds thin, while remaining offline and original; do not add copyrighted commercial DBZ audio from the web or make unverified audio-quality claims.
- Confirm the same behavior in the native Windows EXE. Automated checks may verify graph/state events, but listening requires a real human/device; document it separately.

### 5. **Produce a real, runnable Windows EXE** (not merely BAT or shortcut)

The current RC1 `START_GAME.bat` launches a browser against `127.0.0.1:4173` using Node. The user explicitly wants the new game to have a **double-clickable Windows `.exe`** similar to a normal installed game. Build an actual desktop wrapper around the Vite/React/Phaser game.

Preferred approach: use **Electron** (or Tauri if justified and genuinely buildable) to deliver a self-contained Windows application. Do not just rename a BAT to EXE. Required characteristics:

- A real `Attack of the Saiyans III - Cell Saga.exe`, or a similarly named portable/installed EXE, that launches the game with **no separately installed Node, npm, CLI, local browser, or manually started server**.
- Offline first-launch and gameplay; no external network needed. Bundle all art/music/runtime dependencies. Use a safe app-local protocol or correctly configured app load URL/file scheme; ensure Phaser asset paths work after packaging.
- Correct window title and a distinctive game icon (`.ico` derived from approved supplied art with correct dimensions and alpha). Usable maximized/windowed behavior, aspect ratio/sizing, appropriate quit behavior, fullscreen handling, and focus/keyboard/gamepad behavior. Prevent unwanted developer console/white splash/browser chrome in release.
- Keep **separate, stable app data/save storage** and preserve existing browser saves where appropriate via a documented import/export or migration path. DO NOT silently wipe/overwrite browser profiles or move the old AOTS2 save keys. Electron's storage origin differs from local browser origin: explicitly handle this.
- Keep Electron security defaults (`contextIsolation`, sandbox where possible, `nodeIntegration: false`, disabled remote content, narrow preload/IPC only if strictly necessary) and protect against arbitrary navigation/file access. No auto-updaters, telemetry or remote services.
- Add reproducible package scripts and documentation to build Windows portable/installer outputs, with minimal changes to the game's underlying mechanics.
- Prefer a **portable EXE** plus optional installer and keep `START_GAME.bat` as a separate fallback for the browser edition; fix BAT readiness/race by waiting for HTTP server success before opening the browser.
- On a Windows build host, physically launch the EXE from a clean extracted release folder, start/continue game, test title music, world movement, battle, pause/settings, save/quit/relaunch/load, credits, controller if available, and confirm no missing resources. Verify code signatures only if actual signing is set up; do not claim signed if unsigned.
- If the environment cannot cross-build/test a Windows EXE, implement all packaging configuration, provide the reproducible Windows build command, and **explicitly report the missing binary or unverified smoke test**. Do not claim the EXE exists without checking its actual filesystem path.

### 6. Keep all previously reported bug fixes in scope and regress them

The prior master prompt should already cover these; **do not drop them**:

1. Combat command panel was too large and lacked attractive icons: compact, icon-led attack/skills/item/guard/transformation actions; avoid obscuring actors.
2. Enemy targeting popup was clunky: redesign targeting with contextual highlighting/cursor, fast keyboard/controller selection, readable enemy identity/HP, clear confirm/cancel and no overlapping UI.
3. Hit/ability animation was clunky: proper windup → launch/travel → impact/hit reaction → damage numbers/crit/miss/immunity → recovery synchronization. Correct frame timing, scale, anchors, action locks and combat rules.
4. Dialogue box **clicking causes a flash of remaining text but sometimes does not advance**: ensure first click completes typewriter text and next click advances, or explicit intended mode; prevent propagation, repeated triggers and softlocks; verify click/tap/keyboard/gamepad.
5. Some menu items/abilities lacked icons: fix path mapping and missing fallback icon; no broken image or blank slot.
6. Flicker, z-index and art issues: no disappearing characters or flashes when menus/dialogue open, transitions and transforms occur; check enemy layers behind command UI, canvas and CSS overlays.
7. Keep save/load recovery, options persistence, Active Guard accessibility, postgame rematches, dialogue progression and the prior verified campaign path functional.

### 7. Required genuine QA evidence and final deliverables

Do targeted implementation and real validation, not hours of self-described 'testing' without evidence. At minimum:

- Run production `npm run build`, `npm run lint`, `npm test` (or project's equivalent). Preserve real exit codes/log files; fix any failure caused by changes.
- Exercise and screenshot the actual title screen at 1024×600, 1280×720, 1920×1080 and the Windows wrapper if possible.
- Browser checks for new Tien/Vegeta SSJ/Gohan SSJ art, dialogue progression through multiple lines, targeting confirm/cancel, icon coverage, battle impact timing, title audio after gesture/mute/unmute, and chest save/reload persistence.
- Re-run full campaign and relevant postgame regression on natural progression, no artificially granted resources, no skipped encounters, no hidden state tampering. If browser tests use a UI-equivalent API in parts, disclose exactly which actions were automated through APIs versus actual input.
- Confirm packed path resolution and resources in production and Windows edition; log no missing assets, uncaught exceptions, unintended network requests or save corruption.
- Provide `release/` with updated source ZIP, playable browser build ZIP with corrected `START_GAME.bat`, **real Windows portable EXE ZIP** if build succeeds, optional installer, test logs/screenshots, a clear changelog, per-asset replacement map and a `RELEASE_STATUS.md` that distinguishes verified from still unverified tests.
- If a human audio/controller/performance playtest is not available, mark it unverified instead of asserting success.

**Priority:** Apply the five specific new art assets cleanly; redesign title; fix actual title music; package a native Windows EXE; close the previously reported dialogue/combat/menu issues; preserve all 29 story encounters, seven heroes, 84 skills, 12 regions and postgame. Do not commit, push, publish or deploy anything.
