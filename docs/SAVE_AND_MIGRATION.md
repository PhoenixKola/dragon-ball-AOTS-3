# Save system and migration notes

## Storage
- Isolated namespace `aots3.cell.v1.*` (`slot0..2`, `auto`, each with a `.bak` copy of the previous valid save) and `aots3.cell.settings.v1`. The AOTS2/Namek namespace and the legacy prototype keys (`aots3.cell.save.v1.*`) are never read as progress or written.
- Envelope: `{product, version, savedAt, checksum (FNV-1a), body (JSON string)}`. The checksum detects corruption and hand-editing; it is **not** an anti-cheat claim.
- Write path (`SaveManager.save`): serialise → re-validate (refuse to write something that would not load) → copy previous valid slot to `.bak` → write → read back and compare.
- Load path: checksum → whitelist validation → on any failure the `.bak` copy is tried and the UI is told the slot was `recovered`; if that fails the slot is `corrupt` and other slots are untouched.
- Export/import: JSON file `AOTS3-Cell-Saga_slotN_YYYY-MM-DD.json` (same envelope). Import is fully validated before it overwrites a slot, and the UI asks for confirmation first.

## Validation (`src/systems/validate.ts`)
Builds a brand-new trusted state from untrusted JSON; unknown keys are dropped, and these invariants throw `SaveError`:
story position and completed-beat prefix must agree; flags must be known, boolean-true and set only after the beat that sets them; no Super Saiyan 2 without Android 16's destruction (and beat G03); credits only after G07; Kami merge only after its event; Goku must be `away` while sick and after the sacrifice; party ≤ 3 of available heroes; levels/XP/Ki/HP/Rage ranges; loadouts only contain the hero's own, unlocked, non-story-only techniques (no duplicates); accessories real and unique; training points never exceed earned points; inventory ids known and within caps; Zeni 0..9,999,999 (no NaN/negatives); quests known with bounded progress; opened/seen lists regex-limited; `__proto__`/`constructor` keys rejected; blocked saved positions are repaired to the map spawn.

## Exactly-once rewards
Story rewards are committed by `completeBeat` (idempotent, only the current beat can complete), chests/pickups by `opened` keys, quests by state, side fights by `side:<id>` markers. Defeat never mutates state; retry rebuilds the battle from the unchanged state (items used in a lost battle are not lost). The engine battle works on a copy of the inventory that is committed only on victory/flee.

## Migrations
Current schema version 1; `migrate()` is the hook for future versions (each must be tested against fixtures). Old prototype saves cannot be mapped faithfully onto world/quest state, so `SaveManager.migrateLegacy` only starts a **new** game carrying difficulty and a capped Zeni amount; it is not wired to automatic import. Namek saves are never imported.

## Tests
`tests/unit/systems.test.ts`: round trip, checksum corruption, backup recovery, namespace isolation, 22 tamper cases, invariants at every story beat, import/export, legacy handling.
