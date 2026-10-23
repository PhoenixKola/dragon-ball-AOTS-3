import type { Fighter } from '../../types';

/**
 * Rage tuning. Every number a player can read about Rage lives here so the engine, the help page and the tests agree.
 *  - dealing damage: (DEALT_BASE + DEALT_PER_MULT x hit multiplier) per landed hit, +CRIT_BONUS on a crit
 *  - taking damage:  (TAKEN_BASE + TAKEN_SCALE x share of max HP lost) per hit action, plus a clutch bonus
 *  - Active Guard:   GUARD_GOOD / GUARD_PERFECT on the guarded hit
 *  - Defend:         DEFEND_GAIN, only on the first Defend in a row (spam gives nothing)
 */
export const RAGE = {
  DEALT_BASE: 2.4,
  DEALT_PER_MULT: 2.2,
  CRIT_BONUS: 4,
  TAKEN_BASE: 5,
  TAKEN_SCALE: 22,
  CLUTCH_BELOW: 0.35,
  CLUTCH_BONUS: 3,
  GUARD_GOOD: 7,
  GUARD_PERFECT: 16,
  DEFEND_GAIN: 3,
  MINION_FACTOR: 0.55,
  NEAR_READY: 75,
  PER_ACTION_CAP: 60,
} as const;

export const RAGE_IDENTITY: Record<string, { dealt?: number; taken?: number; guard?: number; crit?: number }> = {
  goku: { dealt: 1.1 },
  gohan: { taken: 1.3 },
  krillin: { crit: 2 },
  vegeta: { dealt: 1.15 },
  piccolo: { guard: 1.3 },
  tien: { guard: 1.15 },
  trunks: { dealt: 1.05 },
};
const id = (f: Pick<Fighter, 'defId'>) => ({ dealt: 1, taken: 1, guard: 1, crit: 1, ...(RAGE_IDENTITY[f.defId] ?? {}) });

export function rageDealt(attacker: Pick<Fighter, 'defId'>, hitMult: number, crit: boolean, targetIsBoss: boolean, gainMod = 1): number {
  const i = id(attacker);
  return ((RAGE.DEALT_BASE + RAGE.DEALT_PER_MULT * hitMult) * i.dealt + (crit ? RAGE.CRIT_BONUS * i.crit : 0)) * (targetIsBoss ? 1 : RAGE.MINION_FACTOR) * gainMod;
}

export function rageTaken(target: Pick<Fighter, 'defId' | 'hp' | 'maxHp'>, dmg: number, hits: number, guard: 'perfect' | 'good' | 'none', gainMod = 1): number {
  const i = id(target);
  let r = ((RAGE.TAKEN_BASE + RAGE.TAKEN_SCALE * (dmg / target.maxHp)) / Math.max(1, hits * 0.5)) * i.taken;
  r += guard === 'perfect' ? RAGE.GUARD_PERFECT * i.guard : guard === 'good' ? RAGE.GUARD_GOOD * i.guard : 0;
  if (target.hp > 0 && target.hp / target.maxHp < RAGE.CLUTCH_BELOW) r += RAGE.CLUTCH_BONUS;
  return r * gainMod;
}
