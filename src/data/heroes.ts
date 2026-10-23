import type { FormDef, FormId, HeroDef, HeroId } from '../types';

export const HEROES: Record<HeroId, HeroDef> = {
  goku: {
    id: 'goku', name: 'Goku', title: 'Earth\'s Strongest Saiyan', color: '#f09048', role: 'Precision striker',
    hpBase: 120, hpGrow: 26, kiBase: 60, kiGrow: 4.2, atkBase: 14, atkGrow: 3.5, defBase: 9, defGrow: 1.7, spdBase: 22, spdGrow: 1.1,
    rageArt: { name: 'Dragon Fist Fury', desc: 'A teleporting five-hit combination that never misses and ignores 40% DEF.' },
    defaultLoadout: ['goku_0', 'goku_1', 'goku_2', 'goku_3'],
  },
  gohan: {
    id: 'gohan', name: 'Gohan', title: 'Hidden Potential', color: '#b59af1', role: 'Growth / support',
    hpBase: 115, hpGrow: 25, kiBase: 58, kiGrow: 4.1, atkBase: 12, atkGrow: 3.4, defBase: 8, defGrow: 1.7, spdBase: 20, spdGrow: 1.0,
    rageArt: { name: 'Explosive Rage', desc: 'Gohan\'s suppressed power erupts: huge damage to one enemy that grows with missing HP.' },
    defaultLoadout: ['gohan_0', 'gohan_1', 'gohan_2', 'gohan_3'],
  },
  vegeta: {
    id: 'vegeta', name: 'Vegeta', title: 'Prince of Saiyans', color: '#f2ce55', role: 'Burst attacker',
    hpBase: 118, hpGrow: 24, kiBase: 62, kiGrow: 4.3, atkBase: 15, atkGrow: 3.7, defBase: 9, defGrow: 1.6, spdBase: 22, spdGrow: 1.1,
    rageArt: { name: 'Prince\'s Pride', desc: 'An overwhelming Galick surge: massive damage to all enemies and +25% ATK for 2 turns.' },
    defaultLoadout: ['vegeta_0', 'vegeta_1', 'vegeta_2', 'vegeta_5'],
  },
  piccolo: {
    id: 'piccolo', name: 'Piccolo', title: 'Namekian Warrior', color: '#72b878', role: 'Tank / control',
    hpBase: 135, hpGrow: 28, kiBase: 56, kiGrow: 3.8, atkBase: 12, atkGrow: 3.2, defBase: 11, defGrow: 2.0, spdBase: 19, spdGrow: 0.9,
    rageArt: { name: 'Namekian Resolve', desc: 'Full regeneration pulse: heals the party for 30% HP and cleanses all debuffs.' },
    defaultLoadout: ['piccolo_0', 'piccolo_1', 'piccolo_4', 'piccolo_5'],
  },
  trunks: {
    id: 'trunks', name: 'Future Trunks', title: 'Warrior from Tomorrow', color: '#95a8f5', role: 'Sword/Ki hybrid',
    hpBase: 118, hpGrow: 25, kiBase: 60, kiGrow: 4.0, atkBase: 14, atkGrow: 3.5, defBase: 9, defGrow: 1.7, spdBase: 23, spdGrow: 1.1,
    rageArt: { name: 'Heat Dome Sword Flash', desc: 'A blinding sword flurry: 6 piercing hits on random enemies.' },
    defaultLoadout: ['trunks_0', 'trunks_2', 'trunks_3', 'trunks_6'],
  },
  krillin: {
    id: 'krillin', name: 'Krillin', title: 'Strongest Human', color: '#eecb97', role: 'Support / debuff',
    hpBase: 105, hpGrow: 22, kiBase: 56, kiGrow: 4.0, atkBase: 11, atkGrow: 2.8, defBase: 8, defGrow: 1.5, spdBase: 24, spdGrow: 1.2,
    rageArt: { name: 'Hero\'s Gambit', desc: 'A perfect Destructo Disc with a guaranteed critical and full party Ki +20.' },
    defaultLoadout: ['krillin_0', 'krillin_1', 'krillin_5', 'krillin_6'],
  },
  tien: {
    id: 'tien', name: 'Tien', title: 'Three-Eyed Master', color: '#a4d4c5', role: 'Control / high risk',
    hpBase: 112, hpGrow: 23, kiBase: 58, kiGrow: 3.9, atkBase: 13, atkGrow: 3.1, defBase: 9, defGrow: 1.6, spdBase: 21, spdGrow: 1.0,
    rageArt: { name: 'Tri-Beam Overdrive', desc: 'A focused Tri-Beam that pierces 70% DEF and stuns the target.' },
    defaultLoadout: ['tien_0', 'tien_3', 'tien_5', 'tien_7'],
  },
};

export const FORMS: Record<FormId, FormDef> = {
  base: { id: 'base', name: 'Base', atk: 1, def: 1, spd: 1, acc: 0, upkeep: 0, entryKi: 0, note: 'Normal power.' },
  ssj: { id: 'ssj', name: 'Super Saiyan', atk: 1.32, def: 1.15, spd: 1.15, acc: 0, upkeep: 0.05, entryKi: 12, note: 'ATK +32%, DEF +15%, SPD +15%. Costs 5% max Ki each turn; ends when Ki runs out.' },
  ssj2: { id: 'ssj2', name: 'Super Saiyan 2', atk: 1.65, def: 1.3, spd: 1.28, acc: 0.05, upkeep: 0.05, entryKi: 0, note: 'ATK +65%, DEF +30%, SPD +28%. Awakened only by the events of the Cell Games.' },
  ascended: { id: 'ascended', name: 'Ascended Super Saiyan', atk: 1.55, def: 1.3, spd: 0.92, acc: -0.05, upkeep: 0.06, entryKi: 14, note: 'ATK +55%, DEF +30% but SPD -8% and accuracy -5%. Costs 6% max Ki per turn.' },
  ultra: { id: 'ultra', name: 'Ultra Super Saiyan', atk: 1.75, def: 1.2, spd: 0.68, acc: -0.18, upkeep: 0.06, entryKi: 14, note: 'ATK +75%, DEF +20% but SPD -32% and accuracy -18%. Costs 6% max Ki per turn.' },
};

/** Forms each hero can ever use and the story flag that unlocks it. Forms are fully independent per hero. */
export const HERO_FORMS: Record<HeroId, { form: FormId; flag: string }[]> = {
  goku: [{ form: 'ssj', flag: 'goku_ssj_unlocked' }],
  gohan: [{ form: 'ssj', flag: 'gohan_ssj_unlocked' }, { form: 'ssj2', flag: 'gohan_ssj2_unlocked' }],
  vegeta: [{ form: 'ssj', flag: 'vegeta_ssj_unlocked' }, { form: 'ascended', flag: 'vegeta_ascended_unlocked' }],
  piccolo: [],
  trunks: [{ form: 'ssj', flag: 'trunks_ssj_unlocked' }, { form: 'ultra', flag: 'trunks_ultra_unlocked' }],
  krillin: [],
  tien: [],
};

export const LEVEL_CAP = 40;
export const xpForLevel = (lv: number): number => Math.round(22 * lv + 3.4 * lv * lv);

export function baseStats(id: HeroId, level: number) {
  const d = HEROES[id];
  const l = level - 1;
  return {
    hp: Math.round(d.hpBase + d.hpGrow * l),
    ki: Math.round(d.kiBase + d.kiGrow * l),
    atk: Math.round(d.atkBase + d.atkGrow * l),
    def: Math.round(d.defBase + d.defGrow * l),
    spd: Math.round(d.spdBase + d.spdGrow * l),
  };
}

export const KAMI_BONUS = { hp: 1.18, ki: 1.2, atk: 1.15, def: 1.15, spd: 1.05 };
