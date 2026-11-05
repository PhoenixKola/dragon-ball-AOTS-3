# Gameplay balance and pacing notes

The balance pass preserves deterministic combat, the story order, the `aots3.cell.v1.*` save identity, all seven heroes, four-slot loadouts and technique costs. Basic Attack now restores 6 Ki (previously 3); Guard restores 6 Ki (previously 8). Both actions fund techniques equally, while Attack also deals damage, so guarding is useful without being the best default choice every turn. The HUD and Active Guard tutorial show the rewards.

## Guard load and difficulty

- One successful timing input covers a defender's full multi-hit enemy move. Android 17, Android 18 and Perfect Cell no longer take a second full action every round.
- Routine untelegraphed attacks do not force repeated timing prompts. Missed/omitted guards receive a modest passive brace; charged, telegraphed, multi-hit and heavy attacks retain Active Guard.
- G05's threshold now matches its stated 50% objective. Other boss pressure and story outcomes remain intact.
- The six-seed natural-progression policy matrix reached credits for attentive, average, occasional, no-guard Normal and no-guard Easy play. No-guard Normal incurred two retries per route; no-guard Easy had no defeats. Average guard had 0–1 defeats and occasional guard 0–2 in the recorded matrix. A separate 10% perfect / 25% good / 65% missed policy also cleared all six Normal seeds (five with no defeats, one with four). These are deterministic bot/simulation results, not human play-feel approval. See `tests/logs/sim-policy-matrix.json` and the late-route evidence in the visual evidence index.
- The solo Gohan climax remains a deliberate skill check; the player can prepare with healing and the SSJ2 loadout, and its objective is visible as a clear 50% threshold. The full human balance review remains pending for Batch G.

## Pacing, choices and quality-of-life

The pass keeps the 29 mandatory battles and all ten quest/story gates. It avoids global enemy-damage cuts and route skips. Repeated defensive prompts are reduced, offensive Ki value is clear, and party/loadout choices remain meaningful. The opening and late-campaign natural routes reached their authored beats without injected progress. Shop supplies, healing, transformation unlocks and campaign pacing remain in their original progression; full route-length and no-shopping human review is a Batch G sign-off item.

Current player controls include battle speed, skip, reduced motion, saved audio sliders/mute, clear costs/restrictions and target information, equipment comparison, quest guidance, save feedback, readable help and controller focus states. The Father–Son climax remains a direct accessible command rather than a mandatory one-frame timing gate.

No human playtest is claimed. Normal is intended to remain challenging while surviving imperfect guard choices; Easy is forgiving for players who do not use Active Guard. Owner play-feel sign-off remains **HUMAN / PENDING**.
