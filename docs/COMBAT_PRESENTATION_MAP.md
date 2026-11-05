# Combat presentation map (generated)

This map is generated from the authored data in `src/data/skills.ts`, the runtime VFX registry, and the presentation resolver. It covers **84 / 84 core techniques** plus Rage Arts and team combos. “Visual clip” is the Phaser action family; registered VFX stay distinct by their own IDs.

Frame labels distinguish authored temporal sequences from one-shot/variant artwork. This is an implementation inventory, not a human sign-off that every effect is visually perfect.

## Core techniques

| ID | Hero | Technique | Kind / element | Clip → visual clip | Registered VFX | Hits / charge |
|---|---|---|---|---|---|---|
| goku_0 | Goku | Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, pulse/variant) | 1 hit |
| goku_1 | Goku | Meteor Combination | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 4 hits |
| goku_2 | Goku | Afterimage | stance / phys | teleport → teleport | teleport (teleport, 5 frames, pulse/variant) | no damage hits |
| goku_3 | Goku | Instant Transmission Strike | attack / phys | teleport → teleport | teleport (teleport, 5 frames, pulse/variant) | 1 hit |
| goku_4 | Goku | Rapid Ki Shots | attack / ki | barrage → barrage | ball-blue (ball, 5 frames, pulse/variant) | 5 hits |
| goku_5 | Goku | Kai Barrage | attack / ki | barrage → barrage | burst (impact, 5 frames, pulse/variant) | 2 hits |
| goku_6 | Goku | Turtle School Guard | stance / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| goku_7 | Goku | Super Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, pulse/variant) | 1 hit; 1T charge |
| goku_8 | Goku | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits |
| goku_9 | Goku | Warp Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, pulse/variant) | 1 hit |
| goku_10 | Goku | Spirit Bomb | attack / ki | special → special | ball-blue (ball, 5 frames, pulse/variant) | 1 hit; 2T charge |
| goku_11 | Goku | SSJ Focus | stance / phys | buff → buff | aura-ssj (aura, 4 frames, pulse/variant) | no damage hits |
| gohan_0 | Gohan | Masenko | attack / ki | beam → beam | beam-gold (beam, 3 frames, pulse/variant) | 1 hit |
| gohan_1 | Gohan | Dragon Rush | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 3 hits |
| gohan_2 | Gohan | Energy Wave | attack / ki | blast → blast | burst (impact, 5 frames, pulse/variant) | 1 hit |
| gohan_3 | Gohan | Protective Stand | stance / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| gohan_4 | Gohan | Potential Burst | support / phys | buff → buff | aura-rage (aura, 6 frames, pulse/variant) | no damage hits |
| gohan_5 | Gohan | Counter Rush | stance / phys | guard → guard | impact-hit (impact, 4 frames, temporal) | no damage hits |
| gohan_6 | Gohan | Guided Blast | attack / ki | blast → blast | ball-yellow (ball, 3 frames, pulse/variant) | 2 hits |
| gohan_7 | Gohan | Super Kamehameha | attack / ki | beam → beam | beam-blue (beam, 4 frames, pulse/variant) | 1 hit |
| gohan_8 | Gohan | Hidden Power | attack / phys | special → heavy | aura-rage (aura, 6 frames, pulse/variant) | 1 hit |
| gohan_9 | Gohan | Father's Resolve | support / phys | buff → buff | regen (status, 5 frames, temporal) | no damage hits |
| gohan_10 | Gohan | SSJ2 Lightning Rush | attack / phys | melee → melee | lightning (status, 5 frames, pulse/variant) | 5 hits |
| gohan_11 | Gohan | Father–Son Kamehameha | special / ki | special → special | father-son (beam, 5 frames, pulse/variant) | 1 hit |
| vegeta_0 | Vegeta | Galick Gun | attack / ki | beam → beam | beam-purple (beam, 3 frames, pulse/variant) | 1 hit |
| vegeta_1 | Vegeta | Rapid Fire Ki | attack / ki | barrage → barrage | ball-yellow (ball, 3 frames, pulse/variant) | 5 hits |
| vegeta_2 | Vegeta | Dirty Fireworks | attack / ki | blast → blast | explosion (impact, 5 frames, pulse/variant) | 1 hit |
| vegeta_3 | Vegeta | Big Bang Attack | attack / ki | blast → blast | explosion (impact, 5 frames, pulse/variant) | 1 hit; 1T charge |
| vegeta_4 | Vegeta | Final Flash | attack / ki | beam → beam | beam-yellow (beam, 5 frames, pulse/variant) | 1 hit; 1T charge |
| vegeta_5 | Vegeta | Pride Stance | stance / phys | buff → buff | aura-base (aura, 4 frames, pulse/variant) | no damage hits |
| vegeta_6 | Vegeta | Saiyan Blitz | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 2 hits |
| vegeta_7 | Vegeta | Counterstrike | stance / phys | guard → guard | impact-big (impact, 3 frames, pulse/variant) | no damage hits |
| vegeta_8 | Vegeta | Energy Volley | attack / ki | barrage → barrage | burst (impact, 5 frames, pulse/variant) | 3 hits |
| vegeta_9 | Vegeta | Ascended Surge | attack / phys | special → heavy | impact-big (impact, 3 frames, pulse/variant) | 1 hit |
| vegeta_10 | Vegeta | Crush Cannon | attack / ki | beam → beam | beam-red (beam, 5 frames, pulse/variant) | 1 hit |
| vegeta_11 | Vegeta | Last Stand | attack / phys | special → heavy | aura-rage (aura, 6 frames, pulse/variant) | 1 hit |
| piccolo_0 | Piccolo | Special Beam Cannon | attack / ki | beam → beam | spiral (beam, 3 frames, pulse/variant) | 1 hit; 1T charge |
| piccolo_1 | Piccolo | Hellzone Grenade | attack / ki | barrage → barrage | ball-green (ball, 2 frames, pulse/variant) | 5 hits |
| piccolo_2 | Piccolo | Light Grenade | attack / ki | blast → blast | ball-green (ball, 2 frames, pulse/variant) | 1 hit |
| piccolo_3 | Piccolo | Explosive Wave | attack / ki | blast → blast | burst (impact, 5 frames, pulse/variant) | 1 hit |
| piccolo_4 | Piccolo | Regeneration | heal / phys | heal → heal | regen (status, 5 frames, temporal) | no damage hits |
| piccolo_5 | Piccolo | Namekian Guard | support / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| piccolo_6 | Piccolo | Extend Arm | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 1 hit |
| piccolo_7 | Piccolo | Ki Suppression | debuff / ki | flare → flare | charge (aura, 4 frames, pulse/variant) | no damage hits |
| piccolo_8 | Piccolo | Tactical Barrier | support / ki | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| piccolo_9 | Piccolo | Focused Piercer | attack / ki | beam → beam | beam-green (beam, 2 frames, pulse/variant) | 1 hit |
| piccolo_10 | Piccolo | Demon Hand | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit |
| piccolo_11 | Piccolo | Guardian's Vow | stance / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| trunks_0 | Future Trunks | Burning Attack | attack / ki | beam → beam | beam-yellow (beam, 5 frames, pulse/variant) | 1 hit |
| trunks_1 | Future Trunks | Finish Buster | attack / ki | blast → blast | ball-purple (ball, 4 frames, pulse/variant) | 2 hits |
| trunks_2 | Future Trunks | Shining Sword | attack / phys | sword → sword | slash (slash, 4 frames, pulse/variant) | 1 hit |
| trunks_3 | Future Trunks | Sword Breaker | attack / phys | sword → sword | slash (slash, 4 frames, pulse/variant) | 1 hit |
| trunks_4 | Future Trunks | Future Slash | attack / phys | sword → sword | slash (slash, 4 frames, pulse/variant) | 3 hits |
| trunks_5 | Future Trunks | Burning Wave | attack / ki | blast → blast | burst (impact, 5 frames, pulse/variant) | 1 hit |
| trunks_6 | Future Trunks | Side-step Counter | stance / phys | guard → guard | slash (slash, 4 frames, pulse/variant) | no damage hits |
| trunks_7 | Future Trunks | Photon Blade | attack / phys | sword → sword | slash (slash, 4 frames, pulse/variant) | 1 hit |
| trunks_8 | Future Trunks | Guard Break | attack / phys | sword → sword | impact-big (impact, 3 frames, pulse/variant) | 1 hit |
| trunks_9 | Future Trunks | Rapid Swordstorm | attack / phys | sword → sword | slash (slash, 4 frames, pulse/variant) | 6 hits |
| trunks_10 | Future Trunks | Ultra Burst | attack / ki | special → special | explosion (impact, 5 frames, pulse/variant) | 1 hit |
| trunks_11 | Future Trunks | Power-Weight Strike | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit |
| krillin_0 | Krillin | Destructo Disc | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 1 hit |
| krillin_1 | Krillin | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits |
| krillin_2 | Krillin | Scatter Shot | attack / ki | barrage → barrage | ball-yellow (ball, 3 frames, pulse/variant) | 4 hits |
| krillin_3 | Krillin | Double Disc | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 2 hits |
| krillin_4 | Krillin | Energy Mine | debuff / ki | blast → blast | ball-red (ball, 3 frames, pulse/variant) | no damage hits |
| krillin_5 | Krillin | Quick Step | stance / phys | teleport → teleport | teleport (teleport, 5 frames, pulse/variant) | no damage hits |
| krillin_6 | Krillin | Ally Cover | support / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| krillin_7 | Krillin | Focused Ki | support / ki | buff → buff | regen (status, 5 frames, temporal) | no damage hits |
| krillin_8 | Krillin | Coordinated Rush | attack / phys | melee → melee | impact-hit (impact, 4 frames, temporal) | 1 hit |
| krillin_9 | Krillin | Disc Storm | attack / ki | disc → disc | disc (ball, 4 frames, pulse/variant) | 3 hits |
| krillin_10 | Krillin | Emergency Senzu Assist | heal / phys | heal → heal | regen (status, 5 frames, temporal) | no damage hits |
| krillin_11 | Krillin | Blindside | attack / phys | melee → melee | impact-big (impact, 3 frames, pulse/variant) | 1 hit |
| tien_0 | Tien | Dodon Ray | attack / ki | beam → beam | beam-yellow (beam, 5 frames, pulse/variant) | 1 hit |
| tien_1 | Tien | Tri-Beam | attack / ki | beam → beam | beam-yellow (beam, 5 frames, pulse/variant) | 1 hit |
| tien_2 | Tien | Neo Tri-Beam | attack / ki | special → special | beam-yellow (beam, 5 frames, pulse/variant) | 1 hit |
| tien_3 | Tien | Solar Flare | debuff / phys | flare → flare | flare (status, 3 frames, pulse/variant) | no damage hits |
| tien_4 | Tien | Multi-Form | stance / phys | buff → buff | teleport (teleport, 5 frames, pulse/variant) | no damage hits |
| tien_5 | Tien | Telekinetic Pin | debuff / ki | flare → flare | charge (aura, 4 frames, pulse/variant) | no damage hits |
| tien_6 | Tien | Crane Counter | stance / ki | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| tien_7 | Tien | Crane Guard | support / phys | guard → guard | barrier (status, 4 frames, pulse/variant) | no damage hits |
| tien_8 | Tien | Concentration | stance / phys | buff → buff | aura-base (aura, 4 frames, pulse/variant) | no damage hits |
| tien_9 | Tien | Ki Disruption | debuff / ki | flare → flare | absorb (absorb, 5 frames, pulse/variant) | no damage hits |
| tien_10 | Tien | Last Stand | stance / phys | buff → buff | aura-rage (aura, 6 frames, pulse/variant) | no damage hits |
| tien_11 | Tien | Tactical Formation | support / phys | buff → buff | teleport (teleport, 5 frames, pulse/variant) | no damage hits |

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
- Physical generic `special` clips resolve to the close-range heavy clip. Ki generic `special` clips keep the ranged special clip. Explicitly authored beam, sword, disc, barrage, heal, buff, guard, flare and teleport clips remain intact.
- Flare-family casts place single-target cues on the selected enemy; all-target status flares are distributed over living opponents.
- The map records exactly which cues are genuine temporal sequences; remaining pulse/variant cues still need authored frame animation where the moment benefits from it. Family/signature quality and impact/audio phase timing still require visual rollout and review.
