import { ENEMIES } from '../data/enemies';
import { HEROES, LEVEL_CAP, xpForLevel } from '../data/heroes';
import { ITEMS, SHOPS } from '../data/items';
import { SKILLS, skillsOf } from '../data/skills';
import { STAGES } from '../data/stages';
import { BEATS } from '../data/story';
import type { Battle, BattleSetup } from '../engine/combat/engine';
import type { HeroInit } from '../engine/combat/fighters';
import { Rng } from '../engine/combat/rng';
import type { HeroId, StageDef } from '../types';
import { HERO_IDS } from '../types';
import type { GameState } from './gameState';
import { MAX_PARTY, TP_CAP_PER_STAT, availableHeroes, maxStats, validateParty } from './gameState';

/* ------------------------------------------------------------------ inventory */
export function addItem(s: GameState, id: string, n = 1): number {
  const it = ITEMS[id];
  if (!it || n <= 0) return 0;
  const have = s.inventory[id] ?? 0;
  const add = Math.max(0, Math.min(n, it.max - have));
  if (add > 0) s.inventory[id] = have + add;
  return add;
}
export function removeItem(s: GameState, id: string, n = 1): boolean {
  if ((s.inventory[id] ?? 0) < n) return false;
  s.inventory[id] -= n;
  if (s.inventory[id] <= 0) delete s.inventory[id];
  return true;
}
export const itemCount = (s: GameState, id: string) => s.inventory[id] ?? 0;

/* ------------------------------------------------------------------ shops */
export function shopStock(s: GameState, shopId: string): string[] {
  const sh = SHOPS[shopId];
  if (!sh) return [];
  const ch = BEATS[s.beat]?.chapter ?? 8;
  if (ch < sh.minChapter) return [];
  return sh.stock;
}
export function buyItem(s: GameState, shopId: string, itemId: string, qty: number): { ok: boolean; reason?: string } {
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { ok: false, reason: 'Invalid quantity' };
  if (!shopStock(s, shopId).includes(itemId)) return { ok: false, reason: 'Not for sale' };
  const it = ITEMS[itemId];
  const total = it.price * qty;
  if (s.zeni < total) return { ok: false, reason: 'Not enough Zeni' };
  const have = s.inventory[itemId] ?? 0;
  if (have + qty > it.max) return { ok: false, reason: `You can carry at most ${it.max}` };
  s.zeni -= total;
  s.inventory[itemId] = have + qty;
  return { ok: true };
}
export function sellItem(s: GameState, itemId: string, qty: number): { ok: boolean; reason?: string } {
  const it = ITEMS[itemId];
  if (!it || it.kind === 'key') return { ok: false, reason: 'Cannot be sold' };
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: 'Invalid quantity' };
  if ((s.inventory[itemId] ?? 0) < qty) return { ok: false, reason: 'Not enough' };
  s.inventory[itemId] -= qty;
  if (s.inventory[itemId] <= 0) delete s.inventory[itemId];
  s.zeni += it.sell * qty;
  return { ok: true };
}

/* ------------------------------------------------------------------ healing / items in the field */
export function healHero(s: GameState, h: HeroId, full = true) {
  const m = maxStats(s, h);
  const r = s.roster[h];
  if (full) {
    r.hp = m.hp;
    r.ki = m.ki;
  }
}
export function restParty(s: GameState) {
  for (const h of HERO_IDS) healHero(s, h);
}
export function clampHero(s: GameState, h: HeroId) {
  const m = maxStats(s, h);
  const r = s.roster[h];
  r.hp = Math.max(0, Math.min(m.hp, Math.round(r.hp)));
  r.ki = Math.max(0, Math.min(m.ki, Math.round(r.ki)));
}
export function useFieldItem(s: GameState, itemId: string, h: HeroId): { ok: boolean; reason?: string } {
  const it = ITEMS[itemId];
  if (!it || !it.field) return { ok: false, reason: 'Cannot be used here' };
  if ((s.inventory[itemId] ?? 0) < 1) return { ok: false, reason: 'None left' };
  const r = s.roster[h];
  if (!r || !s.joined.includes(h)) return { ok: false, reason: 'Not a party member' };
  const m = maxStats(s, h);
  if (it.revivePct) {
    if (r.hp > 0) return { ok: false, reason: 'Only for fallen fighters' };
    r.hp = Math.max(1, Math.round(m.hp * it.revivePct));
  } else {
    if (r.hp <= 0) return { ok: false, reason: 'Fighter is down' };
    const wantsHp = !!(it.healPct || it.heal);
    const wantsKi = !!(it.ki || it.kiPct);
    const useful = (wantsHp && r.hp < m.hp) || (wantsKi && r.ki < m.ki);
    if (!useful) return { ok: false, reason: 'No effect' };
    if (wantsHp) r.hp = Math.min(m.hp, r.hp + Math.round(m.hp * (it.healPct ?? 0)) + (it.heal ?? 0));
    if (wantsKi) r.ki = Math.min(m.ki, r.ki + (it.ki ?? 0) + Math.round(m.ki * (it.kiPct ?? 0)));
  }
  s.inventory[itemId] -= 1;
  if (s.inventory[itemId] <= 0) delete s.inventory[itemId];
  s.stats.itemsUsed++;
  return { ok: true };
}

/* ------------------------------------------------------------------ XP and levels */
export interface LevelUp {
  hero: HeroId;
  from: number;
  to: number;
  newSkills: string[];
}
export function learnedSkillIds(s: GameState, h: HeroId): string[] {
  const lv = s.roster[h].level;
  return skillsOf(h).filter((k) => !k.requires?.storyOnly && k.unlock <= lv).map((k) => k.id);
}
export function grantXp(s: GameState, h: HeroId, amount: number): LevelUp | null {
  const r = s.roster[h];
  if (!r || amount <= 0 || r.level >= LEVEL_CAP) return null;
  const from = r.level;
  r.xp += Math.round(amount);
  while (r.level < LEVEL_CAP && r.xp >= xpForLevel(r.level)) {
    r.xp -= xpForLevel(r.level);
    r.level++;
    r.tp += 1;
  }
  if (r.level >= LEVEL_CAP) r.xp = 0;
  if (r.level === from) return null;
  const before = new Set(skillsOf(h).filter((k) => !k.requires?.storyOnly && k.unlock <= from).map((k) => k.id));
  const newSkills = skillsOf(h).filter((k) => !k.requires?.storyOnly && k.unlock <= r.level && !before.has(k.id)).map((k) => k.id);
  // new techniques only fill EMPTY slots; a full custom loadout is never silently rewritten
  for (const id of newSkills) {
    const i = r.loadout.indexOf('');
    if (i >= 0 && r.loadout.length <= 4) r.loadout[i] = id;
  }
  return { hero: h, from, to: r.level, newSkills };
}

/* ------------------------------------------------------------------ loadouts / equipment / training */
export function setLoadout(s: GameState, h: HeroId, slot: number, skillId: string | null): { ok: boolean; reason?: string } {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) return { ok: false, reason: 'Invalid slot' };
  const r = s.roster[h];
  if (!r) return { ok: false, reason: 'Unknown hero' };
  if (skillId === null || skillId === '') {
    r.loadout[slot] = '';
    return { ok: true };
  }
  const sk = SKILLS[skillId];
  if (!sk || sk.hero !== h) return { ok: false, reason: 'Not this fighter\'s technique' };
  if (sk.requires?.storyOnly) return { ok: false, reason: 'Reserved for a story battle' };
  if (sk.unlock > r.level) return { ok: false, reason: `Unlocks at level ${sk.unlock}` };
  const existing = r.loadout.indexOf(skillId);
  if (existing >= 0 && existing !== slot) {
    // swap if the displaced slot is being replaced
    r.loadout[existing] = r.loadout[slot] ?? '';
  }
  r.loadout[slot] = skillId;
  while (r.loadout.length < 4) r.loadout.push('');
  return { ok: true };
}

export function equipAccessory(s: GameState, h: HeroId, slot: number, itemId: string | null): { ok: boolean; reason?: string } {
  if (slot !== 0 && slot !== 1) return { ok: false, reason: 'Invalid slot' };
  const r = s.roster[h];
  if (!r) return { ok: false, reason: 'Unknown hero' };
  const old = r.accessories[slot];
  if (itemId === null || itemId === '') {
    if (old) {
      addItem(s, old, 1);
      r.accessories[slot] = '';
    }
    r.accessories = r.accessories.filter((x) => x);
    clampHero(s, h);
    return { ok: true };
  }
  const it = ITEMS[itemId];
  if (!it || it.kind !== 'accessory') return { ok: false, reason: 'Not equippable' };
  if (r.accessories.includes(itemId)) return { ok: false, reason: 'Already equipped' };
  if ((s.inventory[itemId] ?? 0) < 1) return { ok: false, reason: 'None in stock' };
  removeItem(s, itemId, 1);
  if (old) addItem(s, old, 1);
  r.accessories[slot] = itemId;
  r.accessories = r.accessories.filter((x) => x);
  clampHero(s, h);
  return { ok: true };
}

export const TRAIN_STATS = ['hp', 'ki', 'atk', 'def', 'spd'] as const;
export type TrainStat = (typeof TRAIN_STATS)[number];
export function trainStat(s: GameState, h: HeroId, stat: TrainStat): { ok: boolean; reason?: string } {
  const r = s.roster[h];
  if (!r) return { ok: false, reason: 'Unknown hero' };
  if (!TRAIN_STATS.includes(stat)) return { ok: false, reason: 'Unknown stat' };
  if (r.tp < 1) return { ok: false, reason: 'No Training Points' };
  if (r.trained[stat] >= TP_CAP_PER_STAT) return { ok: false, reason: 'Stat is at its training cap' };
  r.tp--;
  r.trained[stat]++;
  return { ok: true };
}
export function refundTraining(s: GameState, h: HeroId): number {
  const r = s.roster[h];
  let n = 0;
  for (const k of TRAIN_STATS) {
    n += r.trained[k];
    r.trained[k] = 0;
  }
  r.tp += n;
  clampHero(s, h);
  return n;
}

/* ------------------------------------------------------------------ party */
export function joinHero(s: GameState, h: HeroId) {
  if (!s.joined.includes(h)) s.joined.push(h);
  s.away = s.away.filter((x) => x !== h);
  if (s.party.length < MAX_PARTY && !s.party.includes(h)) s.party.push(h);
}
export function leaveHero(s: GameState, h: HeroId) {
  if (!s.away.includes(h)) s.away.push(h);
  s.party = s.party.filter((x) => x !== h);
  validateParty(s);
}
export function setParty(s: GameState, heroes: HeroId[]): { ok: boolean; reason?: string } {
  const avail = availableHeroes(s);
  if (heroes.length < 1 || heroes.length > MAX_PARTY) return { ok: false, reason: 'A party has 1 to 3 fighters' };
  if (new Set(heroes).size !== heroes.length) return { ok: false, reason: 'Duplicate fighter' };
  if (heroes.some((h) => !avail.includes(h))) return { ok: false, reason: 'A chosen fighter is unavailable' };
  s.party = [...heroes];
  return { ok: true };
}

/* ------------------------------------------------------------------ battles */
export const FLAGS_OF = (s: GameState): Record<string, boolean> => ({ ...s.flags, ...(s.flags.warning_delivered ? { goku_ssj_unlocked: true } : {}) });

export function nextStagePower(s: GameState): number {
  const b = BEATS.slice(s.beat).find((x) => x.kind === 'battle');
  const st = b ? STAGES.find((x) => x.id === b.id) : undefined;
  return st?.p ?? 24;
}

export function fighterTeam(s: GameState, stage: StageDef): (HeroId | 'android16')[] {
  if (stage.team.length) return stage.team;
  const avail = availableHeroes(s);
  const party = s.party.filter((h) => avail.includes(h));
  return party.length ? party : avail.slice(0, 1);
}

export function makeBattleSetup(s: GameState, stage: StageDef, opts: { enemyIds?: string[]; p?: number; random?: boolean; mercy?: number; sim?: boolean } = {}): BattleSetup {
  const team = opts.sim ? (stage.team.length ? stage.team : (['gohan', 'vegeta', 'trunks'] as HeroId[])) : fighterTeam(s, stage);
  const mercy = opts.mercy ?? 0;
  const heroes: HeroInit[] = team.map((id) => {
    if (id === 'android16') return { id, level: stage.p, hp: 99999, ki: 999, rage: 0, loadout: [], accessories: [] };
    const r = s.roster[id];
    const m = maxStats(s, id);
    let hp = Math.min(r.hp, m.hp);
    let ki = Math.min(r.ki, m.ki);
    if (mercy > 0) {
      hp = hp <= 0 ? Math.round(m.hp * 0.3) : Math.max(hp, Math.round(m.hp * mercy));
      ki = Math.max(ki, Math.round(m.ki * mercy));
    }
    return {
      id, level: r.level, hp, ki, rage: 0, loadout: r.loadout.filter((x) => x), accessories: r.accessories.filter((x) => x),
      kami: id === 'piccolo' && !!s.flags.piccolo_kami_merged, trained: r.trained,
    };
  });
  const seed = (Math.imul(s.seedCounter, 2654435761) ^ hashStr(stage.id)) >>> 0;
  const setup: BattleSetup = {
    stage, seed, difficulty: s.difficulty, heroes, enemyIds: opts.enemyIds, p: opts.p, flags: FLAGS_OF(s), inventory: { ...s.inventory }, random: opts.random,
  };
  return setup;
}

export function hashStr(t: string): number {
  let n = 2166136261;
  for (let i = 0; i < t.length; i++) n = Math.imul(n ^ t.charCodeAt(i), 16777619);
  return n >>> 0;
}

export function randomStage(map: string, enemyIds: string[], p: number): StageDef {
  return {
    id: `RND_${map}`, chapter: 0, name: 'Ambush', map, mode: 'win', enemies: enemyIds, team: [], p, xp: 0, zeni: 0, canFlee: true, backdrop: map, music: 'battle', flags: [], result: {}, hint: 'Defeat the enemies — or flee.',
  };
}

export interface RewardSummary {
  outcome: 'victory' | 'defeat' | 'fled';
  xp: Record<string, number>;
  levelUps: LevelUp[];
  zeni: number;
  items: { id: string; n: number }[];
  flags: string[];
  note: string;
}

const RECOVER = 0.3;
/** global story-XP tuning knob */
export const XP_SCALE = 1.4;

/** Commit a finished battle to the save state. Defeat never mutates anything but the loss counter. */
export function applyBattleResult(s: GameState, stage: StageDef, battle: Battle, kind: 'story' | 'side' | 'random' | 'sim'): RewardSummary {
  const out: RewardSummary = { outcome: battle.outcome?.outcome ?? 'defeat', xp: {}, levelUps: [], zeni: 0, items: [], flags: [], note: battle.outcome?.reason ?? '' };
  s.stats.turns += battle.stats.turns;
  s.stats.perfectGuards += battle.stats.guardsPerfect;
  s.stats.goodGuards += battle.stats.guardsGood;
  s.stats.rageArts += battle.stats.rageArts;
  s.seedCounter++;
  if (out.outcome === 'defeat') {
    s.stats.battlesLost++;
    return out;
  }
  // inventory spent in battle is committed on victory or a successful flee
  s.inventory = { ...battle.inventory };
  for (const k of Object.keys(s.inventory)) if (s.inventory[k] <= 0) delete s.inventory[k];
  s.stats.itemsUsed += battle.stats.itemsUsed;
  // hero hp/ki carry over, with a 30% recovery of the missing amount; KO'd heroes get back up at 25%
  const participants: HeroId[] = [];
  for (const f of battle.heroes()) {
    if (f.guest) continue;
    const h = f.defId as HeroId;
    participants.push(h);
    const r = s.roster[h];
    const m = maxStats(s, h);
    let hp = f.alive ? f.hp : Math.round(m.hp * 0.25);
    let ki = f.ki;
    hp += Math.round((m.hp - hp) * RECOVER);
    ki += Math.round((m.ki - ki) * RECOVER);
    r.hp = Math.min(m.hp, hp);
    r.ki = Math.min(m.ki, ki);
    r.rage = 0;
  }
  if (out.outcome === 'fled') return out;
  s.stats.battlesWon++;
  if (kind === 'random') s.stats.randomBattles++;
  const diffMult = s.difficulty === 'easy' ? 1.25 : 1;
  let xp = 0;
  let zeni = 0;
  const rng = new Rng(hashStr(stage.id) ^ s.seedCounter);
  const firstClear = kind === 'story' || !s.opened.includes(`side:${stage.id}`);
  if (kind === 'random') {
    for (const id of battle.defeatedIds) {
      xp += Math.round(14 + 4.5 * battle.stage.p);
      zeni += Math.round(10 + 2 * battle.stage.p);
      for (const d of ENEMIES[id]?.drops ?? []) if (rng.next() < d.chance) out.items.push({ id: d.item, n: 1 });
    }
  } else if (firstClear) {
    xp = stage.xp;
    if (!stage.noRewards) {
      zeni = stage.zeni;
      for (const id of battle.defeatedIds) for (const d of ENEMIES[id]?.drops ?? []) if (rng.next() < d.chance) out.items.push({ id: d.item, n: 1 });
    }
    if (kind === 'side' || kind === 'sim') s.opened.push(`side:${stage.id}`);
  }
  xp = Math.round(xp * diffMult * (kind === 'random' ? 1 : XP_SCALE));
  const others = kind === 'sim' ? [] : s.joined.filter((h) => !participants.includes(h));
  for (const h of participants) {
    out.xp[h] = xp;
    const lu = grantXp(s, h, xp);
    if (lu) out.levelUps.push(lu);
  }
  for (const h of others) {
    const share = Math.round(xp * 0.7);
    out.xp[h] = share;
    const lu = grantXp(s, h, share);
    if (lu) out.levelUps.push(lu);
  }
  s.zeni = Math.min(9999999, s.zeni + zeni);
  out.zeni = zeni;
  for (const it of out.items) addItem(s, it.id, it.n);
  if (kind === 'story' || kind === 'side') {
    for (const f of stage.flags) {
      s.flags[f] = true;
      out.flags.push(f);
    }
  }
  if (kind === 'sim') {
    const rec = s.postgame.records[stage.id] ?? { best: 9999, clears: 0 };
    rec.best = Math.min(rec.best, battle.roundsCompleted || battle.round);
    rec.clears++;
    s.postgame.records[stage.id] = rec;
  }
  return out;
}

export function allHeroIds(): readonly HeroId[] {
  return HERO_IDS;
}
export { HEROES };
