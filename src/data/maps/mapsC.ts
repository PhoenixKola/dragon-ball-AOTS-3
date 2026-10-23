import type { MapDef } from '../../types/script';
import { MB, chest, cond, exit, foe, npc, point, say } from './builder';

/* ========================================================================== android_island */
function island(): MapDef {
  const m = new MB('android_island', 'Island Highway', 46, 28, '.', 'coast');
  m.border('#', 1);
  m.speckle(',', '.', 6);
  m.fill(1, 1, 44, 5, '~').fill(1, 22, 44, 5, '~').fill(20, 6, 8, 16, '~').fill(1, 6, 18, 2, ',').fill(1, 20, 18, 2, ',');
  // road + bridge
  m.hpath(13, 1, 44, 3, '=');
  m.fill(20, 12, 8, 5, '=');
  m.fill(32, 8, 10, 4, '#').fill(32, 17, 10, 4, '#');
  m.prop('rock', 8, 9, 1, 1).prop('rock', 12, 18).prop('boulder', 14, 9, 2, 1).prop('boulder', 36, 8, 2, 1).prop('tree', 5, 8).prop('tree', 6, 19).row('tree', 30, 9, 2, 3).prop('pavilion', 36, 13, 4, 3, false);
  m.e(
    exit('ai_to_gt', 0, 12, 2, 5, { map: 'gingertown', x: 42, y: 16, facing: 'left' }),
    point('save', 'save_ai', 4, 16, { label: 'Save Terminal' }),
    point('heal', 'heal_ai', 8, 16, { label: 'Field Camp' }),
    point('travel', 'travel_ai', 8, 16, { label: 'Capsule Flyer' }),
    foe('foe_h01', 'Android 17', 'android-17', 14, 14, { story: 'H01', aggro: 80 }),
    npc('npc_h02', 'Android 16', 'android-16', 16, 14, [say('a16', 'Please stand behind me.')], { story: 'H02', when: 'beat==H02', facing: 'right' }),
    foe('foe_h03', 'Semi-Perfect Cell', 'cell-semi-perfect', 26, 14, { story: 'H03', aggro: 90 }),
    npc('q_relay_tech', 'Radio Technician', 'researcher', 10, 14, [
      cond('quest:island_signal=none', [
        cond('done:H01', [
          say('researcher', 'Something is tracking people along this shore with signal relays — I found three, hidden by the rocks. Switch them off before it can use them.'),
          { t: 'quest', id: 'island_signal', op: 'start' },
        ], [say('researcher', 'Do you hear that hum? Something is broadcasting from the rocks.')]),
      ], [
        cond('quest:island_signal=active', [
          cond('flag:relay_a && flag:relay_b && flag:relay_c', [
            say('researcher', 'All three silent — the island\'s dark again. Here, take this.'),
            { t: 'quest', id: 'island_signal', op: 'progress', key: 'report' },
            { t: 'quest', id: 'island_signal', op: 'complete' },
          ], [say('researcher', 'Three relays: two on the west shore, one past the bridge.')]),
        ], [say('researcher', 'The island is quiet. Thanks.')]),
      ]),
    ], { facing: 'right' }),
    point('terminal', 'relay_a', 8, 8, { label: 'Tracker Relay', when: 'quest:island_signal=active && !flag:relay_a', script: [say('narrator', 'You pull the cable out of the relay. Its light dies.'), { t: 'set', flag: 'relay_a' }, { t: 'quest', id: 'island_signal', op: 'progress', key: 'relays' }] }),
    point('terminal', 'relay_b', 12, 19, { label: 'Tracker Relay', when: 'quest:island_signal=active && !flag:relay_b', script: [say('narrator', 'The relay sputters and goes dark.'), { t: 'set', flag: 'relay_b' }, { t: 'quest', id: 'island_signal', op: 'progress', key: 'relays' }] }),
    point('terminal', 'relay_c', 38, 12, { label: 'Tracker Relay', when: 'quest:island_signal=active && !flag:relay_c', script: [say('narrator', 'You smash the final relay\'s antenna.'), { t: 'set', flag: 'relay_c' }, { t: 'quest', id: 'island_signal', op: 'progress', key: 'relays' }] }),
    chest('ch_ai1', 40, 15, { item: 'ki_capsule_large', n: 1 }),
    chest('ch_ai2', 3, 7, { zeni: 300 }),
  );
  return m.build({ spawn: { x: 3, y: 14 }, music: 'island', encounters: 'android_island', encounterRate: 0.017 });
}

/* ========================================================================== lookout */
function lookout(): MapDef {
  const m = new MB('lookout', 'Kami\'s Lookout', 32, 24, '~', 'sky');
  m.fill(4, 3, 24, 18, '.').fill(2, 6, 28, 12, '.').fill(14, 3, 4, 2, '=').fill(8, 6, 16, 14, ',').fill(15, 5, 2, 15, '=').fill(8, 12, 16, 2, '=');
  m.prop('palace', 11, 0, 10, 3, true).row('pillar', 8, 8, 2, 16).row('plant', 5, 8, 3, 4).prop('plant', 26, 14);
  m.e(
    exit('lk_to_chamber', 14, 3, 4, 2, { map: 'time_chamber', x: 17, y: 18, facing: 'up' }, { requires: 'beat>=T01', lockedText: 'The Room of Spirit and Time is sealed. Only Capsule Corp\'s plan can open it — later.' }),
    point('save', 'save_lk', 8, 15, { label: 'Save Terminal' }),
    point('heal', 'heal_lk', 24, 15, { label: 'Spring of Rest' }),
    point('travel', 'travel_lk', 16, 18, { label: 'Capsule Flyer' }),
    npc('npc_kami', 'Kami', 'kami', 16, 9, [say('kami', 'Piccolo. I have been waiting.')], { story: 'E_KAMI', when: 'beat==E_KAMI' }),
    npc('lk_popo', 'Lookout Attendant', 'kami', 20, 9, [
      cond('beat>=E_KAMI', [say('kami', 'Kami\'s presence is part of Piccolo now. The Lookout feels both emptier and fuller.')], [say('kami', 'Kami is waiting inside. Speak with him.')]),
    ], { when: '!beat==E_KAMI' }),
    npc('q_dende', 'Dende', 'kami', 11, 10, [
      cond('quest:piccolo_training=none', [
        cond('flag:piccolo_kami_merged', [
          say('kami', 'Piccolo, I\'d like to see how you and Kami fight as one. I\'ll summon training sentinels — protect the training stone while you beat them.'),
          { t: 'quest', id: 'piccolo_training', op: 'start' },
        ], [say('kami', 'Kami and Piccolo have much to discuss.')]),
      ], [
        cond('quest:piccolo_training=active', [
          cond('opened:side:Q_PICCOLO', [
            say('kami', 'Beautifully done! You held the stone without a scratch.'),
            { t: 'quest', id: 'piccolo_training', op: 'progress', key: 'trial' },
            { t: 'quest', id: 'piccolo_training', op: 'complete' },
          ], [
            say('kami', 'Ready for the trial?'),
            { t: 'ask', prompt: 'Begin the Lookout trial?', choices: [{ label: 'Begin', steps: [{ t: 'battle', stage: 'Q_PICCOLO' }] }, { label: 'Later', steps: [] }] },
            cond('opened:side:Q_PICCOLO', [
              say('kami', 'Beautifully done! You held the stone without a scratch.'),
              { t: 'quest', id: 'piccolo_training', op: 'progress', key: 'trial' },
              { t: 'quest', id: 'piccolo_training', op: 'complete' },
            ]),
          ]),
        ], [say('kami', 'Thank you for taking care of the Lookout.')]),
      ]),
    ]),
    chest('ch_lk_research', 26, 8, { item: 'research_part', n: 1, when: 'done:T01' }),
    chest('ch_lk1', 4, 9, { item: 'senzu_small', n: 2 }),
  );
  return m.build({ spawn: { x: 16, y: 16 }, music: 'lookout' });
}

/* ========================================================================== time_chamber */
function chamber(): MapDef {
  const m = new MB('time_chamber', 'Room of Spirit and Time', 36, 22, '.', 'void');
  m.border('#', 1);
  m.fill(2, 2, 32, 18, '.').speckle(',', '.', 8).fill(16, 2, 4, 18, '=').fill(2, 9, 32, 3, '=');
  m.row('pillar', 4, 4, 3, 12).row('pillar', 4, 16, 3, 12);
  m.e(
    exit('tc_to_lk', 16, 20, 4, 2, { map: 'lookout', x: 16, y: 6, facing: 'down' }),
    point('save', 'save_tc', 8, 12, { label: 'Save Terminal' }),
    point('heal', 'heal_tc', 28, 12, { label: 'Recovery Pad' }),
    foe('foe_t01', 'Training Sentinels', 'training-sentinel', 17, 7, { story: 'T01', aggro: 70, patrol: { dx: 24, dy: 0 } }),
    foe('foe_r01', 'Chamber Guardian', 'chamber-guardian', 17, 7, { story: 'R01', aggro: 70 }),
    npc('q_chamber_master', 'Chamber Instructor', 'kami', 28, 8, [
      cond('quest:chamber_mastery=none', [
        cond('done:T01', [
          say('kami', 'You\'ve felt the strain of the chamber. Care to try a three-fighter spar? Two sentinels and a guardian. Fight as a team.'),
          { t: 'quest', id: 'chamber_mastery', op: 'start' },
        ], [say('kami', 'Train hard. A year passes for every day outside.')]),
      ], [
        cond('quest:chamber_mastery=active', [
          cond('opened:side:Q_CHAMBER', [
            say('kami', 'A flawless spar. The chamber is proud of you.'),
            { t: 'quest', id: 'chamber_mastery', op: 'progress', key: 'spar' },
            { t: 'quest', id: 'chamber_mastery', op: 'complete' },
          ], [
            { t: 'ask', prompt: 'Begin the three-fighter spar?', choices: [{ label: 'Begin', steps: [{ t: 'battle', stage: 'Q_CHAMBER' }] }, { label: 'Later', steps: [] }] },
            cond('opened:side:Q_CHAMBER', [
              say('kami', 'A flawless spar. The chamber is proud of you.'),
              { t: 'quest', id: 'chamber_mastery', op: 'progress', key: 'spar' },
              { t: 'quest', id: 'chamber_mastery', op: 'complete' },
            ]),
          ]),
        ], [say('kami', 'Stay as long as you like.')]),
      ]),
    ]),
    chest('ch_tc_research', 30, 4, { item: 'research_part', n: 1 }),
    chest('ch_tc1', 5, 17, { item: 'ki_capsule_large', n: 2 }),
  );
  return m.build({ spawn: { x: 17, y: 17 }, music: 'chamber', light: 'bright' });
}

/* ========================================================================== cell_games_approach */
function approach(): MapDef {
  const m = new MB('cell_games_approach', 'Cell Games Approach', 44, 26, ',', 'arena');
  m.border('#', 1);
  m.speckle('.', ',', 5);
  m.hpath(12, 1, 42, 4, '=').fill(30, 8, 12, 12, '=').vpath(12, 3, 22, 3, '=');
  m.fill(4, 3, 12, 6, '#').fill(4, 17, 12, 6, '#').fill(18, 3, 10, 5, '#');
  m.prop('tent', 5, 5, 4, 3).prop('tent', 10, 5, 4, 3).prop('tent', 5, 19, 4, 3).prop('tent', 10, 19, 4, 3).prop('stall', 20, 4, 4, 3).row('bench', 22, 10, 3, 6, 2, 1).row('tree', 2, 10, 2, 8);
  m.e(
    exit('ca_to_arena', 42, 11, 2, 4, { map: 'cell_games_arena', x: 3, y: 14, facing: 'right' }, { requires: 'flag:ponr_accepted', lockedText: 'Speak with the tournament official before entering the arena.' }),
    point('save', 'save_ca', 18, 13, { label: 'Save Terminal' }),
    point('heal', 'heal_ca', 22, 13, { label: 'First Aid Station' }),
    point('shop', 'shop_ca', 22, 9, { shop: 'cell_games_approach', label: 'Tournament Stall' }),
    point('travel', 'travel_ca', 4, 13, { label: 'Capsule Flyer' }),
    npc('ca_official', 'Tournament Official', 'civilian', 38, 13, [
      cond('flag:games_started', [say('civilian', 'The tournament is underway. Good luck!')], [
        cond('flag:ponr_accepted', [say('civilian', 'You\'re cleared to enter the arena. The ring is just ahead.')], [
          say('civilian', 'Beyond this point there is no way back until the Games are decided. Make sure you are ready: heal, shop, finish what remains.'),
          { t: 'ask', prompt: 'Enter the Cell Games arena?', choices: [
            { label: 'Not yet', steps: [] },
            { label: 'Show me what I can still do', steps: [{ t: 'say', who: 'civilian', text: 'Unfinished optional quests will close once the Games begin. Check your Journal for any still marked active or available.' }] },
            { label: 'I\'m ready', steps: [{ t: 'set', flag: 'ponr_accepted' }, { t: 'say', who: 'civilian', text: 'The path is open. May the Earth be with you.' }] },
          ] },
        ]),
      ]),
    ], { facing: 'left' }),
    npc('q_healer', 'Medic', 'researcher', 20, 15, [
      cond('quest:earth_defenders=none', [
        cond('done:R01', [
          say('researcher', 'We\'re setting up a heal station for the fighters. We\'re short — three Senzu Fragments and two Antidotes would help everyone.'),
          { t: 'quest', id: 'earth_defenders', op: 'start' },
        ], [say('researcher', 'We\'re preparing the medical tent. It\'s going to be a long day.')]),
      ], [
        cond('quest:earth_defenders=active', [
          cond('item:senzu_small>=3 && item:antidote>=2', [
            say('researcher', 'That\'s everything we need! Thank you — truly.'),
            { t: 'quest', id: 'earth_defenders', op: 'progress', key: 'supplies' },
            { t: 'quest', id: 'earth_defenders', op: 'complete' },
          ], [say('researcher', 'Three Senzu Fragments and two Antidotes, please. You can buy them at the stall.')]),
        ], [say('researcher', 'The station is stocked. Thank you.')]),
      ]),
    ]),
    npc('q_scientist', 'Field Scientist', 'researcher', 26, 18, [
      cond('quest:cell_games_witness=none', [
        cond('done:R02', [
          say('researcher', 'I\'m recording everything people remember of Cell. If you talk to three spectators and tell me what you hear, I\'ll make it worth your while.'),
          { t: 'quest', id: 'cell_games_witness', op: 'start' },
        ], [say('researcher', 'Fascinating creature. Terrifying creature.')]),
      ], [
        cond('quest:cell_games_witness=active', [
          cond('flag:wit_a && flag:wit_b && flag:wit_c', [
            say('researcher', 'This is incredible testimony. Thank you — you\'ve helped the world remember.'),
            { t: 'quest', id: 'cell_games_witness', op: 'progress', key: 'report' },
            { t: 'quest', id: 'cell_games_witness', op: 'complete' },
          ], [say('researcher', 'Three spectators, please. They\'re around the tents and the benches.')]),
        ], [say('researcher', 'The record is in the archives.')]),
      ]),
    ]),
    npc('wit_a', 'Spectator', 'civilian', 8, 11, [
      say('civilian', 'I saw him swallow a whole city. Whole. He did not even blink.'),
      cond('quest:cell_games_witness=active && !flag:wit_a', [{ t: 'set', flag: 'wit_a' }, { t: 'quest', id: 'cell_games_witness', op: 'progress', key: 'witnesses' }]),
    ]),
    npc('wit_b', 'Spectator', 'civilian', 24, 11, [
      say('civilian', 'My neighbours packed up and left. I didn\'t. My family fought in every war this planet has had.'),
      cond('quest:cell_games_witness=active && !flag:wit_b', [{ t: 'set', flag: 'wit_b' }, { t: 'quest', id: 'cell_games_witness', op: 'progress', key: 'witnesses' }]),
    ]),
    npc('wit_c', 'Spectator', 'civilian', 34, 17, [
      say('civilian', 'That green creature smiled at me — no, at everyone. Like he was counting.'),
      cond('quest:cell_games_witness=active && !flag:wit_c', [{ t: 'set', flag: 'wit_c' }, { t: 'quest', id: 'cell_games_witness', op: 'progress', key: 'witnesses' }]),
    ]),
    npc('ca_satan', 'Mr. Satan', 'mr-satan', 33, 9, [
      say('satan', 'Ha ha! I am Hercule, World Champion! Cell is going down in one punch, you watch!'),
      say('narrator', 'Everyone politely avoids pointing out that Mr. Satan is not going to win.'),
    ]),
    chest('ch_ca1', 40, 21, { item: 'senzu_large', n: 1 }),
    chest('ch_ca2', 2, 22, { item: 'ki_capsule_large', n: 2 }),
  );
  return m.build({ spawn: { x: 5, y: 13 }, music: 'cellGames' });
}

/* ========================================================================== cell_games_arena */
function arena(): MapDef {
  const m = new MB('cell_games_arena', 'Cell Games Arena', 40, 28, '.', 'arena');
  m.border('#', 2);
  m.fill(1, 1, 38, 26, ',').fill(8, 7, 24, 15, '=').speckle('.', ',', 6).hpath(13, 1, 8, 3, '=');
  m.row('stand', 2, 2, 5, 7, 6, 3).row('stand', 2, 22, 5, 7, 6, 3);
  m.e(
    exit('cg_back', 0, 12, 2, 5, { map: 'cell_games_approach', x: 40, y: 13, facing: 'left' }, { requires: '!flag:games_started', lockedText: 'There is no turning back now.' }),
    foe('foe_g01', 'Perfect Cell', 'cell-perfect', 23, 14, { story: 'G01', aggro: 80 }),
    foe('foe_g02', 'Perfect Cell', 'cell-perfect', 23, 14, { story: 'G02', aggro: 80 }),
    foe('foe_g03', 'Cell Juniors', 'cell-junior', 22, 14, { story: 'G03', aggro: 80 }),
    foe('foe_g04', 'Cell Juniors', 'cell-junior', 22, 14, { story: 'G04', aggro: 80 }),
    foe('foe_g05', 'Perfect Cell', 'cell-perfect', 23, 14, { story: 'G05', aggro: 80 }),
    foe('foe_g06', 'Super Perfect Cell', 'cell-super-perfect', 23, 14, { story: 'G06', aggro: 80 }),
    foe('foe_g07', 'Super Perfect Cell', 'cell-super-perfect', 23, 14, { story: 'G07', aggro: 80 }),
    npc('cg_satan', 'Mr. Satan', 'mr-satan', 12, 9, [
      cond('done:G02', [say('satan', 'That kid... that kid is stronger than me? Maybe I should let him handle this one.')], [say('satan', 'Stand back, everybody! The champion will soften him up!')]),
    ], { when: '!done:G04' }),
    npc('cg_vegeta', 'Vegeta', 'vegeta-base', 10, 17, [say('vegeta', 'Do not wait for me. Everyone you protect is behind you.')], { when: 'beat>=G03 && beat<G07' }),
    point('save', 'save_cg', 3, 11, { label: 'Save Terminal', when: '!flag:games_started' }),
    point('heal', 'heal_cg', 3, 17, { label: 'Recovery Station', when: '!flag:games_started' }),
  );
  return m.build({ spawn: { x: 3, y: 14 }, music: 'cellGames' });
}

export const MAPS_C: MapDef[] = [island(), lookout(), chamber(), approach(), arena()];
