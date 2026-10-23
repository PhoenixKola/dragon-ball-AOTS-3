export interface QuestObjective {
  key: string;
  text: string;
  need: number;
}
export interface QuestDef {
  id: string;
  name: string;
  summary: string;
  /** available once this beat is completed (beat id; the previous beat must be done) */
  from: string;
  /** becomes unavailable (missed) once this beat is completed without finishing */
  until: string;
  giver: { map: string; npc: string };
  objectives: QuestObjective[];
  reward: { zeni?: number; xp?: number; items?: { id: string; n: number }[]; note: string };
  /** items consumed on completion (deliver quests) */
  consume?: { id: string; n: number }[];
  /** requires this flag to be active */
  requiresFlag?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'android_evacuations', name: 'Android Evacuations', from: 'A01', until: 'A06',
    summary: 'Frightened citizens are pinned down by probes in South City.',
    giver: { map: 'south_city', npc: 'q_shelter_keeper' },
    objectives: [{ key: 'rescued', text: 'Rescue stranded civilians', need: 2 }, { key: 'report', text: 'Report back to the shelter keeper', need: 1 }],
    reward: { zeni: 160, items: [{ id: 'supply_pack', n: 2 }], note: 'Supply Packs and Zeni' },
  },
  {
    id: 'medicine_route', name: 'The Medicine Route', from: 'A01', until: 'C01',
    summary: 'Bulma wants sterile medicine collected from three field depots for Goku\'s treatment team.',
    giver: { map: 'capsule_corp', npc: 'bulma' },
    objectives: [{ key: 'vials', text: 'Collect Lab Medicine', need: 3 }, { key: 'deliver', text: 'Deliver to Bulma', need: 1 }],
    consume: [{ id: 'lab_medicine', n: 3 }],
    reward: { items: [{ id: 'ki_capsule', n: 3 }, { id: 'focus_band', n: 1 }], note: 'Ki Capsules and a Focus Band' },
  },
  {
    id: 'gero_records', name: 'Gero\'s Recordings', from: 'A05', until: 'R01',
    summary: 'Recordings in the mountain lab explain what Dr. Gero\'s drones were for.',
    giver: { map: 'capsule_corp', npc: 'researcher' },
    objectives: [{ key: 'records', text: 'Recover Gero recordings', need: 3 }, { key: 'deliver', text: 'Hand them to the researcher', need: 1 }],
    consume: [{ id: 'gero_record', n: 3 }],
    reward: { xp: 300, items: [{ id: 'anti_drain_charm', n: 1 }], note: '300 XP and an Anti-Drain Charm' },
  },
  {
    id: 'ginger_survivors', name: 'Ginger Town Survivors', from: 'C01', until: 'H01',
    summary: 'A survivor is hiding in a cellar, guarded by a lurking horror.',
    giver: { map: 'gingertown', npc: 'q_cellar_voice' },
    objectives: [{ key: 'rescued', text: 'Drive off the guardian and free the survivor', need: 1 }, { key: 'evac', text: 'Bring the survivor to the evacuation truck', need: 1 }],
    reward: { items: [{ id: 'senzu_large', n: 1 }, { id: 'revive_seed', n: 1 }], note: 'A Senzu Bean and a Revive Seed' },
  },
  {
    id: 'piccolo_training', name: 'Piccolo\'s Trial', from: 'C02', until: 'T04', requiresFlag: 'piccolo_kami_merged',
    summary: 'Dende offers a protect-and-counter trial at the Lookout.',
    giver: { map: 'lookout', npc: 'q_dende' },
    objectives: [{ key: 'trial', text: 'Win the Lookout protect trial', need: 1 }],
    reward: { xp: 400, items: [{ id: 'guard_charm', n: 1 }], note: '400 XP and a Guard Charm' },
  },
  {
    id: 'island_signal', name: 'Island Signal', from: 'H01', until: 'T01',
    summary: 'Cell is tracking the Androids with relay beacons along the shore.',
    giver: { map: 'android_island', npc: 'q_relay_tech' },
    objectives: [{ key: 'relays', text: 'Disable tracker relays', need: 3 }, { key: 'report', text: 'Tell the technician', need: 1 }],
    reward: { items: [{ id: 'speed_charm', n: 1 }], zeni: 200, note: 'A Speed Charm and 200 Zeni' },
  },
  {
    id: 'capsule_research', name: 'Capsule Research', from: 'T01', until: 'G01',
    summary: 'Bulma needs three research components for the chamber apparatus.',
    giver: { map: 'capsule_corp', npc: 'q_bulma_parts' },
    objectives: [{ key: 'parts', text: 'Recover Research Components', need: 3 }, { key: 'deliver', text: 'Deliver to Bulma', need: 1 }],
    consume: [{ id: 'research_part', n: 3 }],
    reward: { zeni: 500, items: [{ id: 'rage_charm', n: 1 }], note: '500 Zeni and a Rage Charm' },
  },
  {
    id: 'chamber_mastery', name: 'Chamber Mastery', from: 'T01', until: 'G01',
    summary: 'A multi-fighter spar challenge in the Room of Spirit and Time.',
    giver: { map: 'time_chamber', npc: 'q_chamber_master' },
    objectives: [{ key: 'spar', text: 'Win the three-fighter spar', need: 1 }],
    reward: { xp: 500, items: [{ id: 'senzu_large', n: 2 }], note: '500 XP and 2 Senzu Beans' },
  },
  {
    id: 'earth_defenders', name: 'Earth\'s Defenders', from: 'R01', until: 'G01',
    summary: 'A healing station for the tournament needs supplies before the Games begin.',
    giver: { map: 'cell_games_approach', npc: 'q_healer' },
    objectives: [{ key: 'supplies', text: 'Give the healers 3 Senzu Fragments and 2 Antidotes', need: 1 }],
    consume: [{ id: 'senzu_small', n: 3 }, { id: 'antidote', n: 2 }],
    reward: { xp: 350, items: [{ id: 'ki_capsule_large', n: 2 }, { id: 'revive_seed', n: 1 }], note: '350 XP, Large Ki Capsules and a Revive Seed' },
  },
  {
    id: 'cell_games_witness', name: 'Witness Testimony', from: 'R02', until: 'G01',
    summary: 'A scientist is collecting testimony from people who have seen Cell.',
    giver: { map: 'cell_games_approach', npc: 'q_scientist' },
    objectives: [{ key: 'witnesses', text: 'Interview witnesses at the approach', need: 3 }, { key: 'report', text: 'Report to the scientist', need: 1 }],
    reward: { zeni: 350, items: [{ id: 'scouter', n: 1 }, { id: 'senzu_small', n: 3 }], note: '350 Zeni, a Scouter and Senzu Fragments' },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
