import { COMBOS } from '../../data/items';
import { RAGE_ARTS, getSkill } from '../../data/skills';
import type { BattleAction, Fighter, HeroId } from '../../types';
import type { Battle } from './engine';
import { hasStatus } from './formulas';

/**
 * Reference player policy: reads the same information a player sees (HP, Ki, Rage, statuses, telegraphs) and acts only through
 * Battle.submit(). Used by the headless simulation and by the real-browser E2E bot.
 */
export function bestTarget(b: Battle, f: Fighter, ki: boolean): Fighter {
  const foes = b.opponents(f);
  const wantPhys = (e: Fighter) => hasStatus(e, 'absorbing') && ki;
  const ok = foes.filter((e) => !wantPhys(e));
  const pool = ok.length ? ok : foes;
  const exposed = pool.find((e) => e.statuses.some((s) => s.kind === 'exposed'));
  if (exposed) return exposed;
  const nonShield = pool.filter((e) => !hasStatus(e, 'shielded'));
  const pick = nonShield.length ? nonShield : pool;
  // finish the weakest; prefer drain sources
  const drone = pick.find((e) => e.defId === 'drain-drone' || e.defId === 'gero-scout');
  if (drone) return drone;
  return pick.reduce((x, y) => (x.hp <= y.hp ? x : y));
}

export function chooseAction(b: Battle, f: Fighter): BattleAction {
  const allies = b.heroes();
  const foes = b.opponents(f);
  const hasItem = (id: string) => (b.inventory[id] ?? 0) > 0;
  // rescue
  const weak = allies.filter((a) => a.alive && a.hp / a.maxHp < 0.34).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
  const down = allies.find((a) => !a.alive);
  if (down && hasItem('revive_seed') && b.checkAction({ kind: 'item', itemId: 'revive_seed', targetUid: down.uid }).ok) return { kind: 'item', itemId: 'revive_seed', targetUid: down.uid };
  // heal-capable skills first
  for (const id of f.loadout) {
    const sk = getSkill(id);
    if (!sk || (sk.kind !== 'heal' && sk.kind !== 'support')) continue;
    if (!b.skillStatus(f, sk).ok) continue;
    if (sk.kind === 'heal' && sk.target === 'self' && f.hp / f.maxHp < 0.5) return { kind: 'skill', skillId: id };
    if (sk.id === 'krillin_10' && (down || weak)) return { kind: 'skill', skillId: id, targetUid: (down ?? weak)!.uid };
    if (sk.id === 'piccolo_8' && b.round <= 2 && !hasStatus(f, 'barrier')) return { kind: 'skill', skillId: id };
  }
  if (weak) {
    for (const item of ['senzu_small', 'supply_pack', 'senzu_large']) if (hasItem(item) && b.checkAction({ kind: 'item', itemId: item, targetUid: weak.uid }).ok) return { kind: 'item', itemId: item, targetUid: weak.uid };
    if (weak === f && f.hp / f.maxHp < 0.2) return { kind: 'defend' };
  }
  if (f.ki < f.maxKi * 0.12) {
    for (const item of ['ki_capsule', 'ki_capsule_large']) if (hasItem(item) && b.checkAction({ kind: 'item', itemId: item, targetUid: f.uid }).ok) return { kind: 'item', itemId: item, targetUid: f.uid };
  }
  // finisher
  if (b.checkAction({ kind: 'finisher' }).ok) return { kind: 'finisher' };
  // forms
  if (!f.guest && f.form === 'base' && foes.some((e) => e.boss)) {
    for (const form of ['ssj2', 'ssj', 'ascended'] as const) {
      if (b.stage.forms?.[f.defId as HeroId]) break;
      if (b.checkAction({ kind: 'form', form }).ok && f.ki > f.maxKi * 0.6) return { kind: 'form', form };
    }
  }
  // sparking / rage art
  if (b.checkAction({ kind: 'rage', targetUid: foes[0]?.uid }).ok) {
    const art = RAGE_ARTS[f.defId as HeroId];
    if (art.kind === 'heal') {
      if (allies.some((a) => a.alive && a.hp / a.maxHp < 0.6)) return { kind: 'rage' };
    } else return { kind: 'rage', targetUid: bestTarget(b, f, art.element === 'ki').uid };
  }
  if (b.checkAction({ kind: 'sparking' }).ok && foes.some((e) => e.boss) && f.rage >= 60) return { kind: 'sparking' };
  // combos
  for (const c of COMBOS) {
    if (!b.comboStatus(f, c).ok) continue;
    if (c.hits.length === 0 && !(foes.length > 1 || foes.some((e) => e.boss))) continue;
    const t = bestTarget(b, f, c.element === 'ki');
    const act: BattleAction = { kind: 'combo', comboId: c.id, targetUid: t.uid };
    if (b.checkAction(act).ok) return act;
  }
  // skills: score = expected damage per hit sum
  let best: { a: BattleAction; score: number } | null = null;
  const absorbing = foes.some((e) => hasStatus(e, 'absorbing'));
  for (const id of f.loadout) {
    const sk = getSkill(id);
    if (!sk) continue;
    if (sk.kind !== 'attack' && sk.kind !== 'debuff') continue;
    if (!b.skillStatus(f, sk).ok) continue;
    if (sk.kind === 'debuff') {
      // control skills: use sparingly
      if (sk.id === 'krillin_1' || sk.id === 'goku_8' || sk.id === 'tien_3') {
        if (b.round === 1 && foes.length > 1 && f.ki > f.maxKi * 0.5) {
          const act: BattleAction = { kind: 'skill', skillId: id, targetUid: foes[0].uid };
          if (b.checkAction(act).ok) return act;
        }
      }
      continue;
    }
    const isKi = sk.element === 'ki';
    const t = bestTarget(b, f, isKi);
    if (absorbing && isKi && hasStatus(t, 'absorbing')) continue;
    const total = sk.hits.reduce((x, y) => x + y, 0) * (sk.target === 'allEnemies' ? Math.min(foes.length, 3) : 1) * (1 + (sk.pierce ?? 0) * 0.3);
    const cost = Math.max(1, sk.ki) * 0.05 + (sk.chargeTurns ? total * 0.15 : 0) + (sk.hpCost ? 0.5 : 0);
    const kiOk = f.ki - sk.ki >= f.maxKi * 0.08;
    const score = (total - cost) * (kiOk ? 1 : 0.4);
    const act: BattleAction = { kind: 'skill', skillId: id, targetUid: sk.target === 'enemy' ? t.uid : undefined };
    if (b.checkAction(act).ok && (!best || score > best.score)) best = { a: act, score };
  }
  const basic = bestTarget(b, f, false);
  if (best && best.score > 0.9) return best.a;
  if (f.ki < f.maxKi * 0.15) return { kind: 'defend' };
  return { kind: 'attack', targetUid: basic.uid };
}

