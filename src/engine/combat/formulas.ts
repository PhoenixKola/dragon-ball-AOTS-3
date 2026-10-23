import { FORMS } from '../../data/heroes';
import type { Fighter, GuardGrade, StatusKind } from '../../types';

export const GUARD_MULT: Record<GuardGrade, number> = { perfect: 0.2, good: 0.55, none: 1 };
/** global tuning knob for incoming enemy damage against heroes */
export const ENEMY_DMG = 0.78;
export const EASY_ENEMY_DMG = 0.62;
export const DEFEND_MULT = 0.55;
export const CRIT_CHANCE = 0.07;
export const CRIT_MULT = 1.5;
export const BASE_ACCURACY = 0.95;
export const SPARKING_ATK = 1.25;
export const SPARKING_COST = 60;
export const RAGE_FULL = 100;
export const SPARKING_TURNS = 3;

export const hasStatus = (f: Fighter, k: StatusKind) => f.statuses.some((s) => s.kind === k);
export const getStatus = (f: Fighter, k: StatusKind) => f.statuses.find((s) => s.kind === k);
export const statusPower = (f: Fighter, k: StatusKind) => getStatus(f, k)?.power ?? 0;

export function effAtk(f: Fighter): number {
  let a = f.atk * FORMS[f.form].atk;
  if (hasStatus(f, 'atkUp')) a *= 1 + statusPower(f, 'atkUp');
  if (hasStatus(f, 'atkDown')) a *= 1 - statusPower(f, 'atkDown');
  if (hasStatus(f, 'focus')) a *= 1 + statusPower(f, 'focus');
  if (f.sparkingTurns > 0) a *= SPARKING_ATK;
  return a;
}
export function effDef(f: Fighter): number {
  let d = f.def * FORMS[f.form].def;
  if (hasStatus(f, 'defUp')) d *= 1 + statusPower(f, 'defUp');
  if (hasStatus(f, 'defDown')) d *= 1 - statusPower(f, 'defDown');
  return Math.max(0, d);
}
export function effSpd(f: Fighter): number {
  let s = f.spd * FORMS[f.form].spd;
  if (hasStatus(f, 'spdUp')) s *= 1 + statusPower(f, 'spdUp');
  if (hasStatus(f, 'spdDown')) s *= 1 - statusPower(f, 'spdDown');
  return Math.max(1, s);
}

/** Defence mitigation curve: DEF 14 -> 0.83, DEF 35 -> 0.67, DEF 60 -> 0.54. */
export function mitigation(def: number): number {
  return 1 - def / (def + 70);
}

export function kiCost(f: Fighter, base: number): number {
  return Math.max(0, Math.round(f.sparkingTurns > 0 ? base * 0.5 : base));
}

export const accuracyOf = (f: Fighter, skillAcc = 0): number => {
  if (skillAcc >= 90) return 1;
  let a = BASE_ACCURACY + FORMS[f.form].acc + f.accuracyMod + skillAcc;
  if (hasStatus(f, 'accUp')) a += statusPower(f, 'accUp');
  if (hasStatus(f, 'blind')) a -= statusPower(f, 'blind') || 0.5;
  return Math.max(0.1, Math.min(1, a));
};
