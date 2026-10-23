import type { Step } from '../types/script';

export interface Beat {
  id: string;
  kind: 'battle' | 'event';
  chapter: number;
  /** journal line shown while this beat is current */
  objective: string;
  /** map where the trigger lives */
  map: string;
  /** short spoken hint to the player, shown in the map prompt */
  where: string;
  pre: Step[];
  post: Step[];
  /** extra condition (flags/items) required before the trigger fires */
  gate?: string;
  gateText?: string;
}

const say = (who: string, text: string): Step => ({ t: 'say', who, text });
const card = (text: string, sub?: string): Step => ({ t: 'card', text, sub });
const set = (flag: string): Step => ({ t: 'set', flag });

export const BEATS: Beat[] = [
  /* ============================================================ PROLOGUE */
  {
    id: 'P01', kind: 'battle', chapter: 0, map: 'landing_future', where: 'Confront the troopers on the plateau.',
    objective: 'Stop Frieza\'s landing party on the plateau.',
    pre: [say('trunks', 'The troopers are guarding the way to their ship. I\'ll start by clearing them.')],
    post: [
      say('trunks', 'Those were just the scouts. The ones I came for are further east, at the ship.'),
      set('p01_cleared'),
    ],
  },
  {
    id: 'P02', kind: 'battle', chapter: 0, map: 'landing_future', where: 'Walk east to Frieza\'s ship.',
    objective: 'Defeat Mecha Frieza and King Cold at their ship.',
    pre: [{ t: 'cutscene', id: 'trunks_arrival' }],
    post: [
      { t: 'cutscene', id: 'goku_arrives' },
      { t: 'give', item: 'medicine_vial', n: 1 },
      set('warning_delivered'),
      { t: 'join', hero: 'goku' },
      { t: 'join', hero: 'gohan' },
      { t: 'join', hero: 'piccolo' },
      { t: 'join', hero: 'krillin' },
      { t: 'join', hero: 'tien' },
      card('THREE YEARS LATER', 'Capsule Corporation, West City'),
      { t: 'warp', map: 'capsule_corp', x: 20, y: 17, facing: 'down' },
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 1 */
  {
    id: 'A01', kind: 'battle', chapter: 1, map: 'south_city', where: 'South City — find the probes near the plaza.',
    objective: 'Investigate the strange probes watching South City.',
    pre: [
      say('bulma', 'Three years of peace, and now this. Something is scanning the whole city from the air. South City is where it was seen.'),
      say('piccolo', 'I felt it too. A cold, mechanical energy. I will come along.'),
    ],
    post: [
      say('krillin', 'They were only watching. But who is looking for us — and why?'),
      say('piccolo', 'Whoever sent them knows our strength. Let us search the outskirts.'),
    ],
  },
  {
    id: 'A02', kind: 'battle', chapter: 1, map: 'rocky_outskirts', where: 'Rocky Outskirts — the wreckage points east.',
    objective: 'Follow the probe signal into the Rocky Outskirts.',
    pre: [
      say('krillin', 'The probes were sending a signal east. I\'d bet it leads to something worse than robots.'),
      say('gohan', 'These ones put their hands on the rocks — look, they\'re drawing out energy! Be careful with your Ki.'),
    ],
    post: [
      say('krillin', 'Their hands pull Ki out of every energy blast. Physical attacks are better — and an Anti-Drain Charm wouldn\'t hurt.'),
      say('gohan', 'A bigger machine is on the old highway ahead. I can sense something else… a person fighting it.'),
    ],
  },
  {
    id: 'A03', kind: 'battle', chapter: 1, map: 'rocky_outskirts', where: 'On the old highway, a figure is waiting.',
    objective: 'Goku holds off Android 19.',
    pre: [
      say('a19', 'Son Goku. Dr. Gero\'s greatest enemy. Hand over your energy.'),
      say('goku', 'I\'ve been training for three years. Whatever you\'ve got, bring it.'),
    ],
    post: [
      { t: 'cutscene', id: 'goku_virus' },
      { t: 'take', item: 'medicine_vial', n: 1 },
      say('yamcha', 'Goku\'s already getting the medicine Trunks gave him. He\'ll be fine, but it takes weeks. Don\'t count on him.'),
      set('goku_sick'),
      set('android19_sighted'),
      { t: 'leave', hero: 'goku' },
      say('gohan', 'Dad… I\'ll do what I can. Someone has to hold that thing off.'),
    ],
  },
  {
    id: 'A04', kind: 'battle', chapter: 1, map: 'rocky_outskirts', where: 'Vegeta is standing on the highway ahead.',
    objective: 'Vegeta faces Android 19 as a Super Saiyan.',
    pre: [{ t: 'cutscene', id: 'vegeta_ssj_reveal' }],
    post: [
      say('a19', '(sparks and smoke) Doctor… I told you… they are stronger than they look.'),
      say('vegeta', 'Machines. Always the same. One last thing — where is your master hiding?'),
      say('krillin', 'Android 20! He\'s running toward the mountain! That was Dr. Gero!'),
      set('vegeta_ssj_unlocked'),
      { t: 'join', hero: 'vegeta' },
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 2 */
  {
    id: 'A05', kind: 'battle', chapter: 2, map: 'mountain_lab', where: 'Mountain Lab — the old man is cornered at the gate.',
    objective: 'Catch Dr. Gero before he escapes into his lab.',
    pre: [
      say('gero', 'Hmph. You are all fools. This laboratory is none of your concern, little monkey.'),
      say('vegeta', 'I was going to say the same thing — but you are the one in the way.'),
    ],
    post: [
      say('gero', 'You haven\'t won. You have only guaranteed my children will wake early. Ha ha ha!'),
      say('vegeta', 'He\'s gone down the lab door. A lever on the cliff must open it.'),
      set('gero_fled'),
      { t: 'join', hero: 'trunks' },
      say('trunks', 'I\'m coming along. Gero is the origin of every nightmare in my timeline. I\'ll see this through.'),
    ],
  },
  {
    id: 'A06', kind: 'battle', chapter: 2, map: 'lab_inner', where: 'Lab Interior — sentinels guard the inner corridor.',
    gate: 'flag:lab_door_open', gateText: 'The lab door is sealed. Look for the lever outside.',
    objective: 'Fight through the laboratory\'s security sentinels.',
    pre: [say('trunks', 'The door cycles its shield whenever the sentinels fire. Wait for the weak point — then hit it.')],
    post: [
      say('vegeta', 'That\'s the last of them. A heavy chamber is ahead.'),
      set('lab_security_down'),
    ],
  },
  {
    id: 'A07', kind: 'battle', chapter: 2, map: 'lab_inner', where: 'The pod chamber at the end of the lab.',
    objective: 'Android 17 awakens. Survive and retreat.',
    pre: [{ t: 'cutscene', id: 'androids_awakened' }, say('a17', 'We didn\'t ask to be awakened for your war. Let\'s see what you can do.')],
    post: [
      say('trunks', 'We can\'t beat him yet. The Androids in my timeline were this strong — retreat!'),
      set('androids_awakened'),
    ],
  },
  {
    id: 'A08', kind: 'battle', chapter: 2, map: 'lab_inner', where: 'Android 18 steps out of her pod.',
    objective: 'Survive Android 18\'s assault.',
    pre: [say('a18', 'You\'re still here? I warned you not to try to stop us.')],
    post: [
      say('krillin', 'She spared a fallen fighter. Not everyone here is a monster.'),
      say('a16', 'I will not fight unless I am forced.'),
      set('android18_seen'),
      { t: 'warp', map: 'capsule_corp', x: 20, y: 17, facing: 'down' },
      say('bulma', 'You made it back! The Androids are out there somewhere. Another danger has appeared too — people are vanishing in Ginger Town.'),
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 3 */
  {
    id: 'C01', kind: 'battle', chapter: 3, map: 'gingertown', where: 'Ginger Town — find out what happened to the people.',
    objective: 'Investigate the empty streets of Ginger Town.',
    pre: [
      say('piccolo', 'Clothing in the street. No bodies. Something took the people whole.'),
      say('krillin', 'Shadows are moving between the houses. Stay together.'),
    ],
    post: [
      say('tien', 'A discarded shell, just like an insect\'s. And a second time machine in the park…'),
      say('piccolo', 'Something with Gero\'s blueprint — and a future\'s. We must warn Kami.'),
      set('cell_imperfect_seen'),
    ],
  },
  {
    id: 'E_KAMI', kind: 'event', chapter: 3, map: 'lookout', where: 'Speak with Kami at the Lookout.',
    objective: 'Seek Kami at the Lookout.',
    pre: [
      say('piccolo', "Kami. The creature in Ginger Town carries your blood's memory and Gero's hunger. I need whatever I can still learn from you."),
      { t: 'cutscene', id: 'kami_merge' },
    ],
    post: [
      set('piccolo_kami_merged'),
      say('piccolo', 'Gohan, Krillin, Tien: meet me at Ginger Town. This time I am not holding anything back.'),
      { t: 'autosave' },
    ],
  },
  {
    id: 'C02', kind: 'battle', chapter: 3, map: 'gingertown', where: 'Ginger Town — Cell is hunting again.',
    objective: 'Confront the creature in Ginger Town.',
    pre: [say('cell1', 'My design carries the memories of every great warrior. Your power is part of me. Join me.')],
    post: [
      say('cell1', 'I will return — more perfect than before.'),
      say('piccolo', 'It called itself Cell. Whatever it is, it knows my name.'),
      set('cell_named'),
    ],
  },
  {
    id: 'C03', kind: 'battle', chapter: 3, map: 'gingertown', where: 'The evacuation road at the town\'s east end.',
    objective: 'Protect the evacuees on the road out of town.',
    pre: [say('civilian', 'Please — the road is the only way out! Don\'t let them near us!')],
    post: [
      say('krillin', 'The evacuation road is clear. But the creature has vanished.'),
      say('tien', 'Perhaps it heard something. Look — there is a signal heading toward the sea.'),
      set('gingertown_evacuated'),
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 4 */
  {
    id: 'H01', kind: 'battle', chapter: 4, map: 'android_island', where: 'Android Island — the highway along the shore.',
    objective: 'Piccolo confronts Android 17.',
    pre: [
      say('piccolo', 'I need you to keep your attention on me, 17. There is something worse than either of us nearby.'),
      say('a17', 'Worse than us? That\'s adorable. Fine — keep me entertained.'),
    ],
    post: [say('a17', 'Hey — what is that thing?'), say('piccolo', 'Cell.'), set('piccolo_vs_17')],
  },
  {
    id: 'H02', kind: 'battle', chapter: 4, map: 'android_island', where: 'Shoreline — Android 16 stands against the creature.',
    objective: 'Android 16 faces Cell.',
    pre: [say('a16', 'Your hunger will hurt people. I cannot permit that.')],
    post: [say('a16', 'It is a deadly thing. I cannot stop it alone.'), set('android16_met')],
  },
  {
    id: 'H03', kind: 'battle', chapter: 4, map: 'android_island', where: 'The island\'s bridge — Cell closes in on the Androids.',
    objective: 'Buy Android 18 time to flee.',
    pre: [say('tien', 'I can hold the monster, but not forever. Get 18 out of here!')],
    post: [
      { t: 'cutscene', id: 'cell_absorbs_17' },
      set('cell_absorbed_17'),
      say('piccolo', 'Semi-Perfect. We have to reach 18 before he does.'),
      { t: 'warp', map: 'capsule_corp', x: 20, y: 17, facing: 'down' },
      say('bulma', 'Trunks, Vegeta — the Room of Spirit and Time is at the Lookout. A year in there is one day out here. It\'s our best chance.'),
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 5 */
  {
    id: 'T01', kind: 'battle', chapter: 5, map: 'time_chamber', where: 'Enter the Room of Spirit and Time from the Lookout.',
    objective: 'Train Vegeta and Trunks in the Room of Spirit and Time.',
    pre: [
      say('vegeta', 'Power that does not answer when called is no power at all. Let us find out what we have.'),
      say('trunks', 'Father… Vegeta. Lead the way.'),
    ],
    post: [
      say('vegeta', 'The strain is real, but the ascended form is mine. Excellent.'),
      say('trunks', 'The bulk form gives me raw power, but my speed pays for it. I\'ll keep that in mind.'),
      set('vegeta_ascended_unlocked'),
      set('trunks_ultra_unlocked'),
      set('trunks_ssj_unlocked'),
      { t: 'autosave' },
    ],
  },
  {
    id: 'T02', kind: 'battle', chapter: 5, map: 'rocky_outskirts', where: 'Rocky Outskirts — Cell hunts for 18.',
    objective: 'Vegeta faces Semi-Perfect Cell.',
    pre: [say('vegeta', 'Your perfection will mean nothing against my strength. Let me show you the difference.')],
    post: [
      say('vegeta', 'Now I\'ve beaten you, I\'d like to see your final form. Go ahead — absorb that girl.'),
      say('trunks', 'Father, don\'t! That\'s exactly what he wants!'),
      set('vegeta_vs_semi'),
    ],
  },
  {
    id: 'T03', kind: 'battle', chapter: 5, map: 'rocky_outskirts', where: 'Cell tracks 18 into the canyon.',
    objective: 'Survive Perfect Cell.',
    pre: [{ t: 'cutscene', id: 'cell_absorbs_18' }],
    post: [say('vegeta', 'Pride has never won this kind of battle. I understand now.'), set('cell_perfect')],
  },
  {
    id: 'T04', kind: 'battle', chapter: 5, map: 'rocky_outskirts', where: 'Trunks takes his turn against Cell.',
    objective: 'Trunks tests the Ultra form against Perfect Cell.',
    pre: [say('trunks', 'Every muscle gives me more force, yet he moves before I can strike.')],
    post: [
      say('trunks', 'The slow form is useless against someone this fast. I\'ll never use it again.'),
      say('cell', 'Humans: I\'m announcing a tournament — the Cell Games — in ten days. Come, or I will destroy you one city at a time.'),
      set('cell_games_announced'),
      { t: 'warp', map: 'capsule_corp', x: 20, y: 17, facing: 'down' },
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 6 */
  {
    id: 'R01', kind: 'battle', chapter: 6, map: 'time_chamber', where: 'The Room of Spirit and Time — Goku and Gohan train.',
    objective: 'Train with Goku in the Time Chamber.',
    pre: [
      say('goku', 'I trust what you can become more than any technique I can teach you. Let\'s see it.'),
      say('gohan', 'Dad, I\'ll try. I don\'t want to hurt anyone though.'),
    ],
    post: [
      say('goku', 'There you go. A Super Saiyan who can sit in his form like it\'s nothing. That\'s the secret, Gohan: you\'re not tired — you\'re at home.'),
      set('goku_recovered'),
      set('gohan_ssj_unlocked'),
      set('goku_ssj_unlocked'),
      { t: 'join', hero: 'goku' },
      { t: 'autosave' },
    ],
  },
  {
    id: 'R02', kind: 'battle', chapter: 6, map: 'capsule_corp', where: 'Capsule Corp — Bulma\'s teamwork exam.',
    objective: 'Pass Bulma\'s teamwork exam.',
    pre: [say('bulma', 'Teamwork is a skill too. You three clearly need practice. Meet my robots.')],
    post: [
      say('bulma', 'Hmph. The scores are on the board — well done. Now go see to your families. The Cell Games are tomorrow.'),
      set('teamwork_exam_done'),
      { t: 'autosave' },
    ],
  },
  /* ============================================================ CHAPTER 7 */
  {
    id: 'G01', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'Step into the ring to start the Cell Games.',
    objective: 'Goku fights Perfect Cell in the ring.',
    pre: [
      say('cell', 'A tournament is a wonderfully polite way to measure extinction. Who\'s first?'),
      say('goku', 'I am. Let\'s see how perfect you are.'),
    ],
    post: [
      say('goku', 'I give up! This is a good fight, but he\'s hiding something — I think Gohan should go next.'),
      set('games_started'),
    ],
  },
  {
    id: 'G02', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'Gohan steps into the ring.',
    objective: 'Gohan faces Cell.',
    pre: [
      say('gohan', 'I do not want to hurt anyone. But I will protect them.'),
      say('cell', 'Those fists will not move me. Let\'s see what your friends do.'),
    ],
    post: [say('cell', 'Enough of this. Cell Juniors — to me!')],
  },
  {
    id: 'G03', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'The Cell Juniors swarm the fighters.',
    objective: 'Survive the Cell Juniors while Android 16 holds them off.',
    pre: [say('piccolo', 'They are small — but there are many. Stay together!')],
    post: [
      { t: 'cutscene', id: 'gohan_ssj2_awakening' },
      set('android16_destroyed'),
      set('gohan_ssj2_unlocked'),
      { t: 'autosave' },
    ],
  },
  {
    id: 'G04', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'Gohan against the Cell Juniors.',
    objective: 'Gohan, SSJ2, clears the Cell Juniors.',
    pre: [say('gohan', 'No more.')],
    post: [say('cell', 'Impossible. A child who can overcome that…!')],
  },
  {
    id: 'G05', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'Gohan and Cell face each other.',
    objective: 'Gohan vs Perfect Cell: force the self-destruct.',
    pre: [say('gohan', 'I\'m going to end this.')],
    post: [{ t: 'cutscene', id: 'goku_sacrifice' }, set('goku_sacrifice'), { t: 'leave', hero: 'goku' }, { t: 'autosave' }],
  },
  {
    id: 'G06', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'The smoke clears — something is moving.',
    objective: 'Survive the returned Cell.',
    pre: [{ t: 'cutscene', id: 'cell_returns' }],
    post: [{ t: 'cutscene', id: 'vegeta_opening' }, set('cell_super_perfect')],
  },
  {
    id: 'G07', kind: 'battle', chapter: 7, map: 'cell_games_arena', where: 'The final beam.',
    objective: 'Finish Super Perfect Cell with the Father–Son Kamehameha.',
    pre: [say('gohan', 'I\'m not letting you take our tomorrow!')],
    post: [
      { t: 'cutscene', id: 'father_son_finale' },
      set('cell_final_defeated'),
      { t: 'warp', map: 'capsule_corp', x: 20, y: 17, facing: 'down' },
      { t: 'cutscene', id: 'trunks_departure' },
      { t: 'leave', hero: 'trunks' },
      set('credits_seen'),
      set('postgame_unlocked'),
      { t: 'autosave' },
    ],
  },
];

export const BEAT_INDEX: Record<string, number> = Object.fromEntries(BEATS.map((b, i) => [b.id, i]));
export const BATTLE_BEATS = BEATS.filter((b) => b.kind === 'battle');
