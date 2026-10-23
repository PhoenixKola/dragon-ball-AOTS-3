import { BEAT_INDEX } from '../data/story';
import type { GameState } from './gameState';
import { availableHeroes } from './gameState';
import type { HeroId } from '../types';

/**
 * Tiny condition language used by map entities and story gates:
 *   flag:x  !flag:x  opened:key  beat==ID  beat>=ID  beat<ID  beat>ID  done:ID  item:id  item:id>=n  quest:id=active|done|missed|none  hero:id
 * Terms are joined with && (and) ; groups with || (or, lowest precedence).
 */
export function evalCond(state: GameState, cond: string | undefined): boolean {
  if (!cond) return true;
  return cond.split('||').some((group) => group.split('&&').every((t) => evalTerm(state, t.trim())));
}

function beatIdx(id: string): number {
  const i = BEAT_INDEX[id];
  if (i === undefined) throw new Error(`Unknown beat id in condition: ${id}`);
  return i;
}

function evalTerm(s: GameState, t: string): boolean {
  if (!t) return true;
  let neg = false;
  if (t.startsWith('!')) {
    neg = true;
    t = t.slice(1);
  }
  const r = evalPositive(s, t);
  return neg ? !r : r;
}

function evalPositive(s: GameState, t: string): boolean {
  if (t.startsWith('flag:')) return !!s.flags[t.slice(5)];
  if (t.startsWith('done:')) return s.completed.includes(t.slice(5));
  if (t.startsWith('opened:')) return s.opened.includes(t.slice(7));
  if (t.startsWith('hero:')) return availableHeroes(s).includes(t.slice(5) as HeroId);
  if (t.startsWith('item:')) {
    const m = /^item:([a-z_]+)(?:>=(\d+))?$/.exec(t);
    if (!m) throw new Error(`Bad item condition ${t}`);
    return (s.inventory[m[1]] ?? 0) >= (m[2] ? parseInt(m[2], 10) : 1);
  }
  if (t.startsWith('quest:')) {
    const m = /^quest:([a-z_]+)=(active|done|missed|none)$/.exec(t);
    if (!m) throw new Error(`Bad quest condition ${t}`);
    const q = s.quests[m[1]];
    return m[2] === 'none' ? !q : q?.state === m[2];
  }
  if (t.startsWith('beat')) {
    const m = /^beat(==|>=|<=|>|<)([A-Za-z0-9_]+)$/.exec(t);
    if (!m) throw new Error(`Bad beat condition ${t}`);
    const i = beatIdx(m[2]);
    switch (m[1]) {
      case '==': return s.beat === i;
      case '>=': return s.beat >= i;
      case '<=': return s.beat <= i;
      case '>': return s.beat > i;
      default: return s.beat < i;
    }
  }
  throw new Error(`Unknown condition term: ${t}`);
}

/** Static check used by content validation: does the string parse and reference only real ids? */
export function parseCondOrThrow(cond: string): void {
  for (const group of cond.split('||')) {
    for (const raw of group.split('&&')) {
      let t = raw.trim();
      if (t.startsWith('!')) t = t.slice(1);
      if (t.startsWith('flag:') || t.startsWith('hero:') || t.startsWith('opened:')) continue;
      if (t.startsWith('done:')) {
        beatIdx(t.slice(5));
        continue;
      }
      if (t.startsWith('item:') || t.startsWith('quest:')) {
        if (!/^(item:[a-z_]+(>=\d+)?|quest:[a-z_]+=(active|done|missed|none))$/.test(t)) throw new Error(`Bad condition ${t}`);
        continue;
      }
      const m = /^beat(==|>=|<=|>|<)([A-Za-z0-9_]+)$/.exec(t);
      if (!m) throw new Error(`Bad condition ${t}`);
      beatIdx(m[2]);
    }
  }
}
