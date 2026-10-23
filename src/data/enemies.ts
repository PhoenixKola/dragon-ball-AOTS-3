import type { EnemyDef, EnemyMove } from '../types';

const M = (id: string, name: string, hits: number[], o: Partial<EnemyMove> = {}): EnemyMove => ({
  id, name, hits, element: 'phys', target: 'one', weight: 1, ...o,
});

type E = Omit<EnemyDef, 'id' | 'moves'> & { moves: EnemyMove[] };
const defs: Record<string, EnemyDef> = {};
const add = (id: string, o: E) => {
  defs[id] = { id, ...o };
};

/* ------------------------------------------------------------------ ordinary families */
add('landing-security', { name: 'Landing Trooper', actor: 'landing-security', family: 'soldier', hpx: 0.55, atkx: 0.55, defx: 0.6, spdx: 0.9, drops: [{ item: 'senzu_small', chance: 0.12 }],
  moves: [M('blaster', 'Blaster Shot', [0.9], { element: 'ki', telegraph: 'aims a blaster' }), M('volley', 'Volley', [0.5, 0.5], { element: 'ki', when: 'round>1' })] });
add('recon-probe', { name: 'Recon Probe', actor: 'recon-probe', family: 'probe', hpx: 0.45, atkx: 0.6, defx: 0.55, spdx: 1.15, drops: [{ item: 'ki_capsule', chance: 0.12 }],
  moves: [M('scan', 'Scan Beam', [0.8], { element: 'ki', telegraph: 'charges its scan beam' }), M('ram', 'Ram', [1.1], { weight: 0.7 })] });
add('gero-scout', { name: 'Gero Scout', actor: 'recon-probe', family: 'probe', hpx: 0.7, atkx: 0.7, defx: 0.7, spdx: 1.1, drops: [{ item: 'ki_capsule', chance: 0.2 }],
  moves: [M('shot', 'Scout Shot', [0.9], { element: 'ki' }), M('flare', 'Signal Flash', [0.4], { target: 'all', apply: [{ kind: 'blind', chance: 0.4, turns: 2, power: 0.4 }], when: 'round>1', weight: 0.7 })] });
add('drain-drone', { name: 'Drain Drone', actor: 'drain-drone', family: 'drone', hpx: 0.5, atkx: 0.5, defx: 0.7, spdx: 1.0, drops: [{ item: 'antidote', chance: 0.12 }],
  moves: [M('drain', 'Ki Drain', [0.6], { special: 'drain', telegraph: 'extends its drain claw', element: 'ki', weight: 1.2 }), M('zap', 'Zap', [0.9])] });
add('armored-sentinel', { name: 'Armored Sentinel', actor: 'armored-sentinel', family: 'sentinel', hpx: 1.0, atkx: 0.75, defx: 1.2, spdx: 0.7, drops: [{ item: 'supply_pack', chance: 0.12 }],
  moves: [M('shield', 'Rotate Shield', [], { special: 'shieldRotate', weight: 0, cooldown: 99 }), M('slam', 'Piston Slam', [1.3], { telegraph: 'winds up its piston' }), M('cannon', 'Arm Cannon', [0.9], { element: 'ki' })] });
add('security-grid', { name: 'Security Grid', actor: 'security-grid', family: 'grid', hpx: 0.9, atkx: 0.6, defx: 0.9, spdx: 0.9,
  moves: [M('zap', 'Grid Zap', [0.5], { target: 'all', element: 'ki', telegraph: 'energizes the floor grid' }), M('lock', 'Lock Down', [0.6], { apply: [{ kind: 'seal', chance: 0.6, turns: 1 }], element: 'ki' }), M('sweep', 'Laser Sweep', [0.7, 0.7], { element: 'ki', when: 'round>1' })] });
add('cell-husk', { name: 'Cell Husk', actor: 'cell-husk', family: 'bio', hpx: 0.85, atkx: 0.7, defx: 0.7, spdx: 0.9, drops: [{ item: 'senzu_small', chance: 0.15 }],
  moves: [M('lunge', 'Husk Lunge', [1.1], { telegraph: 'lurches forward' }), M('pulse', 'Absorb Pulse', [0.7], { special: 'drain', element: 'ki' })] });
add('absorbed-shadow', { name: 'Absorbed Shadow', actor: 'absorbed-shadow', family: 'bio', hpx: 0.6, atkx: 0.6, defx: 0.5, spdx: 1.0,
  moves: [M('wail', 'Hollow Wail', [0.4], { target: 'all', element: 'ki', apply: [{ kind: 'atkDown', chance: 0.7, turns: 2, power: 0.2 }] }), M('touch', 'Draining Touch', [0.9], { special: 'kiDrain', telegraph: 'reaches out' })] });
add('cell-probe', { name: 'Cell Probe', actor: 'cell-probe', family: 'bio', hpx: 0.65, atkx: 0.7, defx: 0.6, spdx: 1.2,
  moves: [M('shot', 'Bio Shot', [0.8, 0.8], { element: 'ki' }), M('sting', 'Sting', [1.0], { apply: [{ kind: 'defDown', chance: 0.5, turns: 2, power: 0.15 }] })] });
add('training-sentinel', { name: 'Training Sentinel', actor: 'training-sentinel', family: 'trainer', hpx: 1.0, atkx: 0.85, defx: 0.95, spdx: 0.8,
  moves: [M('heavy', 'Heavy Strike', [2.0], { charge: 1, telegraph: 'raises both fists — a slow heavy strike is coming!', weight: 1 }), M('jab', 'Quick Jab', [0.7, 0.7], { weight: 1.4 })] });
add('chamber-guardian', { name: 'Chamber Guardian', actor: 'chamber-guardian', family: 'trainer', boss: true, hpx: 2.8, atkx: 0.9, defx: 1.0, spdx: 0.95, statusResist: 0.5,
  moves: [M('gauntlet', 'Gauntlet', [0.9, 0.9]), M('pulse', 'Chamber Pulse', [0.55], { target: 'all', element: 'ki', weight: 0.8 }), M('shift', 'Time Shift', [], { special: 'selfBarrier', when: 'hp<0.6', cooldown: 4, telegraph: 'bends the chamber\'s time around itself' })] });

/* ------------------------------------------------------------------ story bosses */
add('mecha-frieza', { name: 'Mecha Frieza', actor: 'mecha-frieza', family: 'frieza', boss: true, hpx: 2.0, atkx: 0.55, defx: 0.8, spdx: 0.9,
  moves: [M('death-beam', 'Death Beam', [1.2], { element: 'ki', pierce: 0.3, telegraph: 'points a finger' }), M('tail', 'Tail Whip', [1.0], {}), M('salvo', 'Supernova Salvo', [0.8], { target: 'all', element: 'ki', charge: 1, telegraph: 'gathers a crimson sphere — an area blast is coming!', when: 'round>1' })] });
add('king-cold', { name: 'King Cold', actor: 'king-cold', family: 'frieza', boss: true, hpx: 2.4, atkx: 0.6, defx: 0.9, spdx: 0.8,
  moves: [M('fist', 'Crushing Fist', [1.5], { telegraph: 'draws back a massive fist' }), M('wave', 'Death Wave', [0.9, 0.9], { element: 'ki', target: 'all', weight: 0.8 })] });
add('android-19', { name: 'Android 19', actor: 'android-19', family: 'android', boss: true, hpx: 2.4, atkx: 0.8, defx: 0.9, spdx: 0.85, absorbs: 'ki', unlimitedKi: true,
  moves: [M('absorb', 'Energy Absorption', [], { special: 'absorbEnergyStance', telegraph: 'opens its palms — energy absorption ready! (use physical attacks)', cooldown: 3, weight: 1.1 }), M('punch', 'Mechanical Punch', [1.2], {}), M('grip', 'Ki Drain Grip', [0.8], { special: 'drain', element: 'ki', telegraph: 'lunges with draining hands' })] });
add('android-20', { name: 'Android 20 (Dr. Gero)', actor: 'android-20', family: 'android', boss: true, hpx: 2.6, atkx: 0.8, defx: 0.9, spdx: 0.85, absorbs: 'ki', unlimitedKi: true,
  moves: [M('absorb', 'Energy Absorption', [], { special: 'absorbEnergyStance', telegraph: 'opens its palms — energy absorption ready! (use physical attacks)', cooldown: 3, weight: 1.1 }), M('palm', 'Drain Palm', [1.0], { special: 'drain', element: 'ki', telegraph: 'reaches out a draining palm' }), M('lash', 'Servo Lash', [1.3], {})] });
add('android-17', { name: 'Android 17', actor: 'android-17', family: 'android', boss: true, hpx: 5, atkx: 0.85, defx: 1.1, spdx: 1.15, unlimitedKi: true, acts: 2, statusResist: 0.6,
  moves: [M('counter', 'Counter Stance', [], { special: 'counterStance', telegraph: 'drops into a counter stance — his next reply is instant!', cooldown: 3, weight: 0.9 }), M('volley', 'Barrier Volley', [0.5, 0.5, 0.5, 0.5], { element: 'ki', target: 'random', telegraph: 'raises both hands' }), M('blade', 'Energy Blade', [1.3], { pierce: 0.2 })] });
add('android-18', { name: 'Android 18', actor: 'android-18', family: 'android', boss: true, hpx: 5, atkx: 0.85, defx: 1.0, spdx: 1.3, unlimitedKi: true, acts: 2, statusResist: 0.6,
  moves: [M('counter', 'Counter Stance', [], { special: 'counterStance', telegraph: 'sidesteps into a counter stance!', cooldown: 3, weight: 0.9 }), M('kicks', 'Rapid Kicks', [0.55, 0.55, 0.55], { telegraph: 'blurs forward' }), M('wave', 'Energy Wave', [1.0], { element: 'ki', target: 'all', weight: 0.7, when: 'round>1' })] });
add('cell-imperfect', { name: 'Imperfect Cell', actor: 'cell-imperfect', family: 'cell', boss: true, hpx: 4.2, atkx: 0.85, defx: 0.9, spdx: 0.95, statusResist: 0.4,
  moves: [M('grab', 'Tail Absorption', [0.7], { special: 'absorbGrab', telegraph: 'its tail opens hungrily toward a fighter! Guard it, or interrupt it with damage!', cooldown: 4, weight: 1.2 }), M('claw', 'Cell Claw', [1.3], {}), M('burst', 'Ki Burst', [0.9], { element: 'ki', target: 'all', weight: 0.7 }), M('regen', 'Regeneration', [], { special: 'regen', when: 'hp<0.6', cooldown: 6, telegraph: 'flesh knits back together' })] });
add('cell-semi-perfect', { name: 'Semi-Perfect Cell', actor: 'cell-semi-perfect', family: 'cell', boss: true, hpx: 5, atkx: 1.0, defx: 1.0, spdx: 0.9, statusResist: 0.4,
  moves: [M('beam', 'Charging Beam', [2.2], { element: 'ki', charge: 1, telegraph: 'channels energy — a heavy beam is coming!', cooldown: 3, weight: 1.1 }), M('slam', 'Power Slam', [1.6], {}), M('flurry', 'Flurry', [0.6, 0.6, 0.6], {}), M('regen', 'Regeneration', [], { special: 'regen', when: 'hp<0.55', cooldown: 6, telegraph: 'regrows torn flesh' })] });
add('cell-perfect', { name: 'Perfect Cell', actor: 'cell-perfect', family: 'cell', boss: true, hpx: 6, atkx: 0.82, defx: 1.1, spdx: 1.1, adapts: true, acts: 2, statusResist: 0.5, unlimitedKi: true,
  moves: [M('kame', 'Kamehameha', [2.4], { element: 'ki', charge: 1, telegraph: 'cups his hands — a Kamehameha is coming!', cooldown: 3, weight: 1.0 }), M('it', 'Instant Transmission Barrage', [0.7, 0.7, 0.7], { pierce: 0.25, telegraph: 'vanishes!' }), M('barrier', 'Cell Barrier', [], { special: 'selfBarrier', when: 'hp<0.7', cooldown: 5, telegraph: 'raises a barrier' }), M('flash', 'Solar Flare', [0.3], { target: 'all', element: 'ki', apply: [{ kind: 'blind', chance: 0.6, turns: 2, power: 0.4 }], cooldown: 4, weight: 0.6 }), M('salvo', 'Ki Salvo', [0.5, 0.5, 0.5, 0.5], { element: 'ki', target: 'random' })] });
add('cell-super-perfect', { name: 'Super Perfect Cell', actor: 'cell-super-perfect', family: 'cell', boss: true, hpx: 6.5, atkx: 0.85, defx: 1.1, spdx: 1.15, acts: 2, adapts: true, statusResist: 0.5, unlimitedKi: true,
  moves: [M('tele', 'Afterimage Teleport', [], { special: 'teleportStance', telegraph: 'splits into afterimages — single-target attacks will be dodged and countered! (area or homing attacks still land)', cooldown: 4, weight: 1.0 }), M('solar', 'Solar Kamehameha', [3.0], { element: 'ki', charge: 1, telegraph: 'draws a vast sun-bright beam — a huge blast is coming!', cooldown: 3, weight: 1.1 }), M('phantom', 'Phantom Barrage', [0.8, 0.8, 0.8, 0.8], { pierce: 0.2 }), M('strike', 'Heavy Strike', [1.6], {})] });
add('cell-junior', { name: 'Cell Junior', actor: 'cell-junior', family: 'junior', hpx: 0.7, atkx: 0.75, defx: 0.7, spdx: 1.5,
  moves: [M('dive', 'Dive Strike', [0.9], { telegraph: 'springs forward' }), M('barrage', 'Coordinated Barrage', [0.55, 0.55], { when: 'ally>1', power: 1.25, element: 'ki' })] });

export const ENEMIES: Record<string, EnemyDef> = defs;

/** Random-encounter formations by region; every family appears somewhere. */
export const ENCOUNTER_TABLES: Record<string, { weight: number; enemies: string[] }[]> = {
  rocky_outskirts: [{ weight: 3, enemies: ['recon-probe', 'recon-probe'] }, { weight: 2, enemies: ['drain-drone', 'recon-probe'] }, { weight: 1, enemies: ['gero-scout', 'drain-drone', 'recon-probe'] }],
  south_city: [{ weight: 2, enemies: ['recon-probe', 'drain-drone'] }, { weight: 2, enemies: ['gero-scout', 'recon-probe'] }],
  mountain_lab: [{ weight: 2, enemies: ['gero-scout', 'drain-drone'] }, { weight: 2, enemies: ['armored-sentinel'] }, { weight: 1, enemies: ['armored-sentinel', 'drain-drone'] }],
  lab_inner: [{ weight: 2, enemies: ['security-grid', 'drain-drone'] }, { weight: 2, enemies: ['armored-sentinel', 'gero-scout'] }, { weight: 1, enemies: ['security-grid', 'armored-sentinel'] }],
  gingertown: [{ weight: 2, enemies: ['cell-husk', 'absorbed-shadow'] }, { weight: 2, enemies: ['cell-probe', 'cell-probe'] }, { weight: 1, enemies: ['cell-husk', 'cell-probe', 'absorbed-shadow'] }],
  android_island: [{ weight: 2, enemies: ['cell-probe', 'cell-husk'] }, { weight: 2, enemies: ['absorbed-shadow', 'cell-probe'] }, { weight: 1, enemies: ['cell-husk', 'cell-husk'] }],
  time_chamber: [{ weight: 3, enemies: ['training-sentinel'] }, { weight: 1, enemies: ['training-sentinel', 'training-sentinel'] }],
};
