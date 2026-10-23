# Implementation report — AOTS3 Cell Saga RC1

Status vocabulary: **PASS** (executed, evidence in `tests/logs`), **FAIL**, **BLOCKED**, **NOT RUN**. See `FINAL_ACCEPTANCE_MATRIX.md` for every gate.

## What was built
A real React 19 + TypeScript (strict) + Phaser 3.90 + Vite 6 application replacing the old vanilla-JS prototype. No network requests at runtime; saves isolated under `aots3.cell.v1.*`.

| Area | Implementation |
|---|---|
| Combat (`src/engine/combat`) | Deterministic seeded engine (mulberry32): speed-ordered turns with extra boss actions, generator-based hit resolution that pauses for **Active Guard** on every hit against a hero, perfect/good/none mitigation, accuracy/evade/crit/pierce/splash/lifesteal/multi-hit, 20+ statuses with explicit turn-ownership (fresh self-buffs keep full duration, stun/heavy-guard tick at turn start), barrier/endure/reflect/counter/cover, charge skills (1–2 turns, interruptible by stun), per-hero Rage with identity multipliers and anti-farm caps, Sparking (60 Rage, 3 turns, ATK x1.25, half Ki, -10% damage taken), independent per-hero forms with Ki upkeep, 7 two/three-hero combos with partner-turn reservation, items/revive/flee, deterministic enemy AI with telegraphs, phases, objective modes (win/threshold/survive/protect/finisher) and waves. `director.ts` plays engine events through a Phaser stage on a pausable clock; guard grading uses `GuardTracker` on that clock. |
| Content (`src/data`) | 7 heroes, **84 skills with 84 distinct mechanical signatures** + 7 Rage Arts + Android 16 guest kit, 22 enemy defs with boss rules (19/20 energy absorption stance, 17/18 counter stance + double actions, Cell grab/absorb with interrupt, Perfect Cell adaptation, Super Perfect afterimage/solar beam, sentinel shield rotation, Cell Juniors group bonus), **29 mandatory stages** + 5 optional quest fights + 3 postgame simulations, 30 story beats (29 battles + the Kami merge event), 15 authored cutscenes, 10 quests, 12 maps. |
| World (`src/engine/world`, `scenes`) | Pure `WorldSim` (continuous movement, AABB collision, door/blocker rules, exits, zones, patrol foes, interact reach, random encounters with grace periods and a test-only disable hook) rendered by `WorldScene` from the generated art registry; shared navigator used by the bots. |
| Systems (`src/systems`) | Game state, progression (XP/TP/loadouts/accessories/shop/field items), quest runtime, declarative story script runtime with exactly-once commit, condition language, strict save validation + backups + import/export, unified keyboard/gamepad input manager. |
| UI (`src/components`, `src/app`) | Title, difficulty, pause menu (status, party, abilities with 4 slots, items, equipment/training, journal, options, save), shop, travel, battle HUD with the Active Guard cue, dialogue with portraits, rewards, defeat/retry, confirm dialogs, credits, help, toasts. Session/store layer bridges React and Phaser. |
| Audio (`src/engine/audio`) | Offline Web Audio synthesis: 22 music keys, 36 SFX keys, master/music/sfx buses, voice limiter, crossfades, tab-blur suspend. |
| Art pipeline (`tools/build_art.py`) | Reproducible slicing of the supplied bundle into `public/assets` (≈1,450 PNGs) + typed registry; runtime audit in `tests/unit/art-runtime.test.ts`. |

## Verified blueprint behaviours (tests)
Gohan SSJ2 unavailable without Android 16's canonical event; finale legal only for SSJ2 Gohan after all story gates; rewards exactly once (idempotent beat commit); defeat mutates nothing; flee gives nothing; save tampering rejected (22 cases) and invariants hold at every legitimate story beat; Goku stays away after the sacrifice; quests close without retroactive completion; maps: every entity reachable from spawn, exits land on walkable tiles, every battle beat has a trigger on its map.

## Not done / partially done
See `KNOWN_LIMITATIONS.md`. Notably: final art, painted cutscenes, hardware gamepad, audio listening, clean-PC Windows QA, human playtesting.
