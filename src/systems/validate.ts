import { QUEST_BY_ID } from '../data/quests';
import { xpForLevel, LEVEL_CAP } from '../data/heroes';
import { ITEMS } from '../data/items';
import { ALL_SIDE, SIM_STAGES } from '../data/sidefights';
import { SKILLS } from '../data/skills';
import { STAGES } from '../data/stages';
import { BEATS } from '../data/story';
import { MAPS } from '../data/maps';
import { HERO_IDS, type Difficulty, type HeroId } from '../types';
import type { Step } from '../types/script';
import type { GameState, HeroState } from './gameState';
import { MAX_PARTY, PRODUCT, STATE_VERSION, TP_CAP_PER_STAT, maxStats } from './gameState';
import { isWalkablePx } from '../engine/world/collision';

/* ---------------------------------------------------------------- flag registry (scanned from content) */
function scanSteps(steps: Step[], out: Set<string>) {
  for (const st of steps) {
    if (st.t === 'set' || st.t === 'clear') out.add(st.flag);
    if (st.t === 'if') {
      scanSteps(st.then, out);
      scanSteps(st.else ?? [], out);
    }
    if (st.t === 'ask') for (const c of st.choices) scanSteps(c.steps, out);
    if (st.t === 'once') scanSteps(st.steps, out);
  }
}

export interface FlagInfo {
  known: Set<string>;
  /** flag -> the single beat that sets it (flags set only by one beat) */
  beatSource: Record<string, string>;
}

let flagCache: FlagInfo | null = null;
export function flagInfo(): FlagInfo {
  if (flagCache) return flagCache;
  const known = new Set<string>();
  const beatSource: Record<string, string> = {};
  const world = new Set<string>();
  for (const m of Object.values(MAPS)) {
    for (const e of m.entities) {
      const sc = (e as { script?: Step[] }).script;
      if (sc) scanSteps(sc, world);
    }
  }
  const perBeat: Record<string, Set<string>> = {};
  for (const b of BEATS) {
    const f = new Set<string>();
    scanSteps(b.pre, f);
    scanSteps(b.post, f);
    const st = STAGES.find((x) => x.id === b.id);
    if (st) st.flags.forEach((x) => f.add(x));
    perBeat[b.id] = f;
  }
  for (const s of Object.values(ALL_SIDE)) s.flags.forEach((x) => known.add(x));
  for (const f of world) known.add(f);
  for (const [bid, set] of Object.entries(perBeat)) {
    for (const f of set) {
      known.add(f);
      const dup = Object.entries(perBeat).some(([o, os]) => o !== bid && os.has(f)) || world.has(f);
      if (!dup) beatSource[f] = bid;
      else if (!world.has(f)) {
        // set by several beats: gate on the earliest one
        const first = BEATS.find((b) => perBeat[b.id].has(f))!.id;
        beatSource[f] = first;
      }
    }
  }
  flagCache = { known, beatSource };
  return flagCache;
}

export class SaveError extends Error {}
const fail = (m: string): never => {
  throw new SaveError(m);
};

const isInt = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;
const isNum = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
const ID_RE = /^[A-Za-z0-9_:.-]{1,80}$/;
const FLAG_RE = /^[a-z0-9_]{1,64}$/;

const START_LEVEL: Record<HeroId, number> = { goku: 10, gohan: 8, vegeta: 11, piccolo: 9, trunks: 10, krillin: 7, tien: 7 };

function isPlain(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null && !Array.isArray(o);
}

/** Build a brand-new, trusted GameState from untrusted JSON. Whitelist copy only; throws SaveError on any impossible state. */
export function validateState(raw: unknown): GameState {
  if (!isPlain(raw)) fail('Save is not an object');
  const r = raw as Record<string, unknown>;
  if (r.product !== PRODUCT) fail('Wrong product');
  if (r.version !== STATE_VERSION) fail('Unsupported save version');
  const info = flagInfo();

  // story
  if (!isInt(r.beat, 0, BEATS.length)) fail('Invalid story position');
  const beat = r.beat as number;
  if (!Array.isArray(r.completed) || r.completed.length !== beat) fail('Completed list does not match story position');
  const completed = (r.completed as unknown[]).map((id, i) => (id === BEATS[i].id ? (id as string) : fail('Completed list out of order')));
  if (!isPlain(r.flags)) fail('Invalid flags');
  const flags: Record<string, true> = {};
  for (const [k, v] of Object.entries(r.flags as Record<string, unknown>)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype' || !FLAG_RE.test(k)) fail(`Bad flag key ${k}`);
    if (v !== true) fail(`Bad flag value ${k}`);
    if (!info.known.has(k)) fail(`Unknown flag ${k}`);
    const src = info.beatSource[k];
    if (src && !completed.includes(src)) fail(`Flag ${k} set before its story event`);
    flags[k] = true;
  }
  if (flags.gohan_ssj2_unlocked && !flags.android16_destroyed) fail('Illegal Super Saiyan 2 unlock');
  if (flags.gohan_ssj2_unlocked && !completed.includes('G03')) fail('Illegal Super Saiyan 2 unlock');
  if (flags.credits_seen && !completed.includes('G07')) fail('Credits before the final battle');
  if (flags.piccolo_kami_merged && !completed.includes('E_KAMI')) fail('Kami merge before its event');

  // heroes
  const joined = heroList(r.joined, 'joined');
  const away = heroList(r.away, 'away');
  const party = heroList(r.party, 'party');
  if (party.length < 1 || party.length > MAX_PARTY) fail('Invalid party size');
  if (away.some((h) => !joined.includes(h))) fail('Away hero never joined');
  if (party.some((h) => !joined.includes(h) || away.includes(h))) fail('Party contains an unavailable hero');
  if (!isPlain(r.roster)) fail('Invalid roster');
  const rosterRaw = r.roster as Record<string, unknown>;
  for (const k of Object.keys(rosterRaw)) if (!(HERO_IDS as readonly string[]).includes(k)) fail(`Unknown hero ${k}`);
  const roster = {} as Record<HeroId, HeroState>;
  const partial: GameState = { flags } as GameState;
  for (const h of HERO_IDS) {
    const hr = rosterRaw[h];
    if (!isPlain(hr)) fail(`Missing hero ${h}`);
    const x = hr as Record<string, unknown>;
    if (!isInt(x.level, 1, LEVEL_CAP)) fail(`Bad level for ${h}`);
    const level = x.level as number;
    if (level < START_LEVEL[h]) fail(`Level below start for ${h}`);
    if (!isInt(x.xp, 0, 10_000_000) || (level < LEVEL_CAP ? (x.xp as number) >= xpForLevel(level) : (x.xp as number) !== 0)) fail(`Bad XP for ${h}`);
    if (!isInt(x.rage, 0, 100)) fail(`Bad rage for ${h}`);
    if (!isInt(x.tp, 0, 100)) fail(`Bad TP for ${h}`);
    if (!isPlain(x.trained)) fail(`Bad training for ${h}`);
    const t = x.trained as Record<string, unknown>;
    const trained = { hp: 0, ki: 0, atk: 0, def: 0, spd: 0 };
    let spent = 0;
    for (const k of Object.keys(trained) as (keyof typeof trained)[]) {
      if (!isInt(t[k], 0, TP_CAP_PER_STAT)) fail(`Bad training stat ${k}`);
      trained[k] = t[k] as number;
      spent += trained[k];
    }
    if (spent + (x.tp as number) > level - START_LEVEL[h]) fail(`Too many training points for ${h}`);
    if (!Array.isArray(x.loadout) || x.loadout.length > 4) fail(`Bad loadout for ${h}`);
    const loadout: string[] = [];
    for (const id of x.loadout as unknown[]) {
      if (id === '') {
        loadout.push('');
        continue;
      }
      if (typeof id !== 'string') fail('Bad skill id');
      const sk = SKILLS[id as string];
      if (!sk || sk.hero !== h) fail(`Skill ${String(id)} does not belong to ${h}`);
      if (sk.requires?.storyOnly) fail('Story-only skill equipped');
      if (sk.unlock > level) fail(`Skill ${sk.id} not unlocked`);
      if (loadout.includes(sk.id)) fail('Duplicate skill in loadout');
      loadout.push(sk.id);
    }
    while (loadout.length < 4) loadout.push('');
    if (!Array.isArray(x.accessories) || x.accessories.length > 2) fail(`Bad accessories for ${h}`);
    const accessories: string[] = [];
    for (const a of x.accessories as unknown[]) {
      if (typeof a !== 'string' || ITEMS[a]?.kind !== 'accessory') fail('Bad accessory');
      if (accessories.includes(a as string)) fail('Duplicate accessory');
      accessories.push(a as string);
    }
    const hs: HeroState = { level, xp: x.xp as number, hp: 0, ki: 0, rage: x.rage as number, loadout, accessories, tp: x.tp as number, trained };
    roster[h] = hs;
    partial.roster = roster;
    partial.joined = joined;
    const m = maxStats({ ...partial, roster: { ...roster } } as GameState, h);
    if (!isNum(x.hp, 0, m.hp) || !isNum(x.ki, 0, m.ki)) fail(`HP/Ki out of range for ${h}`);
    hs.hp = Math.round(x.hp as number);
    hs.ki = Math.round(x.ki as number);
  }
  if (flags.goku_sacrifice && (!away.includes('goku') || party.includes('goku'))) fail('Goku is dead in the main story');
  if (flags.goku_sick && !flags.goku_recovered && !away.includes('goku')) fail('Goku must be away while sick');

  // inventory
  if (!isPlain(r.inventory)) fail('Invalid inventory');
  const inventory: Record<string, number> = {};
  for (const [id, n] of Object.entries(r.inventory as Record<string, unknown>)) {
    if (!ITEMS[id]) fail(`Unknown item ${id}`);
    if (!isInt(n, 1, ITEMS[id].max)) fail(`Bad count for ${id}`);
    inventory[id] = n as number;
  }
  if (!isInt(r.zeni, 0, 9_999_999)) fail('Bad Zeni');

  // quests
  if (!isPlain(r.quests)) fail('Invalid quests');
  const quests: GameState['quests'] = {};
  for (const [id, q] of Object.entries(r.quests as Record<string, unknown>)) {
    const def = QUEST_BY_ID[id];
    if (!def || !isPlain(q)) fail(`Unknown quest ${id}`);
    const qq = q as Record<string, unknown>;
    if (qq.state !== 'active' && qq.state !== 'done' && qq.state !== 'missed') fail('Bad quest state');
    if (!isPlain(qq.progress)) fail('Bad quest progress');
    const progress: Record<string, number> = {};
    for (const [k, v] of Object.entries(qq.progress as Record<string, unknown>)) {
      const o = def.objectives.find((x) => x.key === k);
      if (!o || !isInt(v, 0, o.need)) fail('Bad quest objective');
      progress[k] = v as number;
    }
    if (qq.state === 'done' && !completed.includes(def.from)) fail('Quest finished before it was available');
    quests[id] = { state: qq.state as 'active' | 'done' | 'missed', progress };
  }

  // lists
  const opened = strList(r.opened, 800);
  const seen = strList(r.seen, 400);

  // world position
  if (typeof r.mapId !== 'string' || !MAPS[r.mapId]) fail('Unknown map');
  const map = MAPS[r.mapId as string];
  if (!isNum(r.x, 0, map.width * 32) || !isNum(r.y, 0, map.height * 32)) fail('Bad position');
  if (!['up', 'down', 'left', 'right'].includes(r.facing as string)) fail('Bad facing');
  let x = r.x as number;
  let y = r.y as number;
  if (!isWalkablePx(map, x, y)) {
    x = map.spawn.x * 32 + 16;
    y = map.spawn.y * 32 + 16;
  }

  if (r.difficulty !== 'easy' && r.difficulty !== 'normal') fail('Bad difficulty');
  if (!isPlain(r.stats)) fail('Bad stats');
  const st = r.stats as Record<string, unknown>;
  const statKeys = ['playMs', 'battlesWon', 'battlesLost', 'randomBattles', 'turns', 'perfectGuards', 'goodGuards', 'rageArts', 'stepsTaken', 'itemsUsed'] as const;
  const stats = {} as GameState['stats'];
  for (const k of statKeys) {
    if (!isNum(st[k], 0, 1e12)) fail(`Bad stat ${k}`);
    stats[k] = Math.floor(st[k] as number);
  }
  const records: GameState['postgame']['records'] = {};
  if (!isPlain(r.postgame) || !isPlain((r.postgame as Record<string, unknown>).records)) fail('Bad postgame');
  for (const [id, v] of Object.entries(((r.postgame as Record<string, unknown>).records as Record<string, unknown>))) {
    if (!SIM_STAGES.some((s) => s.id === id) || !isPlain(v) || !isInt((v as Record<string, unknown>).best, 1, 9999) || !isInt((v as Record<string, unknown>).clears, 1, 1e6)) fail('Bad record');
    records[id] = { best: (v as Record<string, number>).best, clears: (v as Record<string, number>).clears };
  }
  if (Object.keys(records).length && !flags.postgame_unlocked) fail('Postgame record before postgame');
  if (!isInt(r.seedCounter, 1, 1e9)) fail('Bad seed counter');

  return {
    version: STATE_VERSION, product: PRODUCT, mapId: r.mapId as string, x, y, facing: r.facing as GameState['facing'], beat, completed, flags,
    joined, away, party, roster, inventory, zeni: r.zeni as number, quests, opened, seen, difficulty: r.difficulty as Difficulty, stats,
    postgame: { records }, seedCounter: r.seedCounter as number, savedAt: isNum(r.savedAt, 0, 1e15) ? (r.savedAt as number) : 0,
  };
}

function heroList(v: unknown, label: string): HeroId[] {
  if (!Array.isArray(v) || v.length > 7) fail(`Bad ${label} list`);
  const out: HeroId[] = [];
  for (const h of v as unknown[]) {
    if (!(HERO_IDS as readonly unknown[]).includes(h)) fail(`Unknown hero in ${label}`);
    if (out.includes(h as HeroId)) fail(`Duplicate hero in ${label}`);
    out.push(h as HeroId);
  }
  return out;
}
function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v) || v.length > max) fail('Bad list');
  const out: string[] = [];
  for (const s of v as unknown[]) {
    if (typeof s !== 'string' || !ID_RE.test(s)) fail('Bad list entry');
    if (!out.includes(s as string)) out.push(s as string);
  }
  return out;
}
