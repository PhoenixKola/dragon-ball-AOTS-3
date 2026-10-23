import { BEATS, BEAT_INDEX, type Beat } from '../data/story';
import { ITEMS } from '../data/items';
import { ALL_SIDE } from '../data/sidefights';
import { STAGE_BY_ID } from '../data/stages';
import type { StageDef } from '../types';
import type { Step } from '../types/script';
import { evalCond } from './cond';
import type { GameState } from './gameState';
import { addItem, grantXp, joinHero, leaveHero, restParty, type RewardSummary } from './progression';
import { completeQuest, progressQuest, refreshQuests, startQuest } from './questRuntime';
import { availableHeroes } from './gameState';

/** The UI (or a headless bot) implements this; the runtime never touches Phaser/React directly. */
export interface ScriptHost {
  say(who: string, text: string, mood?: string): Promise<void>;
  card(text: string, sub?: string): Promise<void>;
  cutscene(id: string): Promise<void>;
  ask(prompt: string, choices: string[]): Promise<number>;
  warp(map: string, x: number, y: number, facing?: 'up' | 'down' | 'left' | 'right'): Promise<void>;
  music(key: string): void;
  sfx(key: string): void;
  toast(text: string): void;
  /** run a fight; resolve with the committed summary. `retry` loops are the host's business. */
  battle(stage: StageDef, kind: 'story' | 'side'): Promise<RewardSummary>;
  autosave(): void;
  hideEntity(id: string): void;
}

export async function runScript(s: GameState, steps: Step[], host: ScriptHost, depth = 0): Promise<void> {
  if (depth > 20) throw new Error('script recursion too deep');
  for (const st of steps) await runStep(s, st, host, depth);
}

async function runStep(s: GameState, st: Step, host: ScriptHost, depth: number): Promise<void> {
  switch (st.t) {
    case 'say': await host.say(st.who, st.text, st.mood); return;
    case 'card': await host.card(st.text, st.sub); return;
    case 'set': s.flags[st.flag] = true; return;
    case 'clear': delete s.flags[st.flag]; return;
    case 'give': {
      const n = addItem(s, st.item, st.n ?? 1);
      if (n > 0) {
        host.sfx('item');
        host.toast(`Obtained ${ITEMS[st.item]?.name ?? st.item}${n > 1 ? ` x${n}` : ''}`);
      }
      return;
    }
    case 'take': {
      const have = s.inventory[st.item] ?? 0;
      const n = Math.min(have, st.n ?? 1);
      if (n > 0) {
        s.inventory[st.item] -= n;
        if (s.inventory[st.item] <= 0) delete s.inventory[st.item];
      }
      return;
    }
    case 'zeni': s.zeni = Math.max(0, Math.min(9999999, s.zeni + st.n)); host.toast(`${st.n >= 0 ? '+' : ''}${st.n} Zeni`); return;
    case 'xp': {
      for (const h of st.heroes ?? availableHeroes(s)) grantXp(s, h, st.n);
      host.toast(`+${st.n} XP`);
      return;
    }
    case 'join': joinHero(s, st.hero); host.toast(`${st.hero[0].toUpperCase()}${st.hero.slice(1)} joined the party`); return;
    case 'leave': leaveHero(s, st.hero); return;
    case 'warp': await host.warp(st.map, st.x, st.y, st.facing); return;
    case 'cutscene': await host.cutscene(st.id); return;
    case 'if': await runScript(s, evalCond(s, st.cond) ? st.then : (st.else ?? []), host, depth + 1); return;
    case 'quest': {
      if (st.op === 'start') {
        if (startQuest(s, st.id)) host.toast('Quest started');
      } else if (st.op === 'progress') {
        progressQuest(s, st.id, st.key ?? '', st.n ?? 1);
      } else {
        const r = completeQuest(s, st.id);
        if (r.ok) host.toast('Quest complete!');
        else host.toast(r.reason ?? 'Cannot complete yet');
      }
      return;
    }
    case 'heal': restParty(s); host.sfx('heal'); host.toast('Party fully restored'); return;
    case 'music': host.music(st.key); return;
    case 'ask': {
      const i = await host.ask(st.prompt, st.choices.map((c) => c.label));
      const c = st.choices[i];
      if (c) await runScript(s, c.steps, host, depth + 1);
      return;
    }
    case 'once': {
      const key = `once:${st.id}`;
      if (s.opened.includes(key)) return;
      s.opened.push(key);
      await runScript(s, st.steps, host, depth + 1);
      return;
    }
    case 'battle': {
      const stage = STAGE_BY_ID[st.stage] ?? ALL_SIDE[st.stage];
      if (!stage) throw new Error(`Unknown stage ${st.stage}`);
      await host.battle(stage, STAGE_BY_ID[st.stage] ? 'story' : 'side');
      return;
    }
    case 'learn': host.toast(st.note); return;
    case 'hide': s.opened.push(`hidden:${st.entity}`); host.hideEntity(st.entity); return;
    case 'sfx': host.sfx(st.key); return;
    case 'autosave': host.autosave(); return;
  }
}

/* ------------------------------------------------------------------ beat flow */
export function beatGate(s: GameState, b: Beat): { ok: boolean; text?: string } {
  if (b.gate && !evalCond(s, b.gate)) return { ok: false, text: b.gateText ?? 'You are not ready.' };
  return { ok: true };
}

/** Atomically commit a finished mandatory beat; idempotent so reload/retry can never pay twice. */
export function completeBeat(s: GameState, id: string): boolean {
  const i = BEAT_INDEX[id];
  if (i === undefined) throw new Error(`Unknown beat ${id}`);
  if (s.completed.includes(id) || s.beat !== i) return false;
  s.completed.push(id);
  s.beat = i + 1;
  refreshQuests(s);
  return true;
}

/** Full flow for a story trigger: pre-script, battle (retried by the host on defeat), post-script, commit. */
export async function playBeat(s: GameState, beatId: string, host: ScriptHost): Promise<boolean> {
  const i = BEAT_INDEX[beatId];
  const b = BEATS[i];
  if (!b || s.beat !== i) return false;
  const gate = beatGate(s, b);
  if (!gate.ok) {
    host.toast(gate.text ?? '');
    return false;
  }
  await runScript(s, b.pre, host);
  if (b.kind === 'battle') {
    const stage = STAGE_BY_ID[b.id];
    const reward = await host.battle(stage, 'story');
    if (reward.outcome !== 'victory') return false;
  }
  // commit BEFORE the post-script so a reload during a cutscene cannot replay the fight or its rewards
  if (!completeBeat(s, beatId)) return false;
  await runScript(s, b.post, host);
  return true;
}
