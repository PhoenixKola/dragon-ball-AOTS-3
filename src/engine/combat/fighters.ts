import { baseStats, KAMI_BONUS } from '../../data/heroes';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { GUEST_LOADOUT } from '../../data/skills';
import type { EnemyDef, FormId, Fighter, HeroId } from '../../types';

export interface HeroInit {
  id: HeroId | 'android16';
  level: number;
  hp: number;
  ki: number;
  rage: number;
  loadout: string[];
  accessories: string[];
  form?: FormId;
  kami?: boolean;
  trained?: { hp: number; ki: number; atk: number; def: number; spd: number };
}

export const TP_STEP = { hp: 14, ki: 4, atk: 2, def: 1.5, spd: 1 } as const;

export interface DerivedStats { hp: number; ki: number; atk: number; def: number; spd: number; rageMod: number; critMod: number; drainResist: number }

/** Single source of truth for a hero's battle stats (used by the state layer and the battle builder). */
export function computeHeroStats(id: HeroId, level: number, kami: boolean, accessories: string[], trained?: HeroInit['trained']): DerivedStats {
  let stats = baseStats(id, level);
  if (kami && id === 'piccolo') {
    stats = { hp: Math.round(stats.hp * KAMI_BONUS.hp), ki: Math.round(stats.ki * KAMI_BONUS.ki), atk: Math.round(stats.atk * KAMI_BONUS.atk), def: Math.round(stats.def * KAMI_BONUS.def), spd: Math.round(stats.spd * KAMI_BONUS.spd) };
  }
  if (trained) {
    stats = {
      hp: stats.hp + Math.round(trained.hp * TP_STEP.hp), ki: stats.ki + Math.round(trained.ki * TP_STEP.ki),
      atk: stats.atk + Math.round(trained.atk * TP_STEP.atk), def: stats.def + Math.round(trained.def * TP_STEP.def), spd: stats.spd + Math.round(trained.spd * TP_STEP.spd),
    };
  }
  let rageMod = 1;
  let critMod = 0;
  let drainResist = 0;
  for (const a of accessories) {
    const m = ITEMS[a]?.mods;
    if (!m) continue;
    stats.atk = Math.round(stats.atk * (1 + (m.atk ?? 0)));
    stats.def = Math.round(stats.def * (1 + (m.def ?? 0)));
    stats.spd = Math.round(stats.spd * (1 + (m.spd ?? 0)));
    stats.hp = Math.round(stats.hp * (1 + (m.hp ?? 0)));
    stats.ki = Math.round(stats.ki * (1 + (m.ki ?? 0)));
    rageMod += m.rageGain ?? 0;
    critMod += m.crit ?? 0;
    drainResist = Math.max(drainResist, m.drainResist ?? 0);
  }
  return { ...stats, rageMod, critMod, drainResist };
}

/** global enemy-HP tuning knobs */
export const BOSS_HP = 1.6;
export const MOOK_HP = 1.3;

/** An "average hero" of the given power level: reference for enemy scaling. */
export const refStats = (p: number) => ({
  hp: Math.round(120 + 25 * (p - 1)),
  atk: Math.round(13.5 + 3.4 * (p - 1)),
  def: Math.round(9 + 1.65 * (p - 1)),
  spd: Math.round(21 + 1.0 * (p - 1)),
});

export function scaleEnemy(def: EnemyDef, p: number) {
  const r = refStats(p);
  return {
    maxHp: Math.max(20, Math.round(r.hp * def.hpx * (def.boss ? BOSS_HP : MOOK_HP))),
    atk: Math.max(5, Math.round(r.atk * def.atkx)),
    def: Math.max(1, Math.round(r.def * def.defx)),
    spd: Math.max(5, Math.round(r.spd * def.spdx)),
  };
}

const GUEST_BASE = { name: 'Android 16', actor: 'android-16', hpx: 1.35, kix: 1.0, atkx: 1.05, defx: 1.1, spdx: 0.85 };

export function buildHeroFighter(init: HeroInit): Fighter {
  const isGuest = init.id === 'android16';
  let stats: DerivedStats;
  let name: string;
  let actor: string;
  if (isGuest) {
    const r = refStats(init.level);
    stats = { hp: Math.round(r.hp * GUEST_BASE.hpx), ki: 90, atk: Math.round(r.atk * GUEST_BASE.atkx), def: Math.round(r.def * GUEST_BASE.defx), spd: Math.round(r.spd * GUEST_BASE.spdx), rageMod: 1, critMod: 0, drainResist: 0 };
    name = GUEST_BASE.name;
    actor = GUEST_BASE.actor;
  } else {
    stats = computeHeroStats(init.id as HeroId, init.level, !!init.kami, init.accessories, init.trained);
    name = HERO_NAMES[init.id as HeroId];
    actor = `${init.id}-base`;
  }
  const { rageMod, critMod, drainResist } = stats;
  return {
    uid: `h:${init.id}`,
    team: 'ally',
    defId: init.id,
    name,
    actor,
    isHero: true,
    level: init.level,
    hp: Math.max(0, Math.min(stats.hp, Math.round(init.hp))),
    maxHp: stats.hp,
    ki: Math.max(0, Math.min(stats.ki, Math.round(init.ki))),
    maxKi: stats.ki,
    rage: isGuest ? 0 : Math.max(0, Math.min(100, init.rage)),
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    form: init.form ?? 'base',
    statuses: [],
    defending: false,
    sparkingTurns: 0,
    loadout: isGuest ? GUEST_LOADOUT.android16 : init.loadout,
    alive: init.hp > 0,
    guest: isGuest,
    phaseIdx: 0,
    cooldowns: {},
    used: {},
    actedThisRound: false,
    accuracyMod: 0,
    adaptCount: {},
    rageStreakDefend: 0,
    rageMod,
    critMod,
    drainResist,
    p: init.level,
  };
}

export function buildEnemyFighter(defId: string, p: number, index: number, hpFrac = 1): Fighter {
  const def = ENEMIES[defId];
  if (!def) throw new Error(`Unknown enemy ${defId}`);
  const s = scaleEnemy(def, p);
  return {
    uid: `e:${index}:${defId}`,
    team: 'enemy',
    defId,
    name: def.name,
    actor: def.actor,
    isHero: false,
    level: p,
    hp: Math.max(1, Math.round(s.maxHp * hpFrac)),
    maxHp: s.maxHp,
    ki: 999,
    maxKi: 999,
    rage: 0,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    form: 'base',
    statuses: [],
    defending: false,
    sparkingTurns: 0,
    loadout: [],
    alive: true,
    boss: !!def.boss,
    phaseIdx: 0,
    cooldowns: {},
    used: {},
    actedThisRound: false,
    accuracyMod: 0,
    adaptCount: {},
    rageStreakDefend: 0,
    rageMod: 1,
    critMod: 0,
    drainResist: 0,
    p,
  };
}

export const HERO_NAMES: Record<HeroId, string> = {
  goku: 'Goku', gohan: 'Gohan', vegeta: 'Vegeta', piccolo: 'Piccolo', trunks: 'Trunks', krillin: 'Krillin', tien: 'Tien',
};
