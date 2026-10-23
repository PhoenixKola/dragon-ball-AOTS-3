import { HEROES, baseStats, LEVEL_CAP, xpForLevel } from '../data/heroes';
import { computeHeroStats, TP_STEP as _TP } from '../engine/combat/fighters';
import { BEATS } from '../data/story';
import type { Difficulty, FormId, HeroId } from '../types';
import { HERO_IDS } from '../types';

export interface HeroState {
  level: number;
  xp: number;
  hp: number;
  ki: number;
  rage: number;
  loadout: string[];
  accessories: string[];
  tp: number;
  trained: { hp: number; ki: number; atk: number; def: number; spd: number };
}

export interface QuestState {
  state: 'active' | 'done' | 'missed';
  progress: Record<string, number>;
}

export interface GameStats {
  playMs: number;
  battlesWon: number;
  battlesLost: number;
  randomBattles: number;
  turns: number;
  perfectGuards: number;
  goodGuards: number;
  rageArts: number;
  stepsTaken: number;
  itemsUsed: number;
}

export interface GameState {
  version: number;
  product: 'AOTS3-Cell-Saga';
  mapId: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  /** index into BEATS of the next beat to complete (BEATS.length once the story is finished) */
  beat: number;
  completed: string[];
  flags: Record<string, true>;
  joined: HeroId[];
  away: HeroId[];
  party: HeroId[];
  roster: Record<HeroId, HeroState>;
  inventory: Record<string, number>;
  zeni: number;
  quests: Record<string, QuestState>;
  opened: string[];
  seen: string[];
  difficulty: Difficulty;
  stats: GameStats;
  postgame: { records: Record<string, { best: number; clears: number }>; };
  seedCounter: number;
  savedAt: number;
}

export const STATE_VERSION = 1;
export const PRODUCT = 'AOTS3-Cell-Saga' as const;
export const MAX_PARTY = 3;
export const TP_STEP = _TP;
export const TP_CAP_PER_STAT = 12;

const START_LEVELS: Record<HeroId, number> = { goku: 10, gohan: 8, vegeta: 11, piccolo: 9, trunks: 10, krillin: 7, tien: 7 };

export function maxStats(state: GameState, hero: HeroId) {
  const r = state.roster[hero];
  const d = computeHeroStats(hero, r.level, hero === 'piccolo' && !!state.flags.piccolo_kami_merged, r.accessories, r.trained);
  return { hp: d.hp, ki: d.ki };
}

export function newHeroState(hero: HeroId, level = START_LEVELS[hero]): HeroState {
  const b = baseStats(hero, level);
  return {
    level, xp: 0, hp: b.hp, ki: b.ki, rage: 0,
    loadout: [...HEROES[hero].defaultLoadout], accessories: [], tp: 0,
    trained: { hp: 0, ki: 0, atk: 0, def: 0, spd: 0 },
  };
}

export function newGameState(difficulty: Difficulty = 'normal'): GameState {
  const roster = {} as Record<HeroId, HeroState>;
  for (const h of HERO_IDS) roster[h] = newHeroState(h);
  return {
    version: STATE_VERSION,
    product: PRODUCT,
    mapId: 'landing_future',
    x: 5 * 32 + 16,
    y: 21 * 32 + 16,
    facing: 'right',
    beat: 0,
    completed: [],
    flags: {},
    joined: ['trunks'],
    away: [],
    party: ['trunks'],
    roster,
    inventory: { senzu_small: 3, ki_capsule: 2, antidote: 1 },
    zeni: 300,
    quests: {},
    opened: [],
    seen: [],
    difficulty,
    stats: { playMs: 0, battlesWon: 0, battlesLost: 0, randomBattles: 0, turns: 0, perfectGuards: 0, goodGuards: 0, rageArts: 0, stepsTaken: 0, itemsUsed: 0 },
    postgame: { records: {} },
    seedCounter: 1,
    savedAt: 0,
  };
}

export const hasFlag = (s: GameState, f: string) => !!s.flags[f];
export const currentBeat = (s: GameState) => BEATS[s.beat] ?? null;
export const storyComplete = (s: GameState) => s.beat >= BEATS.length;
export const chapterOf = (s: GameState) => (BEATS[s.beat]?.chapter ?? 8);

/** Heroes that can be fielded right now (story-aware). */
export function availableHeroes(s: GameState): HeroId[] {
  return HERO_IDS.filter((h) => s.joined.includes(h) && !s.away.includes(h));
}

export function validateParty(s: GameState): void {
  const avail = availableHeroes(s);
  s.party = s.party.filter((h, i) => avail.includes(h) && s.party.indexOf(h) === i).slice(0, MAX_PARTY);
  if (s.party.length === 0 && avail.length) s.party = [avail[0]];
}

export function formsUnlocked(s: GameState, hero: HeroId): FormId[] {
  const out: FormId[] = ['base'];
  const map: Record<HeroId, [FormId, string][]> = {
    goku: [['ssj', 'goku_ssj_unlocked']],
    gohan: [['ssj', 'gohan_ssj_unlocked'], ['ssj2', 'gohan_ssj2_unlocked']],
    vegeta: [['ssj', 'vegeta_ssj_unlocked'], ['ascended', 'vegeta_ascended_unlocked']],
    piccolo: [], trunks: [['ssj', 'trunks_ssj_unlocked'], ['ultra', 'trunks_ultra_unlocked']], krillin: [], tien: [],
  };
  for (const [f, flag] of map[hero]) {
    if (!s.flags[flag]) continue;
    if (f === 'ssj2' && !s.flags.android16_destroyed) continue;
    out.push(f);
  }
  return out;
}

export function xpNeeded(level: number): number {
  return level >= LEVEL_CAP ? Infinity : xpForLevel(level);
}
