import type { MapDef } from '../../types/script';
import { MB, T, chest, cond, exit, foe, npc, point, say, set, zone } from './builder';

/* ========================================================================== landing_future (prologue) */
function landing(): MapDef {
  const m = new MB('landing_future', 'Frieza\'s Landing Plateau', 40, 26, ',', 'wasteland');
  m.border('#', 2);
  m.speckle('.', ',', 5);
  // dirt road winding from the time machine in the west to the ship in the east
  m.hpath(20, 3, 16, 3).vpath(15, 12, 22, 2).hpath(12, 15, 30, 3).vpath(29, 8, 14, 3).hpath(8, 29, 36, 3);
  // cliffs
  m.fill(8, 4, 8, 4, '#').fill(8, 8, 2, 2, '#').fill(18, 14, 6, 4, '#').fill(22, 20, 10, 3, '#').fill(4, 12, 6, 3, '#').fill(24, 3, 3, 5, '#').fill(34, 14, 4, 6, '#');
  m.prop('timemachine', 3, 22, 3, 2).prop('ship', 31, 3, 6, 4);
  m.row('rock', 10, 18, 3, 3).row('boulder', 18, 10, 3, 5, 2, 1).prop('rubble', 26, 10, 2, 1).prop('rubble', 12, 14, 2, 1).prop('rock', 20, 22).prop('rock', 6, 18);
  m.e(
    zone('intro', 3, 19, 6, 5, { script: [{ t: 'once', id: 'opening', steps: [{ t: 'cutscene', id: 'opening' }] }] }),
    point('sign', 'sign_controls', 6, 19, { text: 'Move: WASD / arrows. Interact: E / Enter / Space. Menu: Tab. Troopers ahead — walk into them (or press E) to fight. Guard: press 1 when the ring closes.' }),
    npc('wit1', 'Witness', 'civilian', 9, 21, [say('civilian', 'I saw the sky split open — and then a boy with a sword stepped out. Whoever he is, he\'s the only thing between us and those soldiers.')]),
    npc('wit2', 'Survivor', 'civilian', 14, 9, [say('civilian', 'Frieza\'s men have been on the plateau all morning. They took everything. Be careful — they have a ship further east.')], { facing: 'left' }),
    chest('ch_land1', 8, 10, { item: 'senzu_small', n: 2 }),
    chest('ch_land2', 31, 19, { item: 'ki_capsule', n: 2 }),
    foe('foe_p01', 'Landing Troopers', 'landing-security', 21, 12, { story: 'P01', aggro: 70, patrol: { dx: 20, dy: 0 } }),
    foe('foe_p02', 'Mecha Frieza', 'mecha-frieza', 31, 10, { story: 'P02', aggro: 76 }),
  );
  return m.build({ spawn: { x: 5, y: 21 }, music: 'wasteland', weather: 'dust' });
}

/* ========================================================================== capsule_corp (hub) */
function capsule(): MapDef {
  const m = new MB('capsule_corp', 'Capsule Corporation', 40, 30, ',', 'city');
  m.border('#', 1);
  m.speckle('.', ',', 6);
  // paved courtyard
  m.fill(6, 11, 28, 15, '=').fill(18, 9, 4, 3, '=').fill(36, 13, 4, 4, '=');
  // main building
  m.fill(8, 2, 24, 8, '#');
  m.prop('building_big', 8, 3, 6, 4).prop('building_big', 26, 3, 6, 4).prop('capsule_dome', 14, 2, 12, 7);
  m.row('tree', 3, 12, 4, 2).row('tree', 35, 20, 3, 2).row('lamp', 8, 11, 4, 8, 1, 1, true).row('bench', 12, 24, 2, 8, 2, 1);
  m.prop('car', 4, 22, 2, 1).prop('car', 31, 24, 2, 1);
  m.e(
    point('save', 'save_cc', 16, 13, { label: 'Save Terminal' }),
    point('heal', 'heal_cc', 24, 13, { label: 'Recovery Pod' }),
    point('shop', 'shop_cc', 12, 13, { shop: 'capsule_corp', label: 'Capsule Corp Supply' }),
    point('travel', 'travel_cc', 16, 24, { label: 'Capsule Flyer' }),
    // Bulma — also the R02 exam trigger and medicine quest giver
    npc('bulma', 'Bulma', 'bulma', 20, 13, [
      cond('beat==R02', [], [
        cond('flag:postgame_unlocked', [say('bulma', 'Welcome home, hero. The simulation room is open if you want to keep training — it does not change anything that really happened.')], [
          cond('quest:medicine_route=none', [
            say('bulma', 'Hold on a moment. Goku\'s treatment team is short on sterile medicine. If you find three vials in the field depots, bring them back and I\'ll make it worth your while.'),
            { t: 'quest', id: 'medicine_route', op: 'start' },
          ], [
            cond('quest:medicine_route=active', [
              cond('item:lab_medicine>=3', [
                say('bulma', 'Three vials — perfect! The team can make a full batch now.'),
                { t: 'quest', id: 'medicine_route', op: 'progress', key: 'deliver' },
                { t: 'quest', id: 'medicine_route', op: 'complete' },
              ], [say('bulma', 'Still looking for the vials? I need three. Check the Rocky Outskirts, South City and the lab.')]),
            ], [say('bulma', 'The Androids and that thing in Ginger Town... I\'ll keep the lab running. Try to stay in one piece, all of you.')]),
          ]),
        ]),
      ]),
    ], { story: 'R02' }),
    npc('researcher', 'Dr. Brief\'s Researcher', 'researcher', 27, 17, [
      cond('quest:gero_records=none', [
        cond('flag:gero_fled', [
          say('researcher', 'Dr. Gero\'s drones keep one recording per terminal. If you can recover three recordings from his lab, I can finally trace how they were built.'),
          { t: 'quest', id: 'gero_records', op: 'start' },
        ], [say('researcher', 'We\'ve been analysing the probe wreckage. Someone designed these things to learn.')]),
      ], [
        cond('quest:gero_records=active', [
          cond('item:gero_record>=3', [
            say('researcher', 'All three! This explains the drain mechanism. Here — a charm built from that research.'),
            { t: 'quest', id: 'gero_records', op: 'progress', key: 'deliver' },
            { t: 'quest', id: 'gero_records', op: 'complete' },
          ], [say('researcher', 'Three recordings from the mountain lab, please. They\'re on terminals.')]),
        ], [say('researcher', 'The data is fascinating — and frightening.')]),
      ]),
    ]),
    npc('q_bulma_parts', 'Capsule Engineer', 'researcher', 10, 19, [
      cond('quest:capsule_research=none', [
        cond('done:T01', [
          say('researcher', 'We\'re short on chamber apparatus parts. Three research components — one in South City, one at the Lookout, one inside the chamber. Bring them here.'),
          { t: 'quest', id: 'capsule_research', op: 'start' },
        ], [say('researcher', 'Bulma\'s redesigning the chamber console. Come back when you\'ve trained a little.')]),
      ], [
        cond('quest:capsule_research=active', [
          cond('item:research_part>=3', [
            say('researcher', 'That\'s everything. The console will run twice as long now!'),
            { t: 'quest', id: 'capsule_research', op: 'progress', key: 'deliver' },
            { t: 'quest', id: 'capsule_research', op: 'complete' },
          ], [say('researcher', 'Three components, please.')]),
        ], [say('researcher', 'Everything is humming nicely, thanks to you.')]),
      ]),
    ]),
    npc('chichi', 'Chi-Chi', 'chi-chi', 29, 20, [
      cond('beat>=G01', [say('chichi', 'He\'s fighting for all of us. Gohan... please come home safe.')], [
        cond('beat>=R01', [say('chichi', 'Goku and Gohan came back from that room with a year\'s worth of training and a day\'s worth of sleep. Eat something!')], [
          say('chichi', 'Is Gohan studying enough? He keeps running off to fight! If anything happens to him, I\'ll never forgive any of you.'),
        ]),
      ]),
    ]),
    npc('yamcha', 'Yamcha', 'yamcha', 13, 21, [
      cond('flag:goku_sick', [say('yamcha', 'Goku\'s resting, and the medicine works, but it\'ll take time. Android 19 was just the beginning, you know.')], [say('yamcha', 'Training? Sure. Somebody has to keep the baseball team in shape!')]),
    ], { facing: 'right' }),
    npc('sim_bulma', 'Simulation Console', 'bulma', 31, 13, [
      cond('flag:postgame_unlocked', [
        say('bulma', 'These simulations replay the Cell Games from recorded data. Nothing here is canon — fallen fighters can join in. Pick a scenario.'),
        {
          t: 'ask', prompt: 'Choose a simulation.', choices: [
            { label: 'Cell Junior Swarm (easy)', steps: [{ t: 'battle', stage: 'SIM_JUNIORS' }] },
            { label: 'Perfect Cell', steps: [{ t: 'battle', stage: 'SIM_PERFECT' }] },
            { label: 'Super Perfect Cell', steps: [{ t: 'battle', stage: 'SIM_SUPER' }] },
            { label: 'Not now', steps: [] },
          ],
        },
      ], [say('bulma', 'The simulation room isn\'t finished yet. Maybe after the tournament.')]),
    ], { when: 'flag:postgame_unlocked' }),
    chest('ch_cc1', 35, 7, { item: 'ki_capsule', n: 2, when: 'done:P02' }),
    chest('ch_cc2', 5, 6, { zeni: 250, when: 'done:P02' }),
    exit('cc_to_south', 38, 13, 2, 4, { map: 'south_city', x: 2, y: 15, facing: 'right' }),
  );
  return m.build({ spawn: { x: 20, y: 17 }, music: 'hub' });
}

/* ========================================================================== south_city */
function southCity(): MapDef {
  const m = new MB('south_city', 'South City', 48, 30, '.', 'city');
  m.border('#', 1);
  m.speckle(',', '.', 9);
  // roads: main avenue east–west, cross street, plaza
  m.hpath(14, 1, 46, 4, '=').vpath(22, 2, 27, 4, '=').fill(18, 11, 12, 10, '=');
  // building blocks
  m.fill(3, 3, 10, 7, '#').fill(26, 3, 12, 7, '#').fill(40, 3, 6, 7, '#').fill(3, 20, 9, 7, '#').fill(28, 20, 8, 7, '#').fill(40, 20, 6, 7, '#').fill(14, 3, 6, 5, '#');
  m.prop('building_big', 3, 4, 5, 4).prop('building_a', 8, 4, 5, 4).prop('building_big', 26, 4, 6, 4).prop('building_a', 32, 4, 5, 4).prop('building_b', 40, 4, 5, 4).prop('building_a', 14, 3, 5, 4);
  m.prop('building_a', 3, 21, 5, 4).prop('building_b', 8, 21, 4, 4).prop('building_a', 28, 21, 5, 4).prop('building_big', 33, 21, 3, 4).prop('building_b', 40, 21, 5, 4);
  m.row('lamp', 2, 13, 11, 4).row('tree', 2, 11, 6, 3, 1, 1).prop('fountain', 23, 15, 3, 3, true).row('car', 6, 18, 3, 8, 2, 1).prop('rubble', 36, 17, 2, 1).prop('rubble', 12, 17, 2, 1);
  m.e(
    exit('sc_to_cc', 0, 13, 2, 4, { map: 'capsule_corp', x: 36, y: 15, facing: 'left' }),
    exit('sc_to_rocky', 46, 13, 2, 4, { map: 'rocky_outskirts', x: 5, y: 20, facing: 'right' }),
    point('shop', 'shop_sc', 18, 12, { shop: 'south_city', label: 'South City Market' }),
    point('save', 'save_sc', 29, 12, { label: 'Save Terminal' }),
    point('heal', 'heal_sc', 22, 12, { label: 'First Aid Tent' }),
    foe('foe_a01', 'Recon Probes', 'recon-probe', 27, 16, { story: 'A01', aggro: 70, patrol: { dx: 0, dy: 24 } }),
    npc('q_shelter_keeper', 'Shelter Keeper', 'civilian', 5, 15, [
      cond('quest:android_evacuations=none', [
        cond('done:A01', [
          say('civilian', 'People are trapped behind the rubble at the back alleys — probes are pinning them down. If you can clear the probes and lead them out, I\'ll have supplies waiting.'),
          { t: 'quest', id: 'android_evacuations', op: 'start' },
        ], [say('civilian', 'Stay clear of the plaza — something has been watching from the sky.')]),
      ], [
        cond('quest:android_evacuations=active', [
          cond('flag:evac1_rescued && flag:evac2_rescued', [
            say('civilian', 'You got them out! Everyone is accounted for. Thank you!'),
            { t: 'quest', id: 'android_evacuations', op: 'progress', key: 'report' },
            { t: 'quest', id: 'android_evacuations', op: 'complete' },
          ], [say('civilian', 'Two groups are still pinned down — the east alley and the south garage.')]),
        ], [say('civilian', 'The shelter is full but safe. Thanks to you.')]),
      ]),
    ], { facing: 'right' }),
    // two rescue sites
    foe('qf_evac1', 'Pinning Probes', 'recon-probe', 40, 16, { fight: 'Q_EVAC1', aggro: 60, when: 'quest:android_evacuations=active && !opened:defeated:qf_evac1' }),
    npc('q_civ1', 'Trapped Civilian', 'civilian', 43, 16, [
      { t: 'quest', id: 'android_evacuations', op: 'progress', key: 'rescued' },
      say('civilian', 'Thank you! I\'ll run to the shelter before they come back!'),
      { t: 'set', flag: 'evac1_rescued' },
      { t: 'hide', entity: 'q_civ1' },
    ], { when: 'quest:android_evacuations=active && opened:defeated:qf_evac1 && !flag:evac1_rescued' }),
    foe('qf_evac2', 'Pinning Drone', 'drain-drone', 12, 24, { fight: 'Q_EVAC2', aggro: 60, when: 'quest:android_evacuations=active && !opened:defeated:qf_evac2' }),
    npc('q_civ2', 'Trapped Civilian', 'civilian', 14, 24, [
      { t: 'quest', id: 'android_evacuations', op: 'progress', key: 'rescued' },
      say('civilian', 'You came back for us! Please, tell everyone else we\'re alright.'),
      { t: 'set', flag: 'evac2_rescued' },
      { t: 'hide', entity: 'q_civ2' },
    ], { when: 'quest:android_evacuations=active && opened:defeated:qf_evac2 && !flag:evac2_rescued' }),
    point('pickup', 'pk_med_sc', 38, 12, { item: 'lab_medicine', n: 1, label: 'Medicine Crate' }),
    chest('ch_sc_research', 37, 24, { item: 'research_part', n: 1, when: 'done:T01' }),
    chest('ch_sc1', 2, 24, { item: 'senzu_small', n: 2 }),
    npc('sc_civilian', 'Shopkeeper', 'civilian', 34, 18, [
      cond('beat>=C01', [say('civilian', 'Half the town has left for the shelter. If you\'re heading toward Ginger Town, take care.')], [say('civilian', 'Robots over the city! Did Bulma\'s company do this?')]),
    ]),
  );
  return m.build({ spawn: { x: 3, y: 15 }, music: 'city', encounters: 'south_city', encounterRate: 0.011 });
}

export const MAPS_A: MapDef[] = [landing(), capsule(), southCity()];
void set;
void T;
