# Maps and interactables (generated)

## Frieza's Landing Plateau (`landing_future`, 40x26 tiles)

Music wasteland; encounters: none; props 12.

Entities: zone ×1, sign ×1, npc ×2, chest ×2, foe ×2

- npc `wit1`
- npc `wit2`
- chest `ch_land1`
- chest `ch_land2`
- foe `foe_p01` — story P01
- foe `foe_p02` — story P02

## Capsule Corporation (`capsule_corp`, 40x30 tiles)

Music hub; encounters: none; props 18.

Entities: save ×1, heal ×1, shop ×1, travel ×1, npc ×6, chest ×2, exit ×1

- save `save_cc`
- heal `heal_cc`
- shop `shop_cc`
- travel `travel_cc`
- npc `bulma` — story R02
- npc `researcher`
- npc `q_bulma_parts`
- npc `chichi`
- npc `yamcha`
- npc `sim_bulma` (when flag:postgame_unlocked)
- chest `ch_cc1` (when done:P02)
- chest `ch_cc2` (when done:P02)
- exit `cc_to_south`

## South City (`south_city`, 48x30 tiles)

Music city; encounters: south_city; props 34.

Entities: exit ×2, shop ×1, save ×1, heal ×1, foe ×3, npc ×4, pickup ×1, chest ×2

- exit `sc_to_cc`
- exit `sc_to_rocky`
- shop `shop_sc`
- save `save_sc`
- heal `heal_sc`
- foe `foe_a01` — story A01
- npc `q_shelter_keeper`
- foe `qf_evac1` (when quest:android_evacuations=active && !opened:defeated:qf_evac1)
- npc `q_civ1` (when quest:android_evacuations=active && opened:defeated:qf_evac1 && !flag:evac1_rescued)
- foe `qf_evac2` (when quest:android_evacuations=active && !opened:defeated:qf_evac2)
- npc `q_civ2` (when quest:android_evacuations=active && opened:defeated:qf_evac2 && !flag:evac2_rescued)
- pickup `pk_med_sc`
- chest `ch_sc_research` (when done:T01)
- chest `ch_sc1`
- npc `sc_civilian`

## Rocky Outskirts (`rocky_outskirts`, 50x30 tiles)

Music wasteland; encounters: rocky_outskirts; props 12.

Entities: exit ×3, save ×1, heal ×1, foe ×4, npc ×3, pickup ×1, chest ×2

- exit `ro_to_sc`
- exit `ro_to_lab`
- exit `ro_to_ginger`
- save `save_ro`
- heal `heal_ro`
- foe `foe_a02` — story A02
- npc `npc_a19` (when beat==A03) — story A03
- npc `npc_vegeta_a04` (when beat==A04) — story A04
- foe `foe_t02` — story T02
- foe `foe_t03` — story T03
- foe `foe_t04` — story T04
- pickup `pk_med_ro`
- chest `ch_ro1`
- chest `ch_ro2`
- npc `ro_wanderer`

## Mountain Lab (`mountain_lab`, 44x30 tiles)

Music lab; encounters: mountain_lab; props 9.

Entities: exit ×2, door ×1, save ×1, heal ×1, foe ×1, lever ×1, terminal ×1, pickup ×1, chest ×1, npc ×1

- exit `ml_to_ro`
- exit `ml_to_inner`
- save `save_ml`
- heal `heal_ml`
- foe `foe_a05` — story A05
- lever `lever_lab` (when done:A05)
- terminal `term_ml1`
- pickup `pk_med_ml`
- chest `ch_ml1`
- npc `ml_scientist`

## Android Laboratory (`lab_inner`, 40x28 tiles)

Music lab; encounters: lab_inner; props 8.

Entities: exit ×1, save ×1, heal ×1, foe ×3, terminal ×2, chest ×1, sign ×1

- exit `li_to_ml`
- save `save_li`
- heal `heal_li`
- foe `foe_a06` — story A06
- foe `foe_a07` — story A07
- foe `foe_a08` — story A08
- terminal `term_li1`
- terminal `term_li2`
- chest `ch_li1`

## Ginger Town (`gingertown`, 46x30 tiles)

Music mystery; encounters: gingertown; props 29.

Entities: exit ×2, save ×1, heal ×1, foe ×4, npc ×4, chest ×2

- exit `gt_to_ro`
- exit `gt_to_island`
- save `save_gt`
- heal `heal_gt`
- foe `foe_c01` — story C01
- foe `foe_c02` — story C02
- foe `foe_c03` — story C03
- npc `gt_clue1`
- npc `gt_clue2`
- npc `q_cellar_voice`
- foe `qf_ginger` (when quest:ginger_survivors=active && !opened:defeated:qf_ginger)
- npc `q_truck`
- chest `ch_gt1`
- chest `ch_gt2`

## Island Highway (`android_island`, 46x28 tiles)

Music island; encounters: android_island; props 9.

Entities: exit ×1, save ×1, heal ×1, travel ×1, foe ×2, npc ×2, terminal ×3, chest ×2

- exit `ai_to_gt`
- save `save_ai`
- heal `heal_ai`
- travel `travel_ai`
- foe `foe_h01` — story H01
- npc `npc_h02` (when beat==H02) — story H02
- foe `foe_h03` — story H03
- npc `q_relay_tech`
- terminal `relay_a` (when quest:island_signal=active && !flag:relay_a)
- terminal `relay_b` (when quest:island_signal=active && !flag:relay_b)
- terminal `relay_c` (when quest:island_signal=active && !flag:relay_c)
- chest `ch_ai1`
- chest `ch_ai2`

## Kami's Lookout (`lookout`, 32x24 tiles)

Music lookout; encounters: none; props 7.

Entities: exit ×1, save ×1, heal ×1, travel ×1, npc ×3, chest ×2

- exit `lk_to_chamber`
- save `save_lk`
- heal `heal_lk`
- travel `travel_lk`
- npc `npc_kami` (when beat==E_KAMI) — story E_KAMI
- npc `lk_popo` (when !beat==E_KAMI)
- npc `q_dende`
- chest `ch_lk_research` (when done:T01)
- chest `ch_lk1`

## Room of Spirit and Time (`time_chamber`, 36x22 tiles)

Music chamber; encounters: none; props 6.

Entities: exit ×1, save ×1, heal ×1, foe ×2, npc ×1, chest ×2

- exit `tc_to_lk`
- save `save_tc`
- heal `heal_tc`
- foe `foe_t01` — story T01
- foe `foe_r01` — story R01
- npc `q_chamber_master`
- chest `ch_tc_research`
- chest `ch_tc1`

## Cell Games Approach (`cell_games_approach`, 44x26 tiles)

Music cellGames; encounters: none; props 10.

Entities: exit ×1, save ×1, heal ×1, shop ×1, travel ×1, npc ×7, chest ×2

- exit `ca_to_arena`
- save `save_ca`
- heal `heal_ca`
- shop `shop_ca`
- travel `travel_ca`
- npc `ca_official`
- npc `q_healer`
- npc `q_scientist`
- npc `wit_a`
- npc `wit_b`
- npc `wit_c`
- npc `ca_satan`
- chest `ch_ca1`
- chest `ch_ca2`

## Cell Games Arena (`cell_games_arena`, 40x28 tiles)

Music cellGames; encounters: none; props 10.

Entities: exit ×1, foe ×7, npc ×2, save ×1, heal ×1

- exit `cg_back`
- foe `foe_g01` — story G01
- foe `foe_g02` — story G02
- foe `foe_g03` — story G03
- foe `foe_g04` — story G04
- foe `foe_g05` — story G05
- foe `foe_g06` — story G06
- foe `foe_g07` — story G07
- npc `cg_satan` (when !done:G04)
- npc `cg_vegeta` (when beat>=G03 && beat<G07)
- save `save_cg` (when !flag:games_started)
- heal `heal_cg` (when !flag:games_started)

## Quests

| id | window | giver | objectives | reward |
|---|---|---|---|---|
| android_evacuations | after A01, closes after A06 | q_shelter_keeper @ south_city | Rescue stranded civilians (2); Report back to the shelter keeper (1) | Supply Packs and Zeni |
| medicine_route | after A01, closes after C01 | bulma @ capsule_corp | Collect Lab Medicine (3); Deliver to Bulma (1) | Ki Capsules and a Focus Band |
| gero_records | after A05, closes after R01 | researcher @ capsule_corp | Recover Gero recordings (3); Hand them to the researcher (1) | 300 XP and an Anti-Drain Charm |
| ginger_survivors | after C01, closes after H01 | q_cellar_voice @ gingertown | Drive off the guardian and free the survivor (1); Bring the survivor to the evacuation truck (1) | A Senzu Bean and a Revive Seed |
| piccolo_training | after C02, closes after T04 | q_dende @ lookout | Win the Lookout protect trial (1) | 400 XP and a Guard Charm |
| island_signal | after H01, closes after T01 | q_relay_tech @ android_island | Disable tracker relays (3); Tell the technician (1) | A Speed Charm and 200 Zeni |
| capsule_research | after T01, closes after G01 | q_bulma_parts @ capsule_corp | Recover Research Components (3); Deliver to Bulma (1) | 500 Zeni and a Rage Charm |
| chamber_mastery | after T01, closes after G01 | q_chamber_master @ time_chamber | Win the three-fighter spar (1) | 500 XP and 2 Senzu Beans |
| earth_defenders | after R01, closes after G01 | q_healer @ cell_games_approach | Give the healers 3 Senzu Fragments and 2 Antidotes (1) | 350 XP, Large Ki Capsules and a Revive Seed |
| cell_games_witness | after R02, closes after G01 | q_scientist @ cell_games_approach | Interview witnesses at the approach (3); Report to the scientist (1) | 350 Zeni, a Scouter and Senzu Fragments |
