# Combat presentation map (generated)

This map is generated from the authored data in `src/data/skills.ts`, the runtime VFX registry, and the presentation resolver. It covers **84 / 84 core techniques** plus Rage Arts and team combos. “Visual clip” is the Phaser action family; registered VFX stay distinct by their own IDs.

Frame labels distinguish authored temporal sequences from one-shot/variant artwork. This is an implementation inventory, not a human sign-off that every effect is visually perfect.

## Phase timing contract

Base timings are at battle speed 1x; playback durations scale with the selected battle speed. Melee clips coil and approach for about 260ms, resolve damage and authored sound at the hit event, then return to formation. Ranged casts show a 190ms cue; ordinary projectile travel is 230ms (360ms for Spirit Bomb), and contact feedback waits for arrival before displaying damage or playing the hit sound. Multi-hit techniques resolve contacts in authored order with a 90ms beat between engine events. Enemy Active Guard opens 880ms before impact at 1x; the telegraph marks its threatened target without moving that gameplay timestamp. Reduced motion and fast-forward shorten or skip presentation while combat outcomes stay deterministic.

## Core techniques

| ID | Hero | Technique | Kind / element | Clip → visual clip | Registered VFX | Hits / charge | Phase timing at 1x |
|---|---|---|---|---|---|---|---|
| goku_0 | Goku | Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| goku_1 | Goku | Meteor Combination | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 4 hits | 260ms approach, hit contact, return-home recovery |
| goku_2 | Goku | Afterimage | stance / phys | teleport → buff | teleport (teleport, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| goku_3 | Goku | Instant Transmission Strike | attack / phys | teleport → teleport | teleport (teleport, 5 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| goku_4 | Goku | Rapid Ki Shots | attack / ki | barrage → barrage | ball-blue (ball, 5 frames, temporal) | 5 hits; random targets | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| goku_5 | Goku | Kai Barrage | attack / ki | barrage → barrage | ball-blue (ball, 5 frames, temporal) | 2 hits; all enemies; 8% max HP cost | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| goku_6 | Goku | Turtle School Guard | stance / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| goku_7 | Goku | Super Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, temporal) | 1 hit; 1T charge | 190ms cast cue, 230ms travel, hit contact |
| goku_8 | Goku | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits; all enemies | 240ms stationary cue, authoritative status/heal result |
| goku_9 | Goku | Warp Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| goku_10 | Goku | Spirit Bomb | attack / ki | special → special | spirit-bomb (ball, 6 frames, temporal) | 1 hit; 2T charge; all enemies | 190ms cast cue, 360ms travel, hit contact |
| goku_11 | Goku | SSJ Focus | stance / phys | buff → buff | aura-ssj (aura, 4 frames, pulse/variant) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| gohan_0 | Gohan | Masenko | attack / ki | beam → beam | beam-gold (beam, 3 frames, pulse/variant) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| gohan_1 | Gohan | Dragon Rush | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 3 hits | 260ms approach, hit contact, return-home recovery |
| gohan_2 | Gohan | Energy Wave | attack / ki | blast → blast | burst (impact, 5 frames, temporal) | 1 hit; all enemies | 190ms cast cue, 230ms travel, hit contact |
| gohan_3 | Gohan | Protective Stand | stance / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| gohan_4 | Gohan | Potential Burst | support / phys | buff → buff | aura-rage (aura, 6 frames, pulse/variant) | no damage hits; 10% max HP cost | 240ms stationary cue, authoritative status/heal result |
| gohan_5 | Gohan | Counter Rush | stance / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| gohan_6 | Gohan | Guided Blast | attack / ki | blast → blast | ball-yellow (ball, 3 frames, temporal) | 2 hits | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| gohan_7 | Gohan | Super Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| gohan_8 | Gohan | Hidden Power | attack / phys | special → heavy | aura-rage (aura, 6 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| gohan_9 | Gohan | Father's Resolve | support / phys | buff → buff | regen (status, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| gohan_10 | Gohan | SSJ2 Lightning Rush | attack / phys | melee → melee | lightning (status, 5 frames, pulse/variant) | 5 hits | 260ms approach, hit contact, return-home recovery |
| gohan_11 | Gohan | Father–Son Kamehameha | special / ki | special → special | father-son (beam, 5 frames, pulse/variant) | 1 hit | Finale staging, beam travel, then hit contact |
| vegeta_0 | Vegeta | Galick Gun | attack / ki | beam → beam | beam-purple (beam, 3 frames, pulse/variant) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| vegeta_1 | Vegeta | Rapid Fire Ki | attack / ki | barrage → barrage | ball-yellow (ball, 3 frames, temporal) | 5 hits | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| vegeta_2 | Vegeta | Dirty Fireworks | attack / ki | blast → blast | explosion (impact, 5 frames, temporal) | 1 hit; all enemies | 190ms cast cue, 230ms travel, hit contact |
| vegeta_3 | Vegeta | Big Bang Attack | attack / ki | blast → blast | ball-blue (ball, charged growing blue sphere) | 1 hit; 1T charge | 190ms cast cue, 230ms travel, hit contact |
| vegeta_4 | Vegeta | Final Flash | attack / ki | beam → beam | beam-final-flash (beam, 4 frames, pulse/variant) | 1 hit; 1T charge | 190ms cast cue, 230ms travel, hit contact |
| vegeta_5 | Vegeta | Pride Stance | stance / phys | buff → buff | aura-base (aura, 4 frames, pulse/variant) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| vegeta_6 | Vegeta | Saiyan Blitz | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 2 hits | 260ms approach, hit contact, return-home recovery |
| vegeta_7 | Vegeta | Counterstrike | stance / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| vegeta_8 | Vegeta | Energy Volley | attack / ki | barrage → barrage | ball-yellow (ball, 3 frames, temporal) | 3 hits; all enemies | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| vegeta_9 | Vegeta | Ascended Surge | attack / phys | special → heavy | impact-big (impact, 3 frames, pulse/variant) | 1 hit; 6% max HP cost | 260ms approach, hit contact, return-home recovery |
| vegeta_10 | Vegeta | Crush Cannon | attack / ki | beam → beam | beam-red (beam, 5 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| vegeta_11 | Vegeta | Last Stand | attack / phys | special → heavy | aura-rage (aura, 6 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| piccolo_0 | Piccolo | Special Beam Cannon | attack / ki | beam → beam | special-beam-cannon (beam, 8 frames, temporal) | 1 hit; 1T charge | 190ms cast cue, 230ms travel, hit contact |
| piccolo_1 | Piccolo | Hellzone Grenade | attack / ki | barrage → barrage | hellzone-grenade (ball, generated emerald projectile with orbiting sparks) | 5 hits; random targets | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| piccolo_2 | Piccolo | Light Grenade | attack / ki | blast → blast | ball-green (ball, 2 frames, pulse/variant) | 1 hit; all enemies | 190ms cast cue, 230ms travel, hit contact |
| piccolo_3 | Piccolo | Explosive Wave | attack / ki | blast → blast | burst (impact, 5 frames, temporal) | 1 hit; all enemies | 190ms cast cue, 230ms travel, hit contact |
| piccolo_4 | Piccolo | Regeneration | heal / phys | heal → heal | regen (status, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| piccolo_5 | Piccolo | Namekian Guard | support / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| piccolo_6 | Piccolo | Extend Arm | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| piccolo_7 | Piccolo | Ki Suppression | debuff / ki | flare → flare | charge (aura, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| piccolo_8 | Piccolo | Tactical Barrier | support / ki | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| piccolo_9 | Piccolo | Focused Piercer | attack / ki | beam → beam | beam-green (beam, 2 frames, pulse/variant) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| piccolo_10 | Piccolo | Demon Hand | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| piccolo_11 | Piccolo | Guardian's Vow | stance / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| trunks_0 | Future Trunks | Burning Attack | attack / ki | beam → beam | beam-yellow (beam, 5 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| trunks_1 | Future Trunks | Finish Buster | attack / ki | blast → blast | ball-purple (ball, 4 frames, temporal) | 2 hits | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| trunks_2 | Future Trunks | Shining Sword | attack / phys | sword → sword | slash (slash, 4 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| trunks_3 | Future Trunks | Sword Breaker | attack / phys | sword → sword | slash (slash, 4 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| trunks_4 | Future Trunks | Future Slash | attack / phys | sword → sword | slash (slash, 4 frames, temporal) | 3 hits | 260ms approach, hit contact, return-home recovery |
| trunks_5 | Future Trunks | Burning Wave | attack / ki | blast → blast | burst (impact, 5 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| trunks_6 | Future Trunks | Side-step Counter | stance / phys | guard → guard | teleport (teleport, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| trunks_7 | Future Trunks | Photon Blade | attack / phys | sword → sword | slash (slash, 4 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| trunks_8 | Future Trunks | Guard Break | attack / phys | sword → sword | impact-big (impact, 3 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| trunks_9 | Future Trunks | Rapid Swordstorm | attack / phys | sword → sword | slash (slash, 4 frames, temporal) | 6 hits; random targets | 260ms approach, hit contact, return-home recovery |
| trunks_10 | Future Trunks | Ultra Burst | attack / ki | special → special | explosion (impact, 5 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| trunks_11 | Future Trunks | Power-Weight Strike | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| krillin_0 | Krillin | Destructo Disc | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| krillin_1 | Krillin | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits; all enemies | 240ms stationary cue, authoritative status/heal result |
| krillin_2 | Krillin | Scatter Shot | attack / ki | barrage → barrage | ball-yellow (ball, 3 frames, temporal) | 4 hits; random targets | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| krillin_3 | Krillin | Double Disc | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 2 hits | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| krillin_4 | Krillin | Energy Mine | debuff / ki | blast → blast | ball-red (ball, 3 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| krillin_5 | Krillin | Quick Step | stance / phys | teleport → buff | teleport (teleport, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| krillin_6 | Krillin | Ally Cover | support / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| krillin_7 | Krillin | Focused Ki | support / ki | buff → buff | regen (status, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| krillin_8 | Krillin | Coordinated Rush | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 1 hit | 260ms approach, hit contact, return-home recovery |
| krillin_9 | Krillin | Disc Storm | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 3 hits; all enemies | 190ms cast cue, 230ms travel, hit contact + 90ms per-hit beat |
| krillin_10 | Krillin | Emergency Senzu Assist | heal / phys | heal → heal | regen (status, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| krillin_11 | Krillin | Blindside | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit | 260ms approach, hit contact, return-home recovery |
| tien_0 | Tien | Dodon Ray | attack / ki | beam → beam | beam-yellow (beam, 5 frames, temporal) | 1 hit | 190ms cast cue, 230ms travel, hit contact |
| tien_1 | Tien | Tri-Beam | attack / ki | beam → beam | beam-yellow (beam, 5 frames, temporal) | 1 hit; 8% max HP cost | 190ms cast cue, 230ms travel, hit contact |
| tien_2 | Tien | Neo Tri-Beam | attack / ki | special → special | beam-neo-tri (beam, generated three-pronged signature head) | 1 hit; 20% max HP cost | 190ms cast cue, 230ms travel, hit contact |
| tien_3 | Tien | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_4 | Tien | Multi-Form | stance / phys | buff → buff | teleport (teleport, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_5 | Tien | Telekinetic Pin | debuff / ki | flare → flare | telekinetic-pin (status, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_6 | Tien | Crane Counter | stance / ki | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_7 | Tien | Crane Guard | support / phys | guard → guard | barrier (status, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_8 | Tien | Concentration | stance / phys | buff → buff | aura-base (aura, 4 frames, pulse/variant) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_9 | Tien | Ki Disruption | debuff / ki | flare → flare | absorb (absorb, 4 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_10 | Tien | Last Stand | stance / phys | buff → buff | aura-rage (aura, 6 frames, pulse/variant) | no damage hits | 240ms stationary cue, authoritative status/heal result |
| tien_11 | Tien | Tactical Formation | support / phys | buff → buff | teleport (teleport, 5 frames, temporal) | no damage hits | 240ms stationary cue, authoritative status/heal result |

## Rage Arts

| ID | Hero | Technique | Element | Clip → visual clip | Registered VFX | Hits |
|---|---|---|---|---|---|---|
| rage_goku | Goku | Dragon Fist Fury | phys | teleport → teleport | impact-big (impact) | 5 |
| rage_gohan | Gohan | Explosive Rage | ki | special → special | aura-rage (aura) | 1 |
| rage_vegeta | Vegeta | Prince's Pride | ki | special → special | beam-purple (beam) | 1 |
| rage_piccolo | Piccolo | Namekian Resolve | phys | heal → heal | regen (status) | — |
| rage_trunks | Future Trunks | Heat Dome Sword Flash | phys | sword → sword | slash (slash) | 6 |
| rage_krillin | Krillin | Hero's Gambit | ki | disc → disc | disc (ball) | 1 |
| rage_tien | Tien | Tri-Beam Overdrive | ki | special → special | beam-yellow (beam) | 1 |

## Team combos

| ID | Technique | Members | Element | Visual clip | Registered VFX | Hits |
|---|---|---|---|---|---|---|
| father_son_strike | Father & Son Strike | goku + gohan | phys | heavy | impact-big (impact) | 3 |
| mentors_guard | Mentor's Guard | gohan + piccolo | phys | heavy | barrier (status) | 0 |
| double_saiyan_blast | Double Saiyan Blast | vegeta + trunks | ki | special | beam-purple (beam) | 2 |
| rival_assault | Rival Assault | goku + vegeta | phys | heavy | impact-big (impact) | 4 |
| solar_cage | Solar Cage | krillin + tien | ki | special | flare (status) | 0 |
| suppression | Suppression | piccolo + tien | ki | special | charge (aura) | 1 |
| cover_strike | Cover Strike | gohan + krillin | phys | heavy | impact-hit (impact) | 2 |

## Coverage gaps

- All 84 authored core skills have an authored action clip and VFX ID; each registry reference and resolved clip is checked by the runtime presentation audit.
- Physical generic special clips resolve to the close-range heavy clip. Ki generic special clips keep the ranged special clip. Authored beam, sword, disc, barrage, heal, buff, guard, flare and teleport clips remain intact.
- Flare-family casts place single-target cues on the selected enemy; all-target status flares are distributed over living opponents.
- Miss events preserve their hit position within multi-hit actions. Evades add a small motion-light sidestep, and a melee attacker returns home after its final miss; a real P01 Phaser capture covers evade contact using a test-only evade status.
- Resistance emits a presentation event and visible resisted callout. Enemy telegraphs stage a charge cue and mark their threatened target while preserving deterministic guard timing.
- Critical and heavy impacts, absorbed Ki, healing, guard grades, counters, buffs and status outcomes each retain separate visual feedback. Android 19 absorption uses a generated green temporal sequence; guard, counter and resistance use a generated hex-shield sequence.
- Signature VFX use dedicated cues for Piccolo Special Beam Cannon and Hellzone Grenade, Goku Spirit Bomb, Tien Neo Tri-Beam and Telekinetic Pin, Vegeta Final Flash, and Gohan Father-Son Kamehameha.
- Real Phaser evidence covers natural-route A04 absorption, Hellzone travel before damage, evade contact, guard feedback and pilot beam growth/contact beats. Remaining registered variants are deliberate single pulses or travel/rotation effects, not falsely presented as frame sequences. Human visual and play-feel approval remains pending.
