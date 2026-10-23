import type { ComboDef, ItemDef } from '../types';

const c = (o: Omit<ItemDef, 'kind' | 'battle' | 'field' | 'max'> & Partial<Pick<ItemDef, 'battle' | 'field' | 'max'>>): ItemDef => ({ kind: 'consumable', battle: true, field: true, max: 30, ...o });
const a = (o: Omit<ItemDef, 'kind' | 'battle' | 'field' | 'max' | 'heal'>): ItemDef => ({ kind: 'accessory', battle: false, field: false, max: 1, ...o });
const k = (o: Omit<ItemDef, 'kind' | 'battle' | 'field' | 'max' | 'price' | 'sell'>): ItemDef => ({ kind: 'key', battle: false, field: false, max: 9, price: 0, sell: 0, ...o });

export const ITEMS: Record<string, ItemDef> = Object.fromEntries([
  c({ id: 'senzu_small', name: 'Senzu Fragment', desc: 'Restores 35% max HP.', price: 70, sell: 20, healPct: 0.35 }),
  c({ id: 'senzu_large', name: 'Senzu Bean', desc: 'Fully restores HP and Ki.', price: 320, sell: 100, healPct: 1, kiPct: 1, max: 10 }),
  c({ id: 'ki_capsule', name: 'Ki Capsule', desc: 'Restores 40 Ki.', price: 80, sell: 25, ki: 40 }),
  c({ id: 'ki_capsule_large', name: 'Large Ki Capsule', desc: 'Restores 50% max Ki.', price: 190, sell: 60, kiPct: 0.5 }),
  c({ id: 'revive_seed', name: 'Revive Seed', desc: 'Revives a fallen fighter at 50% HP.', price: 260, sell: 80, revivePct: 0.5, max: 10 }),
  c({ id: 'antidote', name: 'Antidote', desc: 'Cures stun, blind, seal and drain.', price: 60, sell: 18, cure: ['stun', 'blind', 'seal', 'drain', 'virus'] }),
  c({ id: 'supply_pack', name: 'Supply Pack', desc: 'Restores 25% HP and 25% Ki.', price: 150, sell: 45, healPct: 0.25, kiPct: 0.25 }),
  a({ id: 'power_charm', name: 'Power Charm', desc: 'ATK +6%.', price: 400, sell: 120, mods: { atk: 0.06 } }),
  a({ id: 'guard_charm', name: 'Guard Charm', desc: 'DEF +8% and Active Guard windows are 15% wider.', price: 420, sell: 130, mods: { def: 0.08, guardAssist: 0.15 } }),
  a({ id: 'anti_drain_charm', name: 'Anti-Drain Charm', desc: 'Resist Ki drain by 60%.', price: 380, sell: 110, mods: { drainResist: 0.6 } }),
  a({ id: 'speed_charm', name: 'Speed Charm', desc: 'SPD +8%.', price: 400, sell: 120, mods: { spd: 0.08 } }),
  a({ id: 'rage_charm', name: 'Rage Charm', desc: 'Rage gain +20%.', price: 450, sell: 135, mods: { rageGain: 0.2 } }),
  a({ id: 'focus_band', name: 'Focus Band', desc: 'Max Ki +10% and crit +4%.', price: 450, sell: 135, mods: { ki: 0.1, crit: 0.04 } }),
  k({ id: 'gero_record', name: 'Gero Recording', desc: 'A recovered research recording from the lab.' }),
  k({ id: 'lab_medicine', name: 'Lab Medicine', desc: 'Sterile medicine for the research team.' }),
  k({ id: 'relay_part', name: 'Relay Part', desc: 'A salvaged tracker component.' }),
  k({ id: 'research_part', name: 'Research Component', desc: 'A component for the Capsule Corp chamber apparatus.' }),
  k({ id: 'medicine_vial', name: 'Heart Medicine', desc: 'Trunks\' medicine for Goku\'s heart virus. Story item - cannot be used or sold.' }),
  k({ id: 'scouter', name: 'Battered Scouter', desc: 'An old scouter. A curiosity.' }),
  k({ id: 'dragon_radar', name: 'Dragon Radar', desc: 'Bulma\'s radar. It records where the Dragon Balls rest.' }),
].map((i) => [i.id, i]));

export const SHOPS: Record<string, { name: string; stock: string[]; minChapter: number }> = {
  capsule_corp: { name: 'Capsule Corp Supply', stock: ['senzu_small', 'ki_capsule', 'antidote', 'supply_pack', 'ki_capsule_large', 'revive_seed', 'senzu_large', 'power_charm', 'guard_charm', 'speed_charm', 'rage_charm', 'focus_band'], minChapter: 0 },
  south_city: { name: 'South City Market', stock: ['senzu_small', 'ki_capsule', 'antidote', 'supply_pack'], minChapter: 1 },
  cell_games_approach: { name: 'Tournament Stall', stock: ['senzu_small', 'ki_capsule', 'ki_capsule_large', 'antidote', 'supply_pack', 'revive_seed', 'senzu_large'], minChapter: 6 },
};

export const COMBOS: ComboDef[] = [
  { id: 'father_son_strike', name: 'Father & Son Strike', members: ['goku', 'gohan'], kiCost: 14, hits: [1.2, 1.2, 1.5], element: 'phys', target: 'enemy', unlockLevel: 8, desc: 'Goku and Gohan strike in tandem: three hits (1.2x, 1.2x, 1.5x).', vfx: 'impact-big' },
  { id: 'mentors_guard', name: 'Mentor\'s Guard', members: ['gohan', 'piccolo'], kiCost: 12, hits: [], element: 'phys', target: 'enemy', unlockLevel: 8, apply: [{ kind: 'defUp', turns: 3, power: 0.3 }], desc: 'Piccolo and Gohan form a guard: the whole party gains +30% DEF and Barrier 50 for 3 turns.', vfx: 'barrier' },
  { id: 'double_saiyan_blast', name: 'Double Saiyan Blast', members: ['vegeta', 'trunks'], kiCost: 18, hits: [1.8, 1.8], element: 'ki', target: 'enemy', unlockLevel: 10, desc: 'Vegeta and Trunks fire together: two 1.8x beams that pierce 30% DEF.', vfx: 'beam-purple' },
  { id: 'rival_assault', name: 'Rival Assault', members: ['goku', 'vegeta'], kiCost: 20, hits: [1.4, 1.4, 1.4, 1.4], element: 'phys', target: 'enemy', unlockLevel: 12, desc: 'Rivals trading blows: four 1.4x hits on one enemy.', vfx: 'impact-big' },
  { id: 'solar_cage', name: 'Solar Cage', members: ['krillin', 'tien'], kiCost: 10, hits: [], element: 'ki', target: 'allEnemies', unlockLevel: 6, apply: [{ kind: 'blind', turns: 3, power: 0.5 }, { kind: 'stun', chance: 0.6, turns: 1 }], desc: 'Dual Solar Flares: blind all enemies 3 turns and 60% to stun each.', vfx: 'flare' },
  { id: 'suppression', name: 'Suppression', members: ['piccolo', 'tien'], kiCost: 14, hits: [0.8], element: 'ki', target: 'allEnemies', unlockLevel: 9, apply: [{ kind: 'seal', turns: 2 }, { kind: 'spdDown', turns: 2, power: 0.25 }], desc: 'Seal all enemies for 2 turns, slow them 25% and deal 0.8x.', vfx: 'charge' },
  { id: 'cover_strike', name: 'Cover Strike', members: ['gohan', 'krillin'], kiCost: 10, hits: [1.3, 1.3], element: 'phys', target: 'enemy', unlockLevel: 6, apply: [{ kind: 'marked', turns: 3, power: 0.3 }], desc: 'Krillin feints, Gohan follows: two 1.3x hits and the enemy is marked (+30%).', vfx: 'impact-hit' },
];
