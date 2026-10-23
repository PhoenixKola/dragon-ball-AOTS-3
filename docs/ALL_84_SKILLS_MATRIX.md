# All 84 skills (generated from src/data/skills.ts)

Each hero has 12 techniques, four equippable slots, plus a Rage Art, Sparking, forms and combos outside the slots. "Mechanics" is derived from the data fields the engine interprets.

## Goku — Precision striker

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| goku_0 | Kamehameha | L1 | attack / enemy (ki) | 8 Ki | 1.6 | — | — |
| goku_1 | Meteor Combination | L3 | attack / enemy (phys) | 10 Ki | 0.45+0.45+0.45+0.5 | — | — |
| goku_2 | Afterimage | L5 | stance / self (phys) | 8 Ki | — | evade 3t | — |
| goku_3 | Instant Transmission Strike | L7 | attack / enemy (phys) | 12 Ki | 1.5 | pierce 50% DEF; never misses; evade 2t | — |
| goku_4 | Rapid Ki Shots | L9 | attack / randomEnemies (ki) | 9 Ki | 0.32+0.32+0.32+0.32+0.32 | — | — |
| goku_5 | Kai Barrage | L11 | attack / allEnemies (ki) | 12 Ki | 0.55+0.55 | HP cost 8%; [hpFloor] | — |
| goku_6 | Turtle School Guard | L13 | stance / self (phys) | 4 Ki | — | heavyGuard 1t | — |
| goku_7 | Super Kamehameha | L15 | attack / enemy (ki) | 20 Ki | 3.4 | charge 1 turn(s) | — |
| goku_8 | Solar Flare | L10 | debuff / allEnemies (phys) | 8 Ki | — | blind 85% 2t | — |
| goku_9 | Warp Kamehameha | L20 | attack / enemy (ki) | 24 Ki | 2.2 | pierce 60% DEF; never misses | form ssj |
| goku_10 | Spirit Bomb | L25 | attack / allEnemies (ki) | 30 Ki | 5 | charge 2 turn(s); 1x per battle | flag goku_recovered |
| goku_11 | SSJ Focus | L16 | stance / self (phys) | 6 Ki | — | focus 3t | form ssj |

Rage Art: **Dragon Fist Fury** — Five unmissable teleporting strikes ignoring 40% DEF.

## Gohan — Growth / support

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| gohan_0 | Masenko | L1 | attack / enemy (ki) | 8 Ki | 1.5 | — | — |
| gohan_1 | Dragon Rush | L3 | attack / enemy (phys) | 10 Ki | 0.55+0.55+0.6 | — | — |
| gohan_2 | Energy Wave | L5 | attack / allEnemies (ki) | 12 Ki | 0.9 | — | — |
| gohan_3 | Protective Stand | L7 | stance / self (phys) | 8 Ki | — | cover 3t | — |
| gohan_4 | Potential Burst | L9 | support / self (phys) | 0 Ki | — | HP cost 10%; atkUp 3t; [rage30,hpFloor] | — |
| gohan_5 | Counter Rush | L11 | stance / self (phys) | 8 Ki | — | counter 2t | — |
| gohan_6 | Guided Blast | L13 | attack / enemy (ki) | 12 Ki | 0.85+0.85 | never misses | — |
| gohan_7 | Super Kamehameha | L18 | attack / enemy (ki) | 22 Ki | 2.8 | Rage cost 30 | — |
| gohan_8 | Hidden Power | L21 | attack / enemy (phys) | 14 Ki | 1.2 | [missingHpScale] | — |
| gohan_9 | Father's Resolve | L15 | support / allAllies (phys) | 18 Ki | — | defUp 3t; regen 3t | flag goku_sick |
| gohan_10 | SSJ2 Lightning Rush | L1 | attack / enemy (phys) | 26 Ki | 0.6+0.6+0.6+0.6+0.75 | stun 30% 1t | form ssj2 |
| gohan_11 | Father–Son Kamehameha | L1 | special / enemy (ki) | 0 Ki | 1 | [finisher] | form ssj2, flag goku_sacrifice, story only |

Rage Art: **Explosive Rage** — Damage 3.0x growing to 6.0x as Gohan's HP falls.

## Vegeta — Burst attacker

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| vegeta_0 | Galick Gun | L1 | attack / enemy (ki) | 9 Ki | 1.7 | — | — |
| vegeta_1 | Rapid Fire Ki | L3 | attack / enemy (ki) | 9 Ki | 0.3+0.3+0.3+0.3+0.3 | — | — |
| vegeta_2 | Dirty Fireworks | L5 | attack / allEnemies (ki) | 14 Ki | 0.95 | stun 30% 1t | — |
| vegeta_3 | Big Bang Attack | L8 | attack / enemy (ki) | 18 Ki | 2.6 | splash 50%; charge 1 turn(s) | — |
| vegeta_4 | Final Flash | L16 | attack / enemy (ki) | 30 Ki | 3.4 | pierce 35% DEF; charge 1 turn(s) | — |
| vegeta_5 | Pride Stance | L7 | stance / self (phys) | 6 Ki | — | atkUp 4t; defDown 4t | — |
| vegeta_6 | Saiyan Blitz | L10 | attack / enemy (phys) | 6 Ki | 0.8+0.85 | [critRefund8] | — |
| vegeta_7 | Counterstrike | L12 | stance / self (phys) | 10 Ki | — | counter 2t; [counterAny] | — |
| vegeta_8 | Energy Volley | L14 | attack / allEnemies (ki) | 16 Ki | 0.45+0.45+0.45 | — | — |
| vegeta_9 | Ascended Surge | L20 | attack / enemy (phys) | 16 Ki | 2.4 | pierce 30% DEF; HP cost 6%; [hpFloor] | form ascended |
| vegeta_10 | Crush Cannon | L18 | attack / enemy (ki) | 14 Ki | 2.2 | defDown 3t | — |
| vegeta_11 | Last Stand | L24 | attack / enemy (phys) | 8 Ki | 2.8 | atkUp 4t | HP<35% |

Rage Art: **Prince's Pride** — 3.0x to all enemies and +25% ATK for 2 turns.

## Piccolo — Tank / control

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| piccolo_0 | Special Beam Cannon | L1 | attack / enemy (ki) | 18 Ki | 3 | pierce 60% DEF; charge 1 turn(s) | — |
| piccolo_1 | Hellzone Grenade | L3 | attack / randomEnemies (ki) | 16 Ki | 0.45+0.45+0.45+0.45+0.45 | — | — |
| piccolo_2 | Light Grenade | L6 | attack / allEnemies (ki) | 20 Ki | 1.2 | — | — |
| piccolo_3 | Explosive Wave | L8 | attack / allEnemies (ki) | 14 Ki | 0.85 | atkDown 3t | — |
| piccolo_4 | Regeneration | L2 | heal / self (phys) | 14 Ki | — | heal 25%; regen 4t | — |
| piccolo_5 | Namekian Guard | L4 | support / ally (phys) | 10 Ki | — | heal 8%; defUp 4t | — |
| piccolo_6 | Extend Arm | L5 | attack / enemy (phys) | 6 Ki | 1.1 | stun 35% 1t | — |
| piccolo_7 | Ki Suppression | L10 | debuff / enemy (ki) | 12 Ki | — | seal 65% 2t | — |
| piccolo_8 | Tactical Barrier | L12 | support / allAllies (ki) | 20 Ki | — | barrier 4t; [barrierScale] | — |
| piccolo_9 | Focused Piercer | L14 | attack / enemy (ki) | 12 Ki | 2 | pierce 80% DEF | — |
| piccolo_10 | Demon Hand | L17 | attack / enemy (phys) | 12 Ki | 2 | lifesteal 25% | — |
| piccolo_11 | Guardian's Vow | L19 | stance / self (phys) | 22 Ki | — | cover 3t; regen 3t | flag piccolo_kami_merged |

Rage Art: **Namekian Resolve** — Heals the party 30% HP and cleanses debuffs.

## Future Trunks — Sword/Ki hybrid

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| trunks_0 | Burning Attack | L1 | attack / enemy (ki) | 9 Ki | 1.5 | — | — |
| trunks_1 | Finish Buster | L8 | attack / enemy (ki) | 20 Ki | 1.2+1.2 | never misses | — |
| trunks_2 | Shining Sword | L1 | attack / enemy (phys) | 8 Ki | 1.6 | — | — |
| trunks_3 | Sword Breaker | L3 | attack / enemy (phys) | 10 Ki | 1.3 | defDown 3t | — |
| trunks_4 | Future Slash | L6 | attack / enemy (phys) | 12 Ki | 0.6+0.6+0.65 | — | — |
| trunks_5 | Burning Wave | L10 | attack / enemy (ki) | 12 Ki | 1.5 | splash 60% | — |
| trunks_6 | Side-step Counter | L4 | stance / self (phys) | 8 Ki | — | evade 2t; counter 2t; [counterAny] | — |
| trunks_7 | Photon Blade | L13 | attack / enemy (phys) | 10 Ki | 2 | pierce 60% DEF | — |
| trunks_8 | Guard Break | L9 | attack / enemy (phys) | 9 Ki | 1.2 | [guardBreak] | — |
| trunks_9 | Rapid Swordstorm | L17 | attack / randomEnemies (phys) | 18 Ki | 0.3+0.3+0.3+0.3+0.3+0.3 | — | — |
| trunks_10 | Ultra Burst | L21 | attack / enemy (ki) | 28 Ki | 4 | spdDown 2t | form ultra |
| trunks_11 | Power-Weight Strike | L24 | attack / enemy (phys) | 14 Ki | 2.6 | [noCounter] | form ultra |

Rage Art: **Heat Dome Sword Flash** — Six piercing sword hits (0.9x, 50% DEF pierce) on random enemies.

## Krillin — Support / debuff

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| krillin_0 | Destructo Disc | L1 | attack / enemy (ki) | 10 Ki | 1.6 | pierce 50% DEF | — |
| krillin_1 | Solar Flare | L2 | debuff / allEnemies (phys) | 8 Ki | — | blind 80% 3t; stun 20% 1t | — |
| krillin_2 | Scatter Shot | L4 | attack / randomEnemies (ki) | 8 Ki | 0.35+0.35+0.35+0.35 | — | — |
| krillin_3 | Double Disc | L9 | attack / enemy (ki) | 16 Ki | 1+1 | pierce 40% DEF | — |
| krillin_4 | Energy Mine | L6 | debuff / enemy (ki) | 12 Ki | — | mine 2t | — |
| krillin_5 | Quick Step | L3 | stance / self (phys) | 6 Ki | — | evade 3t; spdUp 3t | — |
| krillin_6 | Ally Cover | L5 | support / ally (phys) | 8 Ki | — | [coverAlly] | — |
| krillin_7 | Focused Ki | L7 | support / ally (ki) | 5 Ki | — | atkUp 4t | — |
| krillin_8 | Coordinated Rush | L11 | attack / enemy (phys) | 10 Ki | 0.9 | marked 3t | — |
| krillin_9 | Disc Storm | L18 | attack / allEnemies (ki) | 24 Ki | 0.5+0.5+0.5 | pierce 40% DEF | — |
| krillin_10 | Emergency Senzu Assist | L13 | heal / anyAlly (phys) | 20 Ki | — | heal 40%; revive; 2x per battle | — |
| krillin_11 | Blindside | L15 | attack / enemy (phys) | 10 Ki | 2 | [critVsDisabled] | — |

Rage Art: **Hero's Gambit** — A perfect Destructo Disc: 3.0x, 50% pierce, guaranteed crit; party Ki +20.

## Tien — Control / high risk

| id | name | unlock | kind / target | cost | hits | special mechanics | requires |
|---|---|---|---|---|---|---|---|
| tien_0 | Dodon Ray | L1 | attack / enemy (ki) | 8 Ki | 1.5 | pierce 30% DEF | — |
| tien_1 | Tri-Beam | L4 | attack / enemy (ki) | 12 Ki | 2 | HP cost 8%; [hpFloor] | — |
| tien_2 | Neo Tri-Beam | L16 | attack / enemy (ki) | 20 Ki | 3.8 | pierce 50% DEF; HP cost 20%; [hpFloor] | — |
| tien_3 | Solar Flare | L2 | debuff / enemy (phys) | 8 Ki | — | blind 3t; stun 50% 1t; atkDown 3t | — |
| tien_4 | Multi-Form | L9 | stance / self (phys) | 14 Ki | — | multiform 4t; evade 4t | — |
| tien_5 | Telekinetic Pin | L5 | debuff / enemy (ki) | 10 Ki | — | stun 60% 1t; spdDown 3t | — |
| tien_6 | Crane Counter | L11 | stance / self (ki) | 10 Ki | — | reflect 2t | — |
| tien_7 | Crane Guard | L3 | support / allAllies (phys) | 12 Ki | — | defUp 3t; heavyGuard 1t | — |
| tien_8 | Concentration | L7 | stance / self (phys) | 6 Ki | — | accUp 4t; critUp 4t; atkUp 4t | — |
| tien_9 | Ki Disruption | L13 | debuff / enemy (ki) | 10 Ki | — | drain 30 Ki; seal 40% 1t | — |
| tien_10 | Last Stand | L19 | stance / self (phys) | 8 Ki | — | endure 3t; atkUp 4t | HP<50% |
| tien_11 | Tactical Formation | L22 | support / allAllies (phys) | 16 Ki | — | spdUp 3t; evade 3t | — |

Rage Art: **Tri-Beam Overdrive** — 3.0x ignoring 70% DEF and a guaranteed stun.

## Team combos

| id | name | members | Ki each | effect |
|---|---|---|---|---|
| father_son_strike | Father & Son Strike | goku + gohan | 14 | Goku and Gohan strike in tandem: three hits (1.2x, 1.2x, 1.5x). |
| mentors_guard | Mentor's Guard | gohan + piccolo | 12 | Piccolo and Gohan form a guard: the whole party gains +30% DEF and Barrier 50 for 3 turns. |
| double_saiyan_blast | Double Saiyan Blast | vegeta + trunks | 18 | Vegeta and Trunks fire together: two 1.8x beams that pierce 30% DEF. |
| rival_assault | Rival Assault | goku + vegeta | 20 | Rivals trading blows: four 1.4x hits on one enemy. |
| solar_cage | Solar Cage | krillin + tien | 10 | Dual Solar Flares: blind all enemies 3 turns and 60% to stun each. |
| suppression | Suppression | piccolo + tien | 14 | Seal all enemies for 2 turns, slow them 25% and deal 0.8x. |
| cover_strike | Cover Strike | gohan + krillin | 10 | Krillin feints, Gohan follows: two 1.3x hits and the enemy is marked (+30%). |
