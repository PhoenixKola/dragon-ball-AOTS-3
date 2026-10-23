import { Battle, type BattleSetup } from '../../src/engine/combat/engine';
import type { HeroInit } from '../../src/engine/combat/fighters';
import { HEROES, baseStats } from '../../src/data/heroes';
import { STAGES } from '../../src/data/stages';
import type { GuardGrade, HeroId, StageDef } from '../../src/types';

export const stageOf = (id: string): StageDef => STAGES.find((s) => s.id === id)!;

export function heroInit(id: HeroId, level = 20, o: Partial<HeroInit> = {}): HeroInit {
  const b = baseStats(id, level);
  return { id, level, hp: b.hp, ki: b.ki, rage: 0, loadout: [...HEROES[id].defaultLoadout], accessories: [], ...o };
}

export function mkStage(o: Partial<StageDef> = {}): StageDef {
  return { ...stageOf('A01'), id: 'TEST', name: 'Test', mode: 'win', enemies: ['recon-probe'], team: [], p: 20, waves: undefined, forms: undefined, protect: undefined, threshold: undefined, rounds: undefined, ...o };
}

export function mkBattle(o: { heroes?: HeroInit[]; enemies?: string[]; stage?: Partial<StageDef>; flags?: Record<string, boolean>; inventory?: Record<string, number>; seed?: number; difficulty?: 'easy' | 'normal' } = {}): Battle {
  const stage = mkStage({ enemies: o.enemies ?? ['recon-probe'], ...o.stage });
  const setup: BattleSetup = {
    stage, seed: o.seed ?? 7, difficulty: o.difficulty ?? 'normal', heroes: o.heroes ?? [heroInit('goku'), heroInit('gohan'), heroInit('vegeta')], flags: o.flags ?? {}, inventory: o.inventory ?? { senzu_small: 3, revive_seed: 1, ki_capsule: 2 },
  };
  return new Battle(setup);
}

/** run the engine until it needs a specific kind of input */
export function toInput(b: Battle, grade: GuardGrade = 'none') {
  let n = 0;
  while (!b.ended && n++ < 500) {
    if (b.phase === 'guard') b.provideGuard(grade);
    else if (b.phase === 'input') return;
  }
}

/** make `uid` the current actor by passing others' turns with Defend until it is their turn */
export function actAs(b: Battle, heroId: string, grade: GuardGrade = 'none') {
  let n = 0;
  b.drainEvents();
  while (!b.ended && n++ < 400) {
    if (b.phase === 'guard') {
      b.provideGuard(grade);
      continue;
    }
    if (b.phase !== 'input') break;
    if (b.current?.defId === heroId) return b.current;
    b.submit({ kind: 'defend' });
  }
  return b.current;
}
