import type { MapDef, Step } from '../../types/script';
import { MB, chest, cond, exit, foe, npc, point, say } from './builder';

const record = (id: string, title: string, text: string): Step[] => [
  { t: 'once', id, steps: [{ t: 'say', who: 'narrator', text: `${title}: ${text}` }, { t: 'give', item: 'gero_record', n: 1 }, { t: 'sfx', key: 'item' }] },
];

/* ========================================================================== rocky_outskirts */
function rocky(): MapDef {
  const m = new MB('rocky_outskirts', 'Rocky Outskirts', 50, 30, ',', 'wasteland');
  m.border('#', 2);
  m.speckle('.', ',', 4);
  m.hpath(18, 2, 48, 4, '=').vpath(24, 2, 18, 3, '=').vpath(8, 12, 18, 2, '=');
  // canyon walls leaving the road open
  m.fill(4, 3, 16, 9, '#').fill(28, 3, 18, 8, '#').fill(4, 24, 14, 4, '#').fill(22, 23, 8, 5, '#').fill(34, 22, 12, 5, '#').fill(12, 12, 4, 3, '#').fill(34, 12, 8, 3, '#');
  m.row('boulder', 18, 15, 3, 6, 2, 1).row('rock', 20, 21, 4, 3).prop('rubble', 36, 16, 2, 1).prop('rubble', 12, 17, 2, 1).row('rock', 30, 15, 3, 3);
  m.e(
    exit('ro_to_sc', 0, 17, 3, 5, { map: 'south_city', x: 44, y: 15, facing: 'left' }),
    exit('ro_to_lab', 23, 0, 4, 3, { map: 'mountain_lab', x: 22, y: 25, facing: 'up' }),
    exit('ro_to_ginger', 47, 17, 3, 5, { map: 'gingertown', x: 2, y: 16, facing: 'right' }, { requires: 'done:A08', lockedText: 'The road east is closed by debris. Maybe once things calm down.' }),
    point('save', 'save_ro', 7, 20, { label: 'Save Terminal' }),
    point('heal', 'heal_ro', 11, 20, { label: 'Field Camp' }),
    foe('foe_a02', 'Drain Drones', 'drain-drone', 16, 20, { story: 'A02', aggro: 70, patrol: { dx: 0, dy: 26 } }),
    npc('npc_a19', 'Android 19', 'android-19', 30, 20, [say('a19', 'Kehehe... Son Goku.')], { story: 'A03', when: 'beat==A03', facing: 'left' }),
    npc('npc_vegeta_a04', 'Vegeta', 'vegeta-base', 20, 20, [say('vegeta', 'Out of my way.')], { story: 'A04', when: 'beat==A04', facing: 'right' }),
    foe('foe_t02', 'Semi-Perfect Cell', 'cell-semi-perfect', 40, 20, { story: 'T02', aggro: 76 }),
    foe('foe_t03', 'Perfect Cell', 'cell-perfect', 40, 20, { story: 'T03', aggro: 76 }),
    foe('foe_t04', 'Perfect Cell', 'cell-perfect', 40, 20, { story: 'T04', aggro: 76 }),
    point('pickup', 'pk_med_ro', 5, 16, { item: 'lab_medicine', n: 1, label: 'Supply Crate' }),
    chest('ch_ro1', 47, 25, { item: 'senzu_small', n: 2 }),
    chest('ch_ro2', 19, 25, { zeni: 180 }),
    npc('ro_wanderer', 'Hiker', 'civilian', 12, 20, [
      cond('beat>=A02', [say('civilian', 'Drones, androids... I\'m heading home. This canyon is no place for an ordinary person anymore.')], [say('civilian', 'Strange machines have been circling the canyon. Keep your distance.')]),
    ]),
  );
  return m.build({ spawn: { x: 3, y: 20 }, music: 'wasteland', encounters: 'rocky_outskirts', encounterRate: 0.019, weather: 'dust' });
}

/* ========================================================================== mountain_lab */
function mountainLab(): MapDef {
  const m = new MB('mountain_lab', 'Mountain Lab', 44, 30, ',', 'lab');
  m.border('#', 2);
  m.speckle('.', ',', 5);
  m.fill(4, 2, 36, 6, '#').fill(14, 8, 16, 2, '=').vpath(20, 10, 28, 4, '=').hpath(15, 4, 40, 3, '=').fill(4, 20, 10, 6, '#').fill(30, 20, 10, 6, '#').fill(4, 10, 6, 4, '#').fill(34, 10, 6, 4, '#');
  m.prop('lab_building', 14, 2, 16, 6).row('boulder', 8, 18, 2, 24, 2, 1).row('rock', 12, 12, 4, 6).prop('machine', 32, 17, 2, 2).prop('pod', 7, 16, 2, 2);
  m.e(
    exit('ml_to_ro', 20, 27, 4, 3, { map: 'rocky_outskirts', x: 24, y: 4, facing: 'down' }),
    exit('ml_to_inner', 20, 7, 4, 2, { map: 'lab_inner', x: 20, y: 23, facing: 'up' }, { requires: 'flag:lab_door_open', lockedText: 'The lab door is sealed. There must be a lever somewhere on the cliffs.' }),
    point('door', 'lab_door', 20, 8, { w: 4, h: 1, closedWhen: '!flag:lab_door_open', label: 'Lab Door' }),
    point('save', 'save_ml', 18, 24, { label: 'Save Terminal' }),
    point('heal', 'heal_ml', 25, 24, { label: 'Field Camp' }),
    foe('foe_a05', 'Dr. Gero', 'android-20', 22, 13, { story: 'A05', aggro: 70 }),
    point('lever', 'lever_lab', 36, 15, { label: 'Lever', when: 'done:A05', script: [
      cond('flag:lab_door_open', [{ t: 'say', who: 'narrator', text: 'The lever is already thrown. The lab door stands open.' }], [{ t: 'say', who: 'narrator', text: 'You throw the lever. Heavy bolts slide back somewhere in the cliff — the lab door groans open.' }, { t: 'set', flag: 'lab_door_open' }, { t: 'sfx', key: 'door' }]),
    ] }),
    point('terminal', 'term_ml1', 8, 14, { label: 'Terminal', script: record('rec_ml1', 'Recording 1', 'Dr. Gero\'s log — "The Saiyan boy\'s energy is a nuisance. Android 19 will draw it out; Android 20 — myself — will collect the rest."') }),
    point('pickup', 'pk_med_ml', 28, 22, { item: 'lab_medicine', n: 1, label: 'Medicine Cabinet' }),
    chest('ch_ml1', 5, 27, { item: 'ki_capsule_large', n: 1 }),
    npc('ml_scientist', 'Lab Scientist', 'researcher', 28, 25, [
      cond('done:A05', [say('researcher', 'You\'re the ones who chased the Doctor out? He rushed in and slammed the door! There\'s an old lever on the east cliff — it might open it.')], [say('researcher', 'This facility is closed! If the Doctor catches you here...')]),
    ]),
  );
  return m.build({ spawn: { x: 22, y: 25 }, music: 'lab', encounters: 'mountain_lab', encounterRate: 0.017 });
}

/* ========================================================================== lab_inner */
function labInner(): MapDef {
  const m = new MB('lab_inner', 'Android Laboratory', 40, 28, '=', 'lab');
  m.border('#', 2);
  m.speckle('.', '=', 6);
  // corridors and rooms
  m.fill(2, 2, 12, 8, '#').fill(26, 2, 12, 8, '#').fill(2, 14, 14, 6, '#').fill(24, 14, 14, 6, '#').fill(2, 22, 8, 4, '#').fill(30, 22, 8, 4, '#');
  m.fill(14, 2, 12, 5, '.');
  m.prop('pod', 17, 3, 2, 2).prop('pod', 20, 3, 2, 2).prop('pod', 23, 3, 2, 2).prop('machine', 14, 12, 2, 2).prop('machine', 24, 12, 2, 2).row('pillar', 12, 16, 3, 7);
  m.e(
    exit('li_to_ml', 18, 25, 4, 3, { map: 'mountain_lab', x: 22, y: 10, facing: 'down' }),
    point('save', 'save_li', 16, 21, { label: 'Save Terminal' }),
    point('heal', 'heal_li', 23, 21, { label: 'Recovery Capsule' }),
    foe('foe_a06', 'Security Sentinels', 'armored-sentinel', 20, 16, { story: 'A06', aggro: 70, patrol: { dx: 30, dy: 0 } }),
    foe('foe_a07', 'Android 17 pod', 'android-17', 20, 9, { story: 'A07', aggro: 90 }),
    foe('foe_a08', 'Android 18 pod', 'android-18', 21, 9, { story: 'A08', aggro: 90 }),
    point('terminal', 'term_li1', 6, 20, { label: 'Terminal', script: record('rec_li1', 'Recording 2', 'Dr. Gero\'s log — "17 and 18 were never willing volunteers. I will make them useful regardless. 16 is a failure: too gentle."') }),
    point('terminal', 'term_li2', 34, 20, { label: 'Terminal', script: record('rec_li2', 'Recording 3', 'Dr. Gero\'s log — "Cell is my masterpiece, built from the genes of the strongest warriors. A time traveler\'s information completes the design."') }),
    chest('ch_li1', 11, 24, { item: 'senzu_large', n: 1 }),
    point('sign', 'sign_li', 18, 20, { text: 'AUTHORIZED PERSONNEL ONLY — ANDROID ASSEMBLY WING.' }),
  );
  return m.build({ spawn: { x: 20, y: 23 }, music: 'lab', encounters: 'lab_inner', encounterRate: 0.017, light: 'dim' });
}

/* ========================================================================== gingertown */
function ginger(): MapDef {
  const m = new MB('gingertown', 'Ginger Town', 46, 30, ',', 'town');
  m.border('#', 1);
  m.speckle('.', ',', 5);
  m.hpath(15, 1, 44, 3, '=').vpath(22, 3, 27, 3, '=').fill(18, 12, 10, 9, '=').vpath(10, 3, 15, 2, '=').vpath(36, 15, 27, 2, '=');
  m.fill(3, 3, 6, 6, '#').fill(12, 3, 6, 6, '#').fill(26, 3, 6, 6, '#').fill(34, 3, 8, 6, '#').fill(3, 20, 8, 6, '#').fill(12, 22, 7, 5, '#').fill(26, 21, 8, 6, '#').fill(38, 21, 6, 6, '#');
  m.prop('house', 3, 5, 3, 3).prop('house', 6, 5, 3, 3).prop('house', 12, 5, 3, 3).prop('house', 15, 5, 3, 3).prop('house', 26, 5, 3, 3).prop('house', 29, 5, 3, 3).prop('house', 34, 5, 3, 3).prop('house', 38, 5, 3, 3);
  m.prop('house', 3, 21, 3, 3).prop('house', 7, 21, 3, 3).prop('house', 12, 23, 3, 3).prop('house', 15, 23, 3, 3).prop('house', 26, 22, 3, 3).prop('house', 30, 22, 3, 3).prop('house', 38, 22, 3, 3);
  m.row('lamp', 2, 14, 11, 4).prop('timemachine', 22, 10, 3, 2).prop('crate', 8, 15).prop('rubble', 32, 18, 2, 1);
  m.e(
    exit('gt_to_ro', 0, 14, 2, 4, { map: 'rocky_outskirts', x: 46, y: 19, facing: 'left' }),
    exit('gt_to_island', 44, 14, 2, 4, { map: 'android_island', x: 2, y: 14, facing: 'right' }, { requires: 'done:C03', lockedText: 'The evacuation road is still in danger. Finish what is happening in town first.' }),
    point('save', 'save_gt', 5, 17, { label: 'Save Terminal' }),
    point('heal', 'heal_gt', 9, 17, { label: 'Field Camp' }),
    foe('foe_c01', 'Cell Husks', 'cell-husk', 14, 17, { story: 'C01', aggro: 70, patrol: { dx: 24, dy: 0 } }),
    foe('foe_c02', 'Imperfect Cell', 'cell-imperfect', 24, 17, { story: 'C02', aggro: 76 }),
    foe('foe_c03', 'Cell Probes', 'cell-probe', 36, 17, { story: 'C03', aggro: 80 }),
    npc('gt_clue1', 'Frightened Mother', 'civilian', 18, 18, [
      cond('done:C01', [say('civilian', 'The monster took my husband in the night... I only escaped because it was looking at something else.')], [say('civilian', 'Everyone I know just... disappeared. Their clothes were left on the road. Please, find out why.')]),
    ]),
    npc('gt_clue2', 'Old Man', 'civilian', 28, 18, [say('civilian', 'It came out of a strange machine near the square. It stared at me and said it was perfect. Then it looked up at the sky.')]),
    npc('q_cellar_voice', 'Muffled Voice', 'civilian', 9, 9, [
      cond('quest:ginger_survivors=none', [
        cond('done:C01', [
          say('civilian', '(from a cellar) Please — somebody! There\'s a creature outside the door. I can\'t get out!'),
          { t: 'quest', id: 'ginger_survivors', op: 'start' },
        ], [say('civilian', '(a faint knocking) ...')]),
      ], [
        cond('quest:ginger_survivors=active && !opened:defeated:qf_ginger', [say('civilian', '(from the cellar) It\'s right outside! Please, hurry!')], [
          cond('quest:ginger_survivors=active', [
            say('civilian', 'It\'s gone! You saved me. Please — take me to the truck at the east end; they\'re evacuating people.'),
            { t: 'quest', id: 'ginger_survivors', op: 'progress', key: 'rescued' },
            { t: 'set', flag: 'ginger_cellar_free' },
            { t: 'hide', entity: 'q_cellar_voice' },
          ], [say('civilian', 'Thank you for everything.')]),
        ]),
      ]),
    ]),
    foe('qf_ginger', 'Cellar Guardian', 'cell-husk', 9, 12, { fight: 'Q_GINGER', aggro: 60, when: 'quest:ginger_survivors=active && !opened:defeated:qf_ginger' }),
    npc('q_truck', 'Evacuation Driver', 'civilian', 42, 17, [
      cond('quest:ginger_survivors=active', [
        cond('flag:ginger_cellar_free', [
          say('civilian', 'Another survivor? Hop in — we\'re getting you out of here. Thank you!'),
          { t: 'quest', id: 'ginger_survivors', op: 'progress', key: 'evac' },
          { t: 'quest', id: 'ginger_survivors', op: 'complete' },
        ], [say('civilian', 'Find anyone still hiding? Bring them here and we\'ll take them out.')]),
      ], [say('civilian', 'We\'re moving everyone out as fast as we can.')]),
    ]),
    chest('ch_gt1', 40, 12, { item: 'antidote', n: 2 }),
    chest('ch_gt2', 2, 27, { item: 'senzu_small', n: 3 }),
  );
  return m.build({ spawn: { x: 2, y: 16 }, music: 'mystery', encounters: 'gingertown', encounterRate: 0.017, weather: 'mist', light: 'dim' });
}

export const MAPS_B: MapDef[] = [rocky(), mountainLab(), labInner(), ginger()];
